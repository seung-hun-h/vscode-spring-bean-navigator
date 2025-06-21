import * as vscode from 'vscode';
import { ClassInfo, AnnotationInfo } from '../../models/spring-types';
import { JAVA_PARSER_CONFIG } from '../config/java-parser-config';
import { ErrorHandler, ClassExtractionError } from '../core/parser-errors';
import { CSTNavigator } from '../core/cst-navigator';
import { PositionCalculator } from '../core/position-calculator';
import { AnnotationParser } from './annotation-parser';
import { FieldExtractor } from './field-extractor';

/**
 * Java 클래스 정보를 추출하는 클래스입니다.
 * 클래스 선언, 어노테이션, 인터페이스 구현 등을 파싱합니다.
 */
export class ClassExtractor {
    private readonly cstNavigator: CSTNavigator;
    private readonly positionCalculator: PositionCalculator;
    private readonly annotationParser: AnnotationParser;
    private readonly fieldExtractor: FieldExtractor;

    constructor(
        cstNavigator: CSTNavigator,
        positionCalculator: PositionCalculator,
        annotationParser: AnnotationParser,
        fieldExtractor: FieldExtractor
    ) {
        this.cstNavigator = cstNavigator;
        this.positionCalculator = positionCalculator;
        this.annotationParser = annotationParser;
        this.fieldExtractor = fieldExtractor;
    }

