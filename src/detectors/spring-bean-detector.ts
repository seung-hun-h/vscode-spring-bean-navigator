import * as vscode from 'vscode';
import { 
    BeanDefinition, 
    SpringAnnotationType, 
    ClassInfo, 
    InjectionInfo,
    JavaFileParseResult,
    AnnotationInfo,
    MethodInfo,
} from '../models/spring-types';
import { ConstructorInjectionDetector } from './constructor-injection-detector';
import { SetterInjectionDetector } from './setter-injection-detector';
import { AutowiredInjectionDetector } from './autowired-injection-detector';
import { LombokInjectionDetector } from './lombok-injection-detector';
import { BeanMethodInjectionDetector } from './bean-method-injection-detector';
import { PositionCalculator } from '../parsers/core/position-calculator';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Spring Bean을 탐지하고 Bean 정의를 생성하는 클래스
 */
export class SpringBeanDetector {
    private constructorDetector: ConstructorInjectionDetector;
    private setterDetector: SetterInjectionDetector;
    private autowiredDetector: AutowiredInjectionDetector;
    private lombokDetector: LombokInjectionDetector;
    private beanMethodDetector: BeanMethodInjectionDetector;
    
    constructor() {
        this.constructorDetector = new ConstructorInjectionDetector();
        this.setterDetector = new SetterInjectionDetector();
        this.autowiredDetector = new AutowiredInjectionDetector(new PositionCalculator());
        this.lombokDetector = new LombokInjectionDetector();
        this.beanMethodDetector = new BeanMethodInjectionDetector();
    }

    /**
     * Java 파일 파싱 결과에서 Spring Bean들을 탐지합니다.
     * 
     * @param parseResult Java 파일 파싱 결과
     * @param fileUri 파일 URI
     * @returns 발견된 Bean 정의들
     */
    public detectBeansInParseResult(parseResult: JavaFileParseResult, fileUri: vscode.Uri): BeanDefinition[] {
        const beans: BeanDefinition[] = [];
        
        try {
            // 각 클래스에서 Bean 정의 추출
            for (const classInfo of parseResult.classes) {
                const classBeans = this.extractBeansFromClass(classInfo, fileUri);
                beans.push(...classBeans);
            }
            
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Bean 탐지');
            ErrorHandler.logError(parsingError, { 
                fileUri: fileUri.toString(),
                classCount: parseResult.classes.length 
            });
            // 에러가 발생해도 빈 배열 반환 (테스트 요구사항)
        }
        
        return beans;
    }

    /**
     * 클래스에서 Bean 정의들을 추출합니다.
     * 
     * @param classInfo 파싱된 클래스 정보
     * @param fileUri 파일 URI
     * @returns Bean 정의들
     */
    private extractBeansFromClass(classInfo: ClassInfo, fileUri: vscode.Uri): BeanDefinition[] {
        const beans: BeanDefinition[] = [];
        
        // 클래스 레벨 Spring 어노테이션 확인
        for (const annotation of classInfo.annotations) {
            if (this.isSpringBeanAnnotation(annotation.type)) {
                const beanDefinition = this.createBeanDefinitionFromClass(classInfo, annotation.type, fileUri);
                beans.push(beanDefinition);
            }
        }
        
        // @Configuration 클래스인 경우 @Bean 메소드도 확인
        const hasConfiguration = classInfo.annotations.some(
            annotation => annotation.type === SpringAnnotationType.CONFIGURATION
        );
        
        if (hasConfiguration) {
            const beanMethods = this.extractBeanMethods(classInfo, fileUri);
            beans.push(...beanMethods);
        }
        
        return beans;
    }

