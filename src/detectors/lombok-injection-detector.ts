import { 
    ClassInfo, 
    FieldInfo,
    ParameterInfo,
    SpringAnnotationType, 
    VirtualConstructorInfo,
    LombokAnnotationInfo,
    LombokSimulationResult,
    LombokFieldAnalysis,
    InjectionInfo,
    InjectionType
} from '../models/spring-types';
import { IInjectionDetector } from './injection-detector';
import { ErrorHandler, JavaParsingError } from '../parsers/core/parser-errors';

/**
 * Lombok 어노테이션 기반 의존성 주입을 탐지하는 클래스 (Phase 3)
 * 컴파일 타임에 생성되는 Lombok 생성자를 가상으로 시뮬레이션하여 주입 정보를 제공합니다.
 */
export class LombokInjectionDetector implements IInjectionDetector {

    /**
     * 모든 클래스에서 Lombok 기반 의존성 주입을 탐지합니다.
     * 
     * @param classes - 분석할 클래스 정보 배열
     * @returns 탐지된 Lombok 주입 정보 배열
     */
    public detectAllInjections(classes: ClassInfo[]): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        if (!classes || classes.length === 0) {
            return injections;
        }

        for (const classInfo of classes) {
            try {
                // @RequiredArgsConstructor 주입 탐지
                const requiredArgsInjections = this.detectRequiredArgsConstructorInjections(classInfo);
                injections.push(...requiredArgsInjections);

                // @AllArgsConstructor 주입 탐지
                const allArgsInjections = this.detectAllArgsConstructorInjections(classInfo);
                injections.push(...allArgsInjections);

            } catch (error) {
                const parsingError = ErrorHandler.handleParsingError(error, 'Lombok 주입 탐지');
                ErrorHandler.logError(parsingError, { 
                    className: classInfo?.name || 'Unknown',
                    fieldCount: classInfo?.fields?.length || 0,
                    annotationCount: classInfo?.annotations?.length || 0
                });
            }
        }