    /**
     * CST에서 클래스 정보를 추출합니다.
     * 
     * @param cst - 파싱된 CST
     * @param fileUri - 파일 URI
     * @param content - 파일 내용
     * @returns 추출된 클래스 정보 배열
     */
    public extractClasses(cst: any, fileUri: vscode.Uri, content: string): ClassInfo[] {
        const classes: ClassInfo[] = [];
        const lines = content.split('\n');
        
        try {
            // 패키지 정보 추출
            const packageName = this.cstNavigator.extractPackageName(cst);
            
            // 임포트 정보 추출
            const imports = this.cstNavigator.extractImports(cst);
            
            // 클래스 정의 추출
            const classDeclarations = this.cstNavigator.findClassDeclarations(cst);
            
            for (const classDecl of classDeclarations) {
                const classInfo = this.parseClassDeclaration(
                    classDecl, 
                    fileUri, 
                    content, 
                    lines, 
                    packageName, 
                    imports
                );
                
                if (classInfo) {
                    classes.push(classInfo);
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                '클래스 추출 중 오류',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return classes;
    }

    /**
     * 클래스 선언을 파싱하여 ClassInfo 객체를 생성합니다.
     * 
     * @param classDecl - 클래스 선언 CST 노드
     * @param fileUri - 파일 URI
     * @param content - 파일 내용
     * @param lines - 파일 내용의 라인들
     * @param packageName - 패키지 이름
     * @param imports - 임포트 문들
     * @returns 파싱된 클래스 정보 또는 undefined
     */
    public parseClassDeclaration(
        classDecl: any, 
        fileUri: vscode.Uri, 
        content: string, 
        lines: string[], 
        packageName: string | undefined, 
        imports: string[]
    ): ClassInfo | undefined {
        try {
            // 클래스 이름 추출
            const className = classDecl.children?.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
            
            if (!className) {
                return undefined;
            }

            // 클래스 위치 정보 계산
            const position = this.positionCalculator.calculatePosition(classDecl, lines);
            const range = this.positionCalculator.calculateRange(classDecl, lines);

            // 클래스 어노테이션 추출
            const annotations = this.extractClassAnnotations(classDecl, lines);

            // 필드 정보 추출
            const fields = this.fieldExtractor.extractFields(classDecl, lines);

            // 인터페이스 정보 추출
            const interfaces = this.extractImplementedInterfaces(classDecl);

            const fullyQualifiedName = packageName ? `${packageName}.${className}` : className;

            const classInfo: ClassInfo = {
                name: className,
                packageName,
                fullyQualifiedName,
                fileUri,
                position,
                range,
                annotations,
                fields,
                imports
            };

            // 인터페이스 정보를 확장 속성으로 추가
            if (interfaces.length > 0) {
                (classInfo as any).interfaces = interfaces;
            }

            return classInfo;
            
        } catch (error) {
            const classError = new ClassExtractionError(
                '클래스 파싱 실패',
                classDecl?.children?.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
            return undefined;
        }
    }

    /**
     * 클래스의 어노테이션들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @returns 추출된 어노테이션 정보 배열
     */
    public extractClassAnnotations(classDecl: any, lines: string[]): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            // 실제 구조: classDeclaration.children = ['classModifier', 'normalClassDeclaration']
            const classModifiers = classDecl.children?.classModifier;
            
            if (classModifiers) {
                for (const modifier of classModifiers) {
                    if (modifier.children?.annotation) {
                        const annotation = this.annotationParser.parseAnnotation(modifier.children.annotation[0], lines);
                        if (annotation) {
                            annotations.push(annotation);
                        }
                    }
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                '클래스 어노테이션 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return annotations;
    }

    /**
     * 클래스가 구현하는 인터페이스들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 CST 노드
     * @returns 구현하는 인터페이스 이름들
     */
    public extractImplementedInterfaces(classDecl: any): string[] {
        const interfaces: string[] = [];
        
        try {
            const normalClassDecl = classDecl.children?.normalClassDeclaration?.[0];
            
            if (normalClassDecl?.children) {
                // superinterfaces 직접 확인
                const superinterfaces = normalClassDecl.children.superinterfaces;
                
                if (superinterfaces && superinterfaces.length > 0) {
                    // interfaceTypeList 확인
                    const interfaceTypeList = superinterfaces[0].children?.interfaceTypeList;
                    if (interfaceTypeList && interfaceTypeList.length > 0) {
                        // interfaceType들 확인
                        const interfaceTypes = interfaceTypeList[0].children?.interfaceType;
                        if (interfaceTypes && Array.isArray(interfaceTypes)) {
                            for (const interfaceType of interfaceTypes) {
                                const interfaceName = this.extractInterfaceName(interfaceType);
                                if (interfaceName) {
                                    interfaces.push(interfaceName);
                                }
                            }
                        }
                    }
                } else {
                    // 대안: 재귀적으로 Implements 키워드와 Identifier 찾기
                    const foundInterfaces = this.findInterfacesRecursively(normalClassDecl);
                    interfaces.push(...foundInterfaces);
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                '인터페이스 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return interfaces;
    }

    /**
     * 재귀적으로 CST를 탐색해서 implements 절의 인터페이스들을 찾습니다.
     * 
     * @param node - 탐색할 CST 노드
     * @returns 발견된 인터페이스 이름들
     */
    public findInterfacesRecursively(node: any): string[] {
        const interfaces: string[] = [];
        
        if (!node) {
            return interfaces;
        }
        
        try {
            // Implements 키워드를 찾았다면 그 다음에 오는 Identifier들을 수집
            if (node.children?.Implements) {
                const identifiers = this.collectIdentifiersAfterImplements(node);
                interfaces.push(...identifiers);
            }
            
            // 자식 노드들을 재귀적으로 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            const childInterfaces = this.findInterfacesRecursively(child);
                            interfaces.push(...childInterfaces);
                        }
                    }
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                '재귀 탐색 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return interfaces;
    }

    /**
     * Implements 키워드 이후의 Identifier들을 수집합니다.
     * 
     * @param node - 탐색할 CST 노드
     * @returns 수집된 인터페이스 이름들
     */
    public collectIdentifiersAfterImplements(node: any): string[] {
        const identifiers: string[] = [];
        
        try {
            // 현재 노드와 자식 노드에서 Identifier 찾기
            this.collectAllIdentifiers(node, identifiers);
            
            // Implements 키워드와 Java 구문 기호들은 제외하고 실제 인터페이스 이름만 필터링
            const filteredIdentifiers = identifiers.filter(id => 
                id && 
                id.trim() !== '' && 
                !JAVA_PARSER_CONFIG.JAVA_KEYWORDS_AND_SYMBOLS.has(id) &&
                // 첫 글자가 대문자인 것만 (Java 인터페이스 명명 규칙)
                JAVA_PARSER_CONFIG.INTERFACE_NAME_REGEX.test(id)
            );
            
            // 중복 제거
            const uniqueInterfaces = [...new Set(filteredIdentifiers)];
            
            return uniqueInterfaces;
            
        } catch (error) {
            const classError = new ClassExtractionError(
                'Identifier 수집 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return identifiers;
    }

    /**
     * 노드에서 모든 Identifier를 재귀적으로 수집합니다.
     * 
     * @param node - 탐색할 CST 노드
     * @param identifiers - 수집된 식별자들을 저장할 배열
     */
    public collectAllIdentifiers(node: any, identifiers: string[]): void {
        if (!node) {
            return;
        }
        
        try {
            // Identifier 노드인 경우
            if (node.image && typeof node.image === 'string') {
                identifiers.push(node.image);
            }
            
            // 자식 노드 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            this.collectAllIdentifiers(child, identifiers);
                        }
                    }
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                'Identifier 수집 중 오류',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
    }

    /**
     * 개별 인터페이스 타입에서 인터페이스 이름을 추출합니다.
     * 
     * @param interfaceType - 인터페이스 타입 CST 노드
     * @returns 인터페이스 이름
     */
    public extractInterfaceName(interfaceType: any): string | undefined {
        try {
            // interfaceType 구조: classType
            const classType = interfaceType.children?.classType?.[0];
            
            if (classType) {
                // classType에서 Identifier 추출
                const identifiers = classType.children?.Identifier;
                
                if (identifiers && Array.isArray(identifiers)) {
                    // 패키지명이 포함된 경우 마지막 부분만 가져오기
                    const interfaceName = identifiers[identifiers.length - 1].image;
                    return interfaceName;
                }
                
                // 단일 Identifier인 경우
                if (classType.children?.Identifier?.image) {
                    return classType.children.Identifier.image;
                }
            }
            
            // 다른 구조일 경우 대안 시도
            if (interfaceType.children?.Identifier) {
                const identifiers = interfaceType.children.Identifier;
                if (Array.isArray(identifiers)) {
                    return identifiers[identifiers.length - 1].image;
                }
                return identifiers.image;
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                '인터페이스 이름 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return undefined;
    }

    /**
     * 클래스에서 특정 어노테이션이 붙은 클래스들을 찾습니다.
     * 
     * @param classes - 클래스 배열
     * @param annotationType - 찾을 어노테이션 타입
     * @returns 해당 어노테이션이 붙은 클래스들
     */
    public findClassesByAnnotation(classes: ClassInfo[], annotationType: string): ClassInfo[] {
        return classes.filter(classInfo => 
            classInfo.annotations.some(annotation => annotation.name === annotationType)
        );
    }

    /**
     * 클래스에서 특정 인터페이스를 구현하는 클래스들을 찾습니다.
     * 
     * @param classes - 클래스 배열
     * @param interfaceName - 찾을 인터페이스 이름
     * @returns 해당 인터페이스를 구현하는 클래스들
     */
    public findClassesByInterface(classes: ClassInfo[], interfaceName: string): ClassInfo[] {
        return classes.filter(classInfo => {
            const interfaces = (classInfo as any).interfaces || [];
            return interfaces.includes(interfaceName);
        });
    }

    /**
     * 클래스가 특정 패키지에 속하는지 확인합니다.
     * 
     * @param classInfo - 확인할 클래스
     * @param packageName - 확인할 패키지 이름
     * @returns 해당 패키지에 속하면 true
     */
    public isInPackage(classInfo: ClassInfo, packageName: string): boolean {
        return classInfo.packageName === packageName;
    }

    /**
     * 클래스의 간단한 이름(패키지 제외)을 반환합니다.
     * 
     * @param classInfo - 클래스 정보
     * @returns 간단한 클래스 이름
     */
    public getSimpleClassName(classInfo: ClassInfo): string {
        return classInfo.name;
    }

    /**
     * 클래스의 완전한 이름(패키지 포함)을 반환합니다.
     * 
     * @param classInfo - 클래스 정보
     * @returns 완전한 클래스 이름
     */
    public getFullyQualifiedName(classInfo: ClassInfo): string {
        return classInfo.fullyQualifiedName;
    }
} 