    /**
     * 클래스에서 Bean 정의를 생성합니다.
     * 
     * @param classInfo 클래스 정보
     * @param annotationType 어노테이션 타입
     * @param fileUri 파일 URI
     * @returns Bean 정의
     */
    private createBeanDefinitionFromClass(
        classInfo: ClassInfo, 
        annotationType: SpringAnnotationType, 
        fileUri: vscode.Uri
    ): BeanDefinition {
        const className = classInfo.name;
        
        // 커스텀 Bean 이름 확인
        const customBeanName = this.extractCustomBeanName(classInfo, annotationType);
        const beanName = customBeanName || this.generateBeanName(className);
        
        const fullyQualifiedName = classInfo.fullyQualifiedName;
        
        const beanDefinition: BeanDefinition = {
            name: beanName,
            type: className,
            implementationClass: fullyQualifiedName,
            fileUri,
            position: classInfo.position,
            definitionType: 'class',
            annotation: annotationType,
            // 편의 속성들
            beanName,
            className,
            annotationType,
            fullyQualifiedName
        };

        // 인터페이스 정보가 있으면 Bean 정의에 포함
        const interfaces = (classInfo as any).interfaces as string[] | undefined;
        if (interfaces && interfaces.length > 0) {
            (beanDefinition as any).interfaces = interfaces;
        }

        return beanDefinition;
    }

    /**
     * @Configuration 클래스에서 @Bean 메소드들을 추출합니다.
     * 
     * @param classInfo 클래스 정보
     * @param fileUri 파일 URI
     * @returns @Bean 메소드들의 Bean 정의들
     */
    private extractBeanMethods(classInfo: ClassInfo, fileUri: vscode.Uri): BeanDefinition[] {
        const beans: BeanDefinition[] = [];
        
        // 클래스의 모든 메서드 확인
        if (classInfo.methods) {
            for (const method of classInfo.methods) {
                // @Bean 어노테이션이 있는 메서드 확인
                const beanAnnotation = method.annotations.find(
                    annotation => annotation.type === SpringAnnotationType.BEAN
                );
                
                if (beanAnnotation) {
                    const beanDefinition = this.createBeanDefinitionFromMethod(method, classInfo, fileUri);
                    beans.push(beanDefinition);
                }
            }
        }
        
        return beans;
    }
    
    /**
     * @Bean 메서드에서 Bean 정의를 생성합니다.
     * 
     * @param method 메서드 정보
     * @param classInfo 클래스 정보
     * @param fileUri 파일 URI
     * @returns Bean 정의
     */
    private createBeanDefinitionFromMethod(
        method: MethodInfo, 
        classInfo: ClassInfo, 
        fileUri: vscode.Uri
    ): BeanDefinition {
        // @Bean 어노테이션에서 커스텀 이름 확인
        const beanAnnotation = method.annotations.find(
            annotation => annotation.type === SpringAnnotationType.BEAN
        );
        
        const customBeanName = beanAnnotation ? this.extractCustomBeanNameFromAnnotation(beanAnnotation) : undefined;
        const beanName = customBeanName || this.generateBeanName(method.name);
        
        const beanDefinition: BeanDefinition = {
            name: beanName,
            type: method.returnType || 'Object',
            implementationClass: method.returnType || 'Object',
            fileUri,
            position: method.position,
            definitionType: 'method',
            annotation: SpringAnnotationType.BEAN,
            beanName,
            className: method.returnType || 'Object',
            annotationType: SpringAnnotationType.BEAN,
            fullyQualifiedName: method.returnType || 'Object'
        };

        return beanDefinition;
    }
    
