import * as vscode from 'vscode';

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
    AUTOWIRED = 'Autowired'
}

/**
 * 주입 타입 (향후 Phase 2, 3에서 확장)
 */
export enum InjectionType {
    FIELD = 'field',           // @Autowired 필드 주입
    CONSTRUCTOR = 'constructor', // 생성자 주입 (Phase 2)
    SETTER = 'setter',         // Setter 주입 (Phase 2)
    LOMBOK = 'lombok'          // Lombok 기반 주입 (Phase 3)
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
export interface FieldInfo {
    /** 필드 이름 */
    name: string;
    /** 필드 타입 (예: UserRepository, List<User>) */
    type: string;
    /** 필드가 선언된 위치 */
    position: vscode.Position;
    /** 필드 범위 */
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
 * Java 클래스 정보
 */
export interface ClassInfo {
    /** 클래스 이름 */
    name: string;
    /** 패키지 이름 */
    packageName?: string;
    /** 완전한 클래스 이름 (패키지 포함) */
    fullyQualifiedName: string;
    /** 클래스가 정의된 파일 URI */
    fileUri: vscode.Uri;
    /** 클래스가 선언된 위치 */
    position: vscode.Position;
    /** 클래스 범위 */
    range: vscode.Range;
    /** 클래스에 붙은 어노테이션들 */
    annotations: AnnotationInfo[];
    /** 클래스 필드들 */
    fields: FieldInfo[];
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