        return injections;
    }

    /**
     * @RequiredArgsConstructor에서 주입 정보를 탐지합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 탐지된 주입 정보 배열
     */
    public detectRequiredArgsConstructorInjections(classInfo: ClassInfo): InjectionInfo[] {
        const virtualConstructor = this.detectRequiredArgsConstructor(classInfo);
        if (!virtualConstructor) {
            return [];
        }

        return this.convertVirtualConstructorToInjections(virtualConstructor, classInfo);
    }

    /**
     * @AllArgsConstructor에서 주입 정보를 탐지합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 탐지된 주입 정보 배열
     */
    public detectAllArgsConstructorInjections(classInfo: ClassInfo): InjectionInfo[] {
        const virtualConstructor = this.detectAllArgsConstructor(classInfo);
        if (!virtualConstructor) {
            return [];
        }

        return this.convertVirtualConstructorToInjections(virtualConstructor, classInfo);
    }

    /**
     * 가상 생성자 정보를 주입 정보로 변환합니다.
     * 
     * @param virtualConstructor - 가상 생성자 정보
     * @param classInfo - 클래스 정보
     * @returns 변환된 주입 정보 배열
     */
    private convertVirtualConstructorToInjections(
        virtualConstructor: VirtualConstructorInfo, 
        classInfo: ClassInfo
    ): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        for (const parameter of virtualConstructor.parameters) {
            const injection: InjectionInfo = {
                targetType: parameter.type,
                targetName: parameter.name,
                injectionType: InjectionType.CONSTRUCTOR_LOMBOK, // Lombok 생성자 주입을 구분
                position: parameter.position || classInfo.position,
                range: classInfo.range
            };

            injections.push(injection);
        }

        return injections;
    }

    /**
     * @RequiredArgsConstructor 어노테이션의 가상 생성자를 탐지하고 생성합니다.
     * final 필드와 @NonNull 필드들을 매개변수로 하는 생성자를 시뮬레이션합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 생성된 가상 생성자 정보 또는 undefined
     */
    public detectRequiredArgsConstructor(classInfo: ClassInfo): VirtualConstructorInfo | undefined {
        if (!classInfo) {
            throw new Error('ClassInfo는 null일 수 없습니다');
        }

        // @RequiredArgsConstructor 어노테이션 확인
        const requiredArgsAnnotation = classInfo.annotations.find(
            annotation => annotation.type === SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR
        );

        if (!requiredArgsAnnotation) {
            return undefined;
        }

        // final 필드들 추출 (static 제외)
        const finalFields = classInfo.fields.filter(field => 
            field.isFinal && !field.isStatic
        );

        // @NonNull 필드들 추출 (final이 아닌 것들)
        const nonNullFields = classInfo.fields.filter(field => 
            !field.isFinal && !field.isStatic &&
            field.annotations.some(annotation => 
                annotation.type === SpringAnnotationType.LOMBOK_NON_NULL
            )
        );

        // 생성자 매개변수 생성 (필드 순서 유지)
        const requiredFields = [...finalFields, ...nonNullFields];
        const parameters: ParameterInfo[] = requiredFields.map(field => ({
            name: field.name,
            type: field.type,
            position: field.position
        }));

        // Lombok 설정 확인 (access level 등)
        const visibility = this.extractLombokAccessLevel(requiredArgsAnnotation) || 'public';

        // 가상 생성자 정보 생성
        const virtualConstructor: VirtualConstructorInfo = {
            parameters: parameters,
            range: classInfo.range,
            lombokAnnotationType: SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR,
            annotationSource: 'RequiredArgsConstructor',
            visibility: visibility,
            isVirtual: true,
            position: classInfo.position
        };

        return virtualConstructor;
    }

    /**
     * @AllArgsConstructor 어노테이션의 가상 생성자를 탐지하고 생성합니다.
     * 모든 필드들을 매개변수로 하는 생성자를 시뮬레이션합니다 (static 필드 제외).
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 생성된 가상 생성자 정보 또는 undefined
     */
    public detectAllArgsConstructor(classInfo: ClassInfo): VirtualConstructorInfo | undefined {
        if (!classInfo) {
            throw new Error('ClassInfo는 null일 수 없습니다');
        }

        // @AllArgsConstructor 어노테이션 확인
        const allArgsAnnotation = classInfo.annotations.find(
            annotation => annotation.type === SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR
        );

        if (!allArgsAnnotation) {
            return undefined;
        }

        // 모든 필드들 추출 (static 제외)
        const allFields = classInfo.fields.filter(field => !field.isStatic);

        // 생성자 매개변수 생성 (필드 순서 유지)
        const parameters: ParameterInfo[] = allFields.map(field => ({
            name: field.name,
            type: field.type,
            position: field.position
        }));

        // Lombok 설정 확인
        const visibility = this.extractLombokAccessLevel(allArgsAnnotation) || 'public';

        // 가상 생성자 정보 생성
        const virtualConstructor: VirtualConstructorInfo = {
            parameters: parameters,
            range: classInfo.range,
            lombokAnnotationType: SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR,
            annotationSource: 'AllArgsConstructor',
            visibility: visibility,
            isVirtual: true,
            position: classInfo.position
        };

        return virtualConstructor;
    }

    /**
     * 클래스의 Lombok 어노테이션을 종합적으로 분석하여 가상 생성자들을 시뮬레이션합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns Lombok 시뮬레이션 결과
     */
    public simulateLombokGeneration(classInfo: ClassInfo): LombokSimulationResult {
        try {
            if (!classInfo) {
                return this.createFailedResult(['ClassInfo가 제공되지 않았습니다']);
            }

            const lombokAnnotations: LombokAnnotationInfo[] = [];
            const virtualConstructors: VirtualConstructorInfo[] = [];
            const errors: string[] = [];

            // Lombok 어노테이션들 추출
            for (const annotation of classInfo.annotations) {
                if (this.isLombokAnnotation(annotation.type)) {
                    try {
                        const lombokAnnotation: LombokAnnotationInfo = {
                            ...annotation,
                            lombokConfig: this.extractLombokConfig(annotation)
                        };
                        lombokAnnotations.push(lombokAnnotation);
                    } catch (error) {
                        errors.push(`어노테이션 처리 실패: ${annotation.name}`);
                    }
                } else if (annotation.type && annotation.type.toString().includes('INVALID')) {
                    // 잘못된 어노테이션 타입 감지
                    errors.push(`잘못된 어노테이션 타입: ${annotation.type}`);
                }
            }

            // @RequiredArgsConstructor 시뮬레이션
            const requiredArgsConstructor = this.detectRequiredArgsConstructor(classInfo);
            if (requiredArgsConstructor) {
                virtualConstructors.push(requiredArgsConstructor);
            }

            // @AllArgsConstructor 시뮬레이션  
            const allArgsConstructor = this.detectAllArgsConstructor(classInfo);
            if (allArgsConstructor) {
                virtualConstructors.push(allArgsConstructor);
            }

            // 필드 분석 결과 생성
            const fieldAnalysis: LombokFieldAnalysis = {
                requiredArgsFields: this.extractRequiredArgsFields(classInfo),
                allArgsFields: this.extractAllArgsFields(classInfo),
                classInfo: classInfo
            };

            return {
                lombokAnnotations: lombokAnnotations,
                virtualConstructors: virtualConstructors,
                fieldAnalysis: fieldAnalysis,
                isSuccess: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            return this.createFailedResult([`시뮬레이션 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`]);
        }
    }

    /**
     * Lombok 어노테이션의 access level을 추출합니다.
     * 
     * @param annotation - Lombok 어노테이션 정보
     * @returns access level 문자열 또는 undefined
     */
    private extractLombokAccessLevel(annotation: any): string | undefined {
        if (annotation.parameters && annotation.parameters.has('access')) {
            const accessValue = annotation.parameters.get('access');
            // AccessLevel.PROTECTED → protected 변환
            if (accessValue === 'PROTECTED' || accessValue === 'protected') {
                return 'protected';
            }
            if (accessValue === 'PRIVATE' || accessValue === 'private') {
                return 'private';
            }
            if (accessValue === 'PACKAGE' || accessValue === 'package') {
                return '';
            }
        }
        return 'public'; // 기본값
    }

    /**
     * 주어진 어노테이션 타입이 Lombok 어노테이션인지 확인합니다.
     * 
     * @param annotationType - 확인할 어노테이션 타입
     * @returns Lombok 어노테이션이면 true
     */
    private isLombokAnnotation(annotationType: SpringAnnotationType): boolean {
        const lombokAnnotations = [
            SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR,
            SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR,
            SpringAnnotationType.LOMBOK_NO_ARGS_CONSTRUCTOR,
            SpringAnnotationType.LOMBOK_DATA,
            SpringAnnotationType.LOMBOK_VALUE,
            SpringAnnotationType.LOMBOK_SLF4J,
            SpringAnnotationType.LOMBOK_NON_NULL
        ];
        
        return lombokAnnotations.includes(annotationType);
    }

    /**
     * Lombok 어노테이션의 설정을 추출합니다.
     * 
     * @param annotation - 어노테이션 정보
     * @returns Lombok 설정 맵
     */
    private extractLombokConfig(annotation: any): Map<string, string> {
        const config = new Map<string, string>();
        
        if (annotation.parameters) {
            // access level 설정
            if (annotation.parameters.has('access')) {
                config.set('access', annotation.parameters.get('access'));
            }
            
            // staticName 설정
            if (annotation.parameters.has('staticName')) {
                config.set('staticName', annotation.parameters.get('staticName'));
            }
        }
        
        // 기본값 설정
        if (!config.has('access')) {
            config.set('access', 'public');
        }
        
        return config;
    }

    /**
     * @RequiredArgsConstructor에 포함될 필드들을 추출합니다.
     * 
     * @param classInfo - 클래스 정보
     * @returns final 및 @NonNull 필드들
     */
    private extractRequiredArgsFields(classInfo: ClassInfo): FieldInfo[] {
        const finalFields = classInfo.fields.filter(field => 
            field.isFinal && !field.isStatic
        );

        const nonNullFields = classInfo.fields.filter(field => 
            !field.isFinal && !field.isStatic &&
            field.annotations.some(annotation => 
                annotation.type === SpringAnnotationType.LOMBOK_NON_NULL
            )
        );

        return [...finalFields, ...nonNullFields];
    }

    /**
     * @AllArgsConstructor에 포함될 필드들을 추출합니다.
     * 
     * @param classInfo - 클래스 정보
     * @returns static이 아닌 모든 필드들
     */
    private extractAllArgsFields(classInfo: ClassInfo): FieldInfo[] {
        return classInfo.fields.filter(field => !field.isStatic);
    }

    /**
     * 실패한 시뮬레이션 결과를 생성합니다.
     * 
     * @param errors - 에러 메시지들
     * @returns 실패 결과
     */
    private createFailedResult(errors: string[]): LombokSimulationResult {
        return {
            lombokAnnotations: [],
            virtualConstructors: [],
            fieldAnalysis: {
                requiredArgsFields: [],
                allArgsFields: [],
                classInfo: {} as ClassInfo
            },
            isSuccess: false,
            errors: errors
        };
    }
} 