    /**
     * 어노테이션에서 커스텀 Bean 이름을 추출합니다.
     * 
     * @param annotation 어노테이션 정보
     * @returns 커스텀 Bean 이름 (없으면 undefined)
     */
    private extractCustomBeanNameFromAnnotation(annotation: AnnotationInfo): string | undefined {
        if (annotation && annotation.parameters) {
            // value 또는 name 매개변수 확인
            const value = annotation.parameters.get('value') || annotation.parameters.get('name');
            if (value) {
                // 따옴표 제거
                return value.replace(/["']/g, '');
            }
        }
        
        return undefined;
    }

    /**
     * 어노테이션에서 커스텀 Bean 이름을 추출합니다.
     * 
     * @param classInfo 클래스 정보
     * @param annotationType 어노테이션 타입
     * @returns 커스텀 Bean 이름 (없으면 undefined)
     */
    private extractCustomBeanName(classInfo: ClassInfo, annotationType: SpringAnnotationType): string | undefined {
        const annotation = classInfo.annotations.find(ann => ann.type === annotationType);
        
        if (annotation && annotation.parameters) {
            // value 매개변수 확인
            const value = annotation.parameters.get('value') || annotation.parameters.get('name');
            if (value) {
                // 따옴표 제거
                return value.replace(/["']/g, '');
            }
        }
        
        return undefined;
    }

    /**
     * 클래스 이름으로부터 Bean 이름을 생성합니다.
     * Spring의 기본 규칙: 첫 글자를 소문자로 변경
     * 
     * @param className 클래스 이름
     * @returns Bean 이름
     */
    public generateBeanName(className: string): string {
        if (!className || className.length === 0) {
            return '';
        }
        
        if (className.length === 1) {
            return className.toLowerCase();
        }
        
        return className.charAt(0).toLowerCase() + className.slice(1);
    }

    /**
     * 주어진 어노테이션이 Spring Bean을 정의하는 어노테이션인지 확인합니다.
     * 
     * @param annotationType 어노테이션 타입
     * @returns Bean 어노테이션 여부
     */
    public isSpringBeanAnnotation(annotationType: SpringAnnotationType): boolean {
        const beanAnnotations = new Set([
            SpringAnnotationType.COMPONENT,
            SpringAnnotationType.SERVICE,
            SpringAnnotationType.REPOSITORY,
            SpringAnnotationType.CONTROLLER,
            SpringAnnotationType.REST_CONTROLLER,
            SpringAnnotationType.CONFIGURATION,
            SpringAnnotationType.BEAN
        ]);
        
        return beanAnnotations.has(annotationType);
    }

    // ===== Phase 2: 생성자 주입 및 Setter 주입 탐지 =====

    /**
     * 클래스에서 모든 타입의 주입을 탐지합니다 (필드 + 생성자 + setter).
     * 
     * @param classInfo 분석할 클래스 정보
     * @returns 발견된 모든 주입 정보들
     */
    public detectAllInjectionTypes(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        if (!classInfo) {
            return injections;
        }

        try {
            // 1. 필드 주입 탐지 (@Autowired 필드)
            const fieldInjections = this.autowiredDetector.detectAllInjections([classInfo]);
            injections.push(...fieldInjections);

            // 2. 생성자 주입 탐지
            const constructorInjections = this.constructorDetector.detectAllInjections([classInfo]);
            injections.push(...constructorInjections);

            // 3. Setter 주입 탐지
            const setterInjections = this.setterDetector.detectAllInjections([classInfo]);
            injections.push(...setterInjections);

            // 4. Lombok 주입 탐지 (Phase 3)
            const lombokInjections = this.lombokDetector.detectAllInjections([classInfo]);
            injections.push(...lombokInjections);

            // 5. Bean 메서드 매개변수 주입 탐지 (Phase 4)
            const beanMethodInjections = this.beanMethodDetector.detectInjections(classInfo);
            injections.push(...beanMethodInjections);

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '주입 탐지');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                fullyQualifiedName: classInfo?.fullyQualifiedName 
            });
        }

        return injections;
    }

    /**
     * 여러 클래스에서 모든 주입을 탐지합니다.
     * 
     * @param classes 분석할 클래스들
     * @returns 발견된 모든 주입 정보들
     */
    public detectAllInjectionsInClasses(classes: ClassInfo[]): InjectionInfo[] {
        const allInjections: InjectionInfo[] = [];

        if (!classes || !Array.isArray(classes)) {
            return allInjections;
        }

        for (const classInfo of classes) {
            const classInjections = this.detectAllInjectionTypes(classInfo);
            allInjections.push(...classInjections);
        }

        return allInjections;
    }
} 