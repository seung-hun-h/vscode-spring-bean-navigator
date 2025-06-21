import * as vscode from 'vscode';
import { 
    ClassInfo, 
    FieldInfo, 
    AnnotationInfo, 
    JavaFileParseResult,
    InjectionInfo
} from '../../models/spring-types';

/**
 * CST(Concrete Syntax Tree) 탐색 인터페이스
 */
export interface ICSTNavigator {
    /**
     * CST에서 패키지 이름을 추출합니다.
     * 
     * @param cst - CST 루트 노드
     * @returns 패키지 이름 또는 undefined
     */
    extractPackageName(cst: any): string | undefined;

    /**
     * CST에서 임포트 문들을 추출합니다.
     * 
     * @param cst - CST 루트 노드
     * @returns 임포트 문 배열
     */
    extractImports(cst: any): string[];

    /**
     * CST에서 클래스 선언들을 찾습니다.
     * 
     * @param cst - CST 루트 노드
     * @returns 클래스 선언 노드 배열
     */
    findClassDeclarations(cst: any): any[];
}

/**
 * 위치 계산 인터페이스
 */
export interface IPositionCalculator {
    /**
     * AST 노드의 위치 정보를 계산합니다.
     * 
     * @param node - AST 노드
     * @param lines - 파일 라인 배열
     * @returns VSCode Position
     */
    calculatePosition(node: any, lines: string[]): vscode.Position;

    /**
     * AST 노드의 범위 정보를 계산합니다.
     * 
     * @param node - AST 노드
     * @param lines - 파일 라인 배열
     * @returns VSCode Range
     */
    calculateRange(node: any, lines: string[]): vscode.Range;
}

/**
 * 클래스 추출 인터페이스
 */
export interface IClassExtractor {
    /**
     * 클래스 선언을 파싱하여 ClassInfo 객체를 생성합니다.
     * 
     * @param classDecl - 클래스 선언 노드
     * @param fileUri - 파일 URI
     * @param content - 파일 내용
     * @param lines - 파일 라인 배열
     * @param packageName - 패키지 이름
     * @param imports - 임포트 목록
     * @returns ClassInfo 또는 undefined
     */
    parseClassDeclaration(
        classDecl: any,
        fileUri: vscode.Uri,
        content: string,
        lines: string[],
        packageName: string | undefined,
        imports: string[]
    ): ClassInfo | undefined;

    /**
     * 클래스의 어노테이션들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 노드
     * @param lines - 파일 라인 배열
     * @returns 어노테이션 정보 배열
     */
    extractClassAnnotations(classDecl: any, lines: string[]): AnnotationInfo[];

    /**
     * 클래스가 구현하는 인터페이스들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 노드
     * @returns 구현하는 인터페이스 이름들
     */
    extractImplementedInterfaces(classDecl: any): string[];
}

/**
 * 필드 추출 인터페이스
 */
export interface IFieldExtractor {
    /**
     * 클래스의 필드들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 노드
     * @param lines - 파일 라인 배열
     * @returns 필드 정보 배열
     */
    extractFields(classDecl: any, lines: string[]): FieldInfo[];

    /**
     * 필드 선언을 파싱하여 FieldInfo 객체를 생성합니다.
     * 
     * @param fieldDecl - 필드 선언 노드
     * @param lines - 파일 라인 배열
     * @returns FieldInfo 또는 undefined
     */
    parseFieldDeclaration(fieldDecl: any, lines: string[]): FieldInfo | undefined;

    /**
     * 필드의 어노테이션들을 추출합니다.
     * 
     * @param fieldDecl - 필드 선언 노드
     * @param lines - 파일 라인 배열
     * @returns 어노테이션 정보 배열
     */
    extractFieldAnnotations(fieldDecl: any, lines: string[]): AnnotationInfo[];
}

/**
 * 어노테이션 파서 인터페이스
 */
export interface IAnnotationParser {
    /**
     * 어노테이션을 파싱합니다.
     * 
     * @param annotation - 어노테이션 노드
     * @param lines - 파일 라인 배열
     * @returns 어노테이션 정보 또는 undefined
     */
    parseAnnotation(annotation: any, lines: string[]): AnnotationInfo | undefined;

    /**
     * 어노테이션 매개변수를 추출합니다.
     * 
     * @param annotation - 어노테이션 노드
     * @returns 매개변수 맵
     */
    extractAnnotationParameters(annotation: any): Map<string, string>;
}

/**
 * Autowired 탐지 인터페이스
 */
export interface IAutowiredDetector {
    /**
     * 클래스들에서 @Autowired 어노테이션이 붙은 필드들을 추출하여 주입 정보를 생성합니다.
     * 
     * @param classes - 파싱된 클래스 정보들
     * @returns @Autowired 필드들의 주입 정보
     */
    extractAutowiredFields(classes: ClassInfo[]): InjectionInfo[];

    /**
     * @Autowired 어노테이션이 붙은 필드가 있는지 확인합니다.
     * 
     * @param classInfo - 확인할 클래스 정보
     * @returns @Autowired 필드가 있으면 true
     */
    hasAutowiredFields(classInfo: ClassInfo): boolean;

    /**
     * 특정 타입에 대한 @Autowired 필드들을 찾습니다.
     * 
     * @param classInfo - 검색할 클래스 정보
     * @param targetType - 찾을 타입
     * @returns 해당 타입의 @Autowired 필드들
     */
    findAutowiredFieldsByType(classInfo: ClassInfo, targetType: string): FieldInfo[];

    /**
     * Java 파일 내용에서 직접 @Autowired 패턴을 찾는 간단한 방법
     * (CST 파싱이 실패할 경우의 fallback)
     * 
     * @param content - Java 파일 내용
     * @param fileUri - 파일 URI
     * @returns 발견된 @Autowired 위치들
     */
    findAutowiredPatterns(content: string, fileUri: vscode.Uri): InjectionInfo[];
}

/**
 * Java 파일 파서 메인 인터페이스
 */
export interface IJavaFileParser {
    /**
     * Java 파일을 파싱하여 클래스 정보를 추출합니다.
     * 
     * @param fileUri - 파싱할 Java 파일 URI
     * @param content - 파일 내용
     * @returns 파싱 결과
     */
    parseJavaFile(fileUri: vscode.Uri, content: string): Promise<JavaFileParseResult>;
}

/**
 * 파서 컴포넌트들을 조합하는 팩토리 인터페이스
 */
export interface IParserFactory {
    /**
     * CST Navigator 인스턴스를 생성합니다.
     */
    createCSTNavigator(): ICSTNavigator;

    /**
     * Position Calculator 인스턴스를 생성합니다.
     */
    createPositionCalculator(): IPositionCalculator;

    /**
     * Class Extractor 인스턴스를 생성합니다.
     */
    createClassExtractor(): IClassExtractor;

    /**
     * Field Extractor 인스턴스를 생성합니다.
     */
    createFieldExtractor(): IFieldExtractor;

    /**
     * Annotation Parser 인스턴스를 생성합니다.
     */
    createAnnotationParser(): IAnnotationParser;

    /**
     * Autowired Detector 인스턴스를 생성합니다.
     */
    createAutowiredDetector(): IAutowiredDetector;

    /**
     * 완전히 구성된 Java File Parser 인스턴스를 생성합니다.
     */
    createJavaFileParser(): IJavaFileParser;
} 