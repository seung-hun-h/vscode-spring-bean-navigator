import * as vscode from 'vscode';
import { JavaParsingError, CSTParsingError, AnnotationParsingError, FieldExtractionError, ClassExtractionError, PositionCalculationError } from '../parsers/core/parser-errors';

/**
 * Spring 어노테이션 타입
 */
export enum SpringAnnotationType {
    COMPONENT = 'Component',
    SERVICE = 'Service',
    REPOSITORY = 'Repository',
    CONTROLLER = 'Controller',
    REST_CONTROLLER = 'RestController',
    CONFIGURATION = 'Configuration',
    BEAN = 'Bean',
    AUTOWIRED = 'Autowired',
    QUALIFIER = 'Qualifier',
    VALUE = 'Value', // Spring @Value 어노테이션
    // Phase 3: Lombok 어노테이션 타입들
    LOMBOK_REQUIRED_ARGS_CONSTRUCTOR = 'RequiredArgsConstructor',
    LOMBOK_ALL_ARGS_CONSTRUCTOR = 'AllArgsConstructor',
    LOMBOK_NO_ARGS_CONSTRUCTOR = 'NoArgsConstructor',
    LOMBOK_DATA = 'Data',
    LOMBOK_VALUE = 'LombokValue', // Lombok @Value와 구분
    LOMBOK_SLF4J = 'Slf4j',
    LOMBOK_NON_NULL = 'NonNull'
}

/**
 * 주입 타입 (Phase 1-3에서 점진적 확장)
 */
export enum InjectionType {
    FIELD = 'field',           // @Autowired 필드 주입 (Phase 1)
    CONSTRUCTOR = 'constructor', // 생성자 주입 (Phase 2)
    SETTER = 'setter',         // Setter 주입 (Phase 2)
    LOMBOK = 'lombok',         // Lombok 기반 주입 (Phase 3)
    CONSTRUCTOR_LOMBOK = 'constructor_lombok' // Lombok 생성자 주입 (Phase 3)
}

/**
 * 위치 정보를 가지는 기본 인터페이스 (Phase 2 리팩토링)
 */
export interface BasePositionInfo {
    /** 선언된 위치 */
    position: vscode.Position;
    /** 범위 (optional for backward compatibility) */
    range?: vscode.Range;
}

/**
 * Java 파일에서 파싱한 어노테이션 정보
 */
export interface AnnotationInfo {
    /** 어노테이션 이름 */
    name: string;
    /** 어노테이션 타입 */
    type: SpringAnnotationType;
    /** 어노테이션이 위치한 라인 번호 (0-based) */
    line: number;
    /** 어노테이션이 위치한 컬럼 번호 (0-based) */
    column: number;
    /** 어노테이션 매개변수 (예: @Service("userService")) */
    parameters?: Map<string, string>;
}

/**
 * Java 필드 정보
 */
export interface FieldInfo extends BasePositionInfo {
    /** 필드 이름 */
    name: string;
    /** 필드 타입 (예: UserRepository, List<User>) */
    type: string;
    /** 필드 범위 (Phase 1 호환성을 위해 명시적 선언) */
    range: vscode.Range;
    /** 필드에 붙은 어노테이션들 */
    annotations: AnnotationInfo[];
    /** 접근 제어자 (public, private, protected) */
    visibility?: string;
    /** final 키워드 여부 */
    isFinal?: boolean;
    /** static 키워드 여부 */
    isStatic?: boolean;
}

/**
 * 매개변수 정보 (Phase 2)
 * 생성자 및 메소드의 매개변수를 나타냄
 */
export interface ParameterInfo {
    /** 매개변수 이름 */
    name: string;
    /** 매개변수 타입 (예: UserRepository, List<User>, Optional<Service>) */
    type: string;
    /** 매개변수가 선언된 위치 (optional for simpler implementation) */
    position?: vscode.Position;
    /** 매개변수 범위 (Phase 2에서 점진적 추가, optional) */
    range?: vscode.Range;
    /** 매개변수 순서 (0-based, optional) */
    index?: number;
}

/**
 * 생성자 정보 (Phase 2)
 * Spring의 생성자 주입을 위한 생성자 정보
 */
export interface ConstructorInfo extends BasePositionInfo {
    /** 생성자 매개변수들 */
    parameters: ParameterInfo[];
    /** 생성자 범위 (Phase 2에서 명시적 선언) */
    range: vscode.Range;
    /** @Autowired 어노테이션 여부 */
    hasAutowiredAnnotation: boolean;
    /** 접근 제어자 (public, private, protected) */
    visibility?: string;
}

/**
 * 메소드 정보 (Phase 2)
 * Spring의 Setter 주입을 위한 메소드 정보
 */
export interface MethodInfo extends BasePositionInfo {
    /** 메소드 이름 */
    name: string;
    /** 메소드 매개변수들 */
    parameters: ParameterInfo[];
    /** 메소드 범위 (Phase 2에서 명시적 선언) */
    range: vscode.Range;
    /** 메소드에 붙은 어노테이션들 */
    annotations: AnnotationInfo[];
    /** Setter 메소드 여부 (setXxx 패턴 + 매개변수 1개) */
    isSetterMethod: boolean;
    /** 접근 제어자 (public, private, protected) */
    visibility?: string;
    /** 반환 타입 */
    returnType?: string;
}

/**
 * Java 클래스 정보 (Phase 2에서 확장)
 */
export interface ClassInfo extends BasePositionInfo {
    /** 클래스 이름 */
    name: string;
    /** 패키지 이름 */
    packageName?: string;
    /** 완전한 클래스 이름 (패키지 포함) */
    fullyQualifiedName: string;
    /** 클래스가 정의된 파일 URI */
    fileUri: vscode.Uri;
    /** 클래스 범위 (Phase 1 호환성을 위해 명시적 선언) */
    range: vscode.Range;
    /** 클래스에 붙은 어노테이션들 */
    annotations: AnnotationInfo[];
    /** 클래스 필드들 */
    fields: FieldInfo[];
    /** 클래스 생성자들 (Phase 2에서 점진적 추가, optional) */
    constructors?: ConstructorInfo[];
    /** 클래스 메소드들 (Phase 2에서 점진적 추가, optional) */
    methods?: MethodInfo[];
    /** 임포트 문들 */
    imports: string[];
}

/**
 * Spring Bean 정의 정보
 */
export interface BeanDefinition {
    /** Bean 이름 (기본값: 클래스명의 첫 글자를 소문자로) */
    name: string;
    /** Bean 타입 (클래스 이름 또는 인터페이스 이름) */
    type: string;
    /** Bean 구현 클래스의 완전한 이름 */
    implementationClass: string;
    /** Bean이 정의된 파일 URI */
    fileUri: vscode.Uri;
    /** Bean이 정의된 위치 */
    position: vscode.Position;
    /** Bean 정의 방식 */
    definitionType: 'class' | 'method'; // @Component 등의 클래스 또는 @Bean 메소드
    /** Bean을 정의하는 어노테이션 */
    annotation: SpringAnnotationType;
    
    // 편의 속성들 (getter로 구현하거나 별도 헬퍼로 제공)
    /** Bean 이름 (name과 동일, 테스트 호환성) */
    beanName: string;
    /** 클래스 이름 (타입에서 패키지 제외) */
    className: string;
    /** 어노테이션 타입 (annotation과 동일, 테스트 호환성) */
    annotationType: SpringAnnotationType;
    /** 완전한 클래스 이름 (패키지 포함) */
    fullyQualifiedName: string;
}

/**
 * 의존성 주입 정보
 */
export interface InjectionInfo {
    /** 주입될 타입 */
    targetType: string;
    /** 주입 방식 */
    injectionType: InjectionType;
    /** 주입이 발생하는 위치 */
    position: vscode.Position;
    /** 주입이 발생하는 범위 */
    range: vscode.Range;
    /** 주입 대상이 되는 필드 또는 매개변수 이름 */
    targetName: string;
    /** 해결된 Bean 정의 (있을 경우) */
    resolvedBean?: BeanDefinition;
    /** 여러 Bean 후보가 있을 경우 */
    candidateBeans?: BeanDefinition[];
}

/**
 * CodeLens에서 사용할 Bean 네비게이션 정보
 */
export interface BeanNavigationInfo {
    /** 주입 정보 */
    injection: InjectionInfo;
    /** 네비게이션할 Bean 정의 */
    targetBean: BeanDefinition;
    /** CodeLens에 표시할 텍스트 */
    title: string;
    /** VSCode Command 정보 */
    command: vscode.Command;
}

/**
 * Java 파일 파싱 결과
 */
export interface JavaFileParseResult {
    /** 파싱된 클래스 정보들 */
    classes: ClassInfo[];
    /** 발견된 Bean 정의들 */
    beanDefinitions: BeanDefinition[];
    /** 발견된 주입 정보들 */
    injections: InjectionInfo[];
    /** 파싱 에러들 */
    errors: string[];
}

/**
 * 프로젝트 전체의 Spring Bean 정보를 관리하는 캐시
 */
export interface SpringProjectCache {
    /** 모든 Bean 정의들 (Bean 이름 -> BeanDefinition) */
    beanDefinitions: Map<string, BeanDefinition>;
    /** 타입별 Bean 정의들 (타입 이름 -> BeanDefinition[]) */
    beansByType: Map<string, BeanDefinition[]>;
    /** 파일별 파싱 결과 캐시 (파일 URI -> JavaFileParseResult) */
    fileParseCache: Map<string, JavaFileParseResult>;
    /** 마지막 업데이트 시간 */
    lastUpdated: Date;
}

/**
 * Bean 해결 결과
 */
export interface BeanResolutionResult {
    /** 해결된 Bean (유일한 후보가 있을 경우) */
    resolved?: BeanDefinition;
    /** 가능한 Bean 후보들 */
    candidates: BeanDefinition[];
}

/**
 * Bean 선택을 위한 QuickPick 아이템
 */
export interface BeanQuickPickItem extends vscode.QuickPickItem {
    /** 연관된 Bean 정의 */
    bean: BeanDefinition;
}

/**
 * Bean 표시 정보
 */
export interface BeanDisplayInfo {
    /** 클래스 이름 (패키지 제외) */
    className: string;
    /** 패키지 이름 */
    packageName: string;
}

/**
 * 가상 생성자 정보 (Phase 3: Lombok 시뮬레이션)
 * Lombok 어노테이션이 컴파일 타임에 생성할 생성자를 시뮬레이션
 */
export interface VirtualConstructorInfo extends BasePositionInfo {
    /** 가상 생성자 매개변수들 */
    parameters: ParameterInfo[];
    /** 생성자 범위 */
    range: vscode.Range;
    /** 생성자를 생성한 Lombok 어노테이션 타입 */
    lombokAnnotationType: SpringAnnotationType;
    /** 어노테이션 소스 (RequiredArgs, AllArgs, Data 등) */
    annotationSource: string;
    /** 접근 제어자 (public이 기본값) */
    visibility: string;
    /** 시뮬레이션 여부 표시 */
    isVirtual: true;
}

/**
 * Lombok 어노테이션 정보 (Phase 3)
 * Lombok 특화 어노테이션 분석 결과
 */
export interface LombokAnnotationInfo extends AnnotationInfo {
    /** Lombok 설정 매개변수 (access, staticName 등) */
    lombokConfig?: Map<string, string>;
    /** 생성할 가상 생성자 정보 */
    virtualConstructor?: VirtualConstructorInfo;
}

/**
 * Lombok 필드 분석 결과 (Phase 3)
 * 가상 생성자 생성을 위한 필드 분석 정보
 */
export interface LombokFieldAnalysis {
    /** @RequiredArgsConstructor에 포함될 필드들 (final + @NonNull) */
    requiredArgsFields: FieldInfo[];
    /** @AllArgsConstructor에 포함될 필드들 (static 제외) */
    allArgsFields: FieldInfo[];
    /** 분석된 클래스 정보 */
    classInfo: ClassInfo;
}

/**
 * Lombok 시뮬레이션 결과 (Phase 3)
 * Lombok 어노테이션 분석 및 가상 생성자 생성 결과
 * 
 * 설계 원칙:
 * - 정보 중복 제거: lombokAnnotations는 ClassInfo.annotations와 중복되므로 제거
 * - 일관성: virtualConstructors와 fieldAnalysis 모두 배열로 통일
 * - 확장성: 여러 클래스나 분석 타입을 지원할 수 있도록 배열 구조 사용
 */
export interface LombokSimulationResult {
    /** 생성된 가상 생성자들 */
    virtualConstructors: VirtualConstructorInfo[];
    /** 필드 분석 결과들 (클래스별 또는 분석 타입별) */
    fieldAnalysis: LombokFieldAnalysis[];
    /** 시뮬레이션 성공 여부 */
    isSuccess: boolean;
    /** 시뮬레이션 에러 메시지 */
    errors?: string[];
}

/**
 * CST 노드 타입 정의 (Phase 4: 타입 안전성 개선)
 */

/**
 * 기본 CST 노드 인터페이스
 */
export interface CSTNode {
    children?: Record<string, CSTNode[]>;
    location?: {
        startOffset: number;
        endOffset: number;
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
    };
    image?: string;
    name?: string;
    type?: string;
}

/**
 * 컴파일 단위 CST 노드
 */
export interface CompilationUnitNode extends CSTNode {
    children?: {
        ordinaryCompilationUnit?: OrdinaryCompilationUnitNode[];
    };
}

/**
 * 일반 컴파일 단위 노드
 */
export interface OrdinaryCompilationUnitNode extends CSTNode {
    children?: {
        packageDeclaration?: PackageDeclarationNode[];
        importDeclaration?: ImportDeclarationNode[];
        typeDeclaration?: TypeDeclarationNode[];
    };
}

/**
 * 패키지 선언 노드
 */
export interface PackageDeclarationNode extends CSTNode {
    children?: {
        packageOrTypeName?: PackageOrTypeNameNode[];
        Identifier?: IdentifierNode[];
        Package?: IdentifierNode[];
        Dot?: IdentifierNode[];
        Semicolon?: IdentifierNode[];
    };
}

/**
 * 패키지 또는 타입 이름 노드
 */
export interface PackageOrTypeNameNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 식별자 노드
 */
export interface IdentifierNode extends CSTNode {
    image: string;
}

/**
 * Import 선언 노드
 */
export interface ImportDeclarationNode extends CSTNode {
    children?: {
        packageOrTypeName?: PackageOrTypeNameNode[];
        Identifier?: IdentifierNode[];
        Star?: IdentifierNode[];
        Import?: IdentifierNode[];
        Semicolon?: IdentifierNode[];
    };
}

/**
 * 타입 선언 노드
 */
export interface TypeDeclarationNode extends CSTNode {
    children?: {
        classDeclaration?: ClassDeclarationNode[];
        interfaceDeclaration?: InterfaceDeclarationNode[];
    };
}

/**
 * 클래스 선언 노드
 */
export interface ClassDeclarationNode extends CSTNode {
    children?: {
        classModifier?: ClassModifierNode[];
        normalClassDeclaration?: NormalClassDeclarationNode[];
    };
}

/**
 * 일반 클래스 선언 노드
 */
export interface NormalClassDeclarationNode extends CSTNode {
    children?: {
        typeIdentifier?: TypeIdentifierNode[];
        classBody?: ClassBodyNode[];
        Identifier?: IdentifierNode[];
        superclass?: SuperclassNode[];
        superinterfaces?: SuperinterfacesNode[];
    };
}

/**
 * 클래스 바디 노드
 */
export interface ClassBodyNode extends CSTNode {
    children?: {
        classBodyDeclaration?: ClassBodyDeclarationNode[];
    };
}

/**
 * 클래스 바디 선언 노드
 */
export interface ClassBodyDeclarationNode extends CSTNode {
    children?: {
        classMemberDeclaration?: ClassMemberDeclarationNode[];
        fieldDeclaration?: FieldDeclarationNode[];
        methodDeclaration?: MethodDeclarationNode[];
        constructorDeclaration?: ConstructorDeclarationNode[];
    };
}

/**
 * 클래스 멤버 선언 노드
 */
export interface ClassMemberDeclarationNode extends CSTNode {
    children?: {
        fieldDeclaration?: FieldDeclarationNode[];
        methodDeclaration?: MethodDeclarationNode[];
        constructorDeclaration?: ConstructorDeclarationNode[];
    };
}

/**
 * 필드 선언 노드
 */
export interface FieldDeclarationNode extends CSTNode {
    children?: {
        fieldModifier?: FieldModifierNode[];
        unannType?: UnannTypeNode[];
        variableDeclaratorList?: VariableDeclaratorListNode[];
    };
}

/**
 * 필드 수정자 노드
 */
export interface FieldModifierNode extends CSTNode {
    children?: {
        annotation?: AnnotationNode[];
        Public?: IdentifierNode[];
        Private?: IdentifierNode[];
        Protected?: IdentifierNode[];
        Static?: IdentifierNode[];
        Final?: IdentifierNode[];
    };
}

/**
 * 어노테이션 노드
 */
export interface AnnotationNode extends CSTNode {
    children?: {
        typeName?: TypeNameNode[];
        elementValuePairList?: ElementValuePairListNode[];
        StringLiteral?: IdentifierNode[];
        At?: IdentifierNode[];
        LParen?: IdentifierNode[];
        RParen?: IdentifierNode[];
    };
}

/**
 * 타입 이름 노드
 */
export interface TypeNameNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 요소 값 쌍 리스트 노드
 */
export interface ElementValuePairListNode extends CSTNode {
    children?: {
        elementValuePair?: ElementValuePairNode[];
    };
}

/**
 * 요소 값 쌍 노드
 */
export interface ElementValuePairNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
        elementValue?: ElementValueNode[];
    };
}

/**
 * 요소 값 노드
 */
export interface ElementValueNode extends CSTNode {
    children?: {
        conditionalExpression?: ConditionalExpressionNode[];
    };
}

/**
 * 조건 표현식 노드
 */
export interface ConditionalExpressionNode extends CSTNode {
    children?: {
        StringLiteral?: IdentifierNode[];
    };
}

/**
 * 타입 노드 (UnannType)
 */
export interface UnannTypeNode extends CSTNode {
    children?: {
        unannReferenceType?: UnannReferenceTypeNode[];
        unannPrimitiveType?: UnannPrimitiveTypeNode[];
    };
}

/**
 * 참조 타입 노드
 */
export interface UnannReferenceTypeNode extends CSTNode {
    children?: {
        unannClassOrInterfaceType?: UnannClassOrInterfaceTypeNode[];
    };
}

/**
 * 클래스 또는 인터페이스 타입 노드
 */
export interface UnannClassOrInterfaceTypeNode extends CSTNode {
    children?: {
        unannClassType?: UnannClassTypeNode[];
    };
}

/**
 * 클래스 타입 노드
 */
export interface UnannClassTypeNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 원시 타입 노드
 */
export interface UnannPrimitiveTypeNode extends CSTNode {
    children?: {
        IntegralType?: IntegralTypeNode[];
        FloatingPointType?: FloatingPointTypeNode[];
        Boolean?: IdentifierNode[];
    };
}

/**
 * 정수 타입 노드
 */
export interface IntegralTypeNode extends CSTNode {
    children?: {
        Byte?: IdentifierNode[];
        Short?: IdentifierNode[];
        Int?: IdentifierNode[];
        Long?: IdentifierNode[];
        Char?: IdentifierNode[];
    };
}

/**
 * 부동소수점 타입 노드
 */
export interface FloatingPointTypeNode extends CSTNode {
    children?: {
        Float?: IdentifierNode[];
        Double?: IdentifierNode[];
    };
}

/**
 * 변수 선언자 리스트 노드
 */
export interface VariableDeclaratorListNode extends CSTNode {
    children?: {
        variableDeclarator?: VariableDeclaratorNode[];
    };
}

/**
 * 변수 선언자 노드
 */
export interface VariableDeclaratorNode extends CSTNode {
    children?: {
        variableDeclaratorId?: VariableDeclaratorIdNode[];
    };
}

/**
 * 변수 선언자 ID 노드
 */
export interface VariableDeclaratorIdNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 메서드 선언 노드
 */
export interface MethodDeclarationNode extends CSTNode {
    children?: {
        methodModifier?: MethodModifierNode[];
        methodHeader?: MethodHeaderNode[];
        methodBody?: MethodBodyNode[];
    };
}

/**
 * 메서드 수정자 노드
 */
export interface MethodModifierNode extends CSTNode {
    children?: {
        annotation?: AnnotationNode[];
        Public?: IdentifierNode[];
        Private?: IdentifierNode[];
        Protected?: IdentifierNode[];
        Static?: IdentifierNode[];
    };
}

/**
 * 메서드 헤더 노드
 */
export interface MethodHeaderNode extends CSTNode {
    children?: {
        result?: ResultNode[];
        methodDeclarator?: MethodDeclaratorNode[];
    };
}

/**
 * 메서드 결과 노드
 */
export interface ResultNode extends CSTNode {
    children?: {
        unannType?: UnannTypeNode[];
        Void?: IdentifierNode[];
    };
}

/**
 * 메서드 선언자 노드
 */
export interface MethodDeclaratorNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
        formalParameterList?: FormalParameterListNode[];
    };
}

/**
 * 형식 매개변수 리스트 노드
 */
export interface FormalParameterListNode extends CSTNode {
    children?: {
        formalParameter?: FormalParameterNode[];
    };
}

/**
 * 형식 매개변수 노드
 */
export interface FormalParameterNode extends CSTNode {
    children?: {
        unannType?: UnannTypeNode[];
        variableDeclaratorId?: VariableDeclaratorIdNode[];
    };
}

/**
 * 메서드 바디 노드
 */
export interface MethodBodyNode extends CSTNode {
    children?: {
        block?: BlockNode[];
    };
}

/**
 * 블록 노드
 */
export interface BlockNode extends CSTNode {
    children?: {
        blockStatements?: BlockStatementsNode[];
    };
}

/**
 * 블록 문장들 노드
 */
export interface BlockStatementsNode extends CSTNode {
    children?: {
        blockStatement?: BlockStatementNode[];
    };
}

/**
 * 블록 문장 노드
 */
export interface BlockStatementNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

/**
 * 생성자 선언 노드
 */
export interface ConstructorDeclarationNode extends CSTNode {
    children?: {
        constructorModifier?: ConstructorModifierNode[];
        constructorDeclarator?: ConstructorDeclaratorNode[];
        constructorBody?: ConstructorBodyNode[];
    };
}

/**
 * 생성자 수정자 노드
 */
export interface ConstructorModifierNode extends CSTNode {
    children?: {
        annotation?: AnnotationNode[];
        Public?: IdentifierNode[];
        Private?: IdentifierNode[];
        Protected?: IdentifierNode[];
    };
}

/**
 * 생성자 선언자 노드
 */
export interface ConstructorDeclaratorNode extends CSTNode {
    children?: {
        simpleTypeName?: SimpleTypeNameNode[];
        formalParameterList?: FormalParameterListNode[];
    };
}

/**
 * 단순 타입 이름 노드
 */
export interface SimpleTypeNameNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 생성자 바디 노드
 */
export interface ConstructorBodyNode extends CSTNode {
    children?: {
        explicitConstructorInvocation?: ExplicitConstructorInvocationNode[];
        blockStatements?: BlockStatementsNode[];
    };
}

/**
 * 명시적 생성자 호출 노드
 */
export interface ExplicitConstructorInvocationNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

/**
 * 인터페이스 선언 노드
 */
export interface InterfaceDeclarationNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

/**
 * 슈퍼클래스 노드
 */
export interface SuperclassNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

/**
 * 슈퍼인터페이스들 노드
 */
export interface SuperinterfacesNode extends CSTNode {
    children?: {
        interfaceTypeList?: InterfaceTypeListNode[];
    };
}

/**
 * 인터페이스 타입 리스트 노드
 */
export interface InterfaceTypeListNode extends CSTNode {
    children?: {
        interfaceType?: InterfaceTypeNode[];
    };
}

/**
 * 인터페이스 타입 노드
 */
export interface InterfaceTypeNode extends CSTNode {
    children?: {
        classType?: ClassTypeNode[];
        Identifier?: IdentifierNode[];
    };
}

/**
 * 클래스 타입 노드 (인터페이스에서 사용)
 */
export interface ClassTypeNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 클래스 수정자 노드
 */
export interface ClassModifierNode extends CSTNode {
    children?: {
        annotation?: AnnotationNode[];
        Public?: IdentifierNode[];
        Private?: IdentifierNode[];
        Protected?: IdentifierNode[];
        Abstract?: IdentifierNode[];
        Final?: IdentifierNode[];
        Static?: IdentifierNode[];
    };
}

/**
 * 타입 식별자 노드
 */
export interface TypeIdentifierNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

/**
 * 에러 처리용 타입 유니온 (Phase 4: 타입 안전성)
 */
export type ParseError = Error | JavaParsingError | CSTParsingError | AnnotationParsingError | FieldExtractionError | ClassExtractionError | PositionCalculationError;

/**
 * 문자열 또는 undefined 타입
 */
export type StringOrUndefined = string | undefined;

/**
 * 숫자 또는 undefined 타입
 */
export type NumberOrUndefined = number | undefined; 