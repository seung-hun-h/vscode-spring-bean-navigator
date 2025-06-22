/**
 * Java 파서 관련 설정 상수들
 */

/**
 * Spring Framework 어노테이션 이름 상수들
 */
export const SPRING_ANNOTATION_NAMES = {
    // Core Spring Annotations
    COMPONENT: 'Component' as string,
    SERVICE: 'Service' as string, 
    REPOSITORY: 'Repository' as string,
    CONTROLLER: 'Controller' as string,
    REST_CONTROLLER: 'RestController' as string,
    CONFIGURATION: 'Configuration' as string,
    BEAN: 'Bean' as string,
    AUTOWIRED: 'Autowired' as string,
    QUALIFIER: 'Qualifier' as string,
    VALUE: 'Value' as string, // Spring @Value
    
    // Lombok Annotations
    REQUIRED_ARGS_CONSTRUCTOR: 'RequiredArgsConstructor' as string,
    ALL_ARGS_CONSTRUCTOR: 'AllArgsConstructor' as string,
    NO_ARGS_CONSTRUCTOR: 'NoArgsConstructor' as string,
    DATA: 'Data' as string,
    LOMBOK_VALUE: 'Value' as string, // Lombok @Value
    SLF4J: 'Slf4j' as string,
    NON_NULL: 'NonNull' as string,
    NONNULL: 'Nonnull' as string // JSR-305
};

/**
 * Spring Framework 어노테이션 패키지 경로 상수들
 */
export const SPRING_ANNOTATION_PACKAGES = {
    AUTOWIRED_FULL: 'org.springframework.beans.factory.annotation.Autowired',
    QUALIFIER_FULL: 'org.springframework.beans.factory.annotation.Qualifier',
    VALUE_FULL: 'org.springframework.beans.factory.annotation.Value',
    LOMBOK_REQUIRED_ARGS_CONSTRUCTOR_FULL: 'lombok.RequiredArgsConstructor',
    LOMBOK_ALL_ARGS_CONSTRUCTOR_FULL: 'lombok.AllArgsConstructor',
    LOMBOK_NON_NULL_FULL: 'lombok.NonNull',
    LOMBOK_VALUE_FULL: 'lombok.Value',
    SPRING_NON_NULL_FULL: 'org.springframework.lang.NonNull',
    JAVAX_NONNULL_FULL: 'javax.annotation.Nonnull'
} as const;

/**
 * 코드 분석 시 사용되는 상수들 (Phase 4: 매직 넘버 제거)
 */
export const PARSING_CONSTANTS = {
    /**
     * 어노테이션 탐색 시 최대 라인 수
     */
    ANNOTATION_LOOKUP_MAX_LINES: 5,
    
    /**
     * Setter 메서드 검색 시 다음 라인까지의 최대 범위
     */
    SETTER_METHOD_SEARCH_RANGE: 3,
    
    /**
     * 에러 로깅 시 문자열 자르기 최대 길이
     */
    ERROR_MESSAGE_MAX_LENGTH: 100,
    
    /**
     * 매개변수 문자열 자르기 최대 길이  
     */
    PARAMETER_STRING_MAX_LENGTH: 50,
    
    /**
     * 배열/리스트 최소 인덱스
     */
    MIN_ARRAY_INDEX: 0,
    
    /**
     * 단일 요소 배열 길이
     */
    SINGLE_ELEMENT_LENGTH: 1,
    
    /**
     * 클래스명 최소 길이 (단일 문자)
     */
    MIN_CLASS_NAME_LENGTH: 1,
    
    /**
     * Setter 메서드명 최소 길이 ("set" + 1글자)
     */
    MIN_SETTER_NAME_LENGTH: 4, // "setX"
    
    /**
     * Setter 메서드명 접두사 길이
     */
    SETTER_PREFIX_LENGTH: 3, // "set".length
    
    /**
     * 기본 위치값 (0-based)
     */
    DEFAULT_POSITION: {
        LINE: 0,
        COLUMN: 0,
        CHARACTER: 0
    },
    
    /**
     * 배열 인덱스 오프셋
     */
    ARRAY_OFFSET: {
        FIRST: 0,
        SECOND: 1,
        PREV: -1,
        NEXT: 1
    }
} as const;

/**
 * Java 파서 설정
 */
export const JAVA_PARSER_CONFIG = {
    /**
     * 감지할 Spring 관련 어노테이션들의 Set
     * Lombok 어노테이션들도 포함됨
     */
    SPRING_ANNOTATIONS: new Set([
        // Core Spring Framework 어노테이션
        SPRING_ANNOTATION_NAMES.COMPONENT,
        SPRING_ANNOTATION_NAMES.SERVICE,
        SPRING_ANNOTATION_NAMES.REPOSITORY,
        SPRING_ANNOTATION_NAMES.CONTROLLER,
        SPRING_ANNOTATION_NAMES.REST_CONTROLLER,
        SPRING_ANNOTATION_NAMES.CONFIGURATION,
        SPRING_ANNOTATION_NAMES.BEAN,
        SPRING_ANNOTATION_NAMES.AUTOWIRED,
        SPRING_ANNOTATION_NAMES.QUALIFIER,
        SPRING_ANNOTATION_NAMES.VALUE,
        
        // Lombok 어노테이션들
        SPRING_ANNOTATION_NAMES.REQUIRED_ARGS_CONSTRUCTOR,
        SPRING_ANNOTATION_NAMES.ALL_ARGS_CONSTRUCTOR,
        SPRING_ANNOTATION_NAMES.NO_ARGS_CONSTRUCTOR,
        SPRING_ANNOTATION_NAMES.DATA,
        SPRING_ANNOTATION_NAMES.LOMBOK_VALUE,
        SPRING_ANNOTATION_NAMES.SLF4J,
        SPRING_ANNOTATION_NAMES.NON_NULL,
        SPRING_ANNOTATION_NAMES.NONNULL
    ]),

    /**
     * 인터페이스 검색 최대 깊이
     */
    MAX_INTERFACE_SEARCH_DEPTH: 5,

    /**
     * 위치 정보 계산 실패 시 fallback 값
     */
    POSITION_FALLBACK: {
        line: PARSING_CONSTANTS.DEFAULT_POSITION.LINE,
        character: PARSING_CONSTANTS.DEFAULT_POSITION.CHARACTER
    },

    /**
     * 범위 정보 계산 실패 시 fallback 값
     */
    RANGE_FALLBACK: {
        start: { 
            line: PARSING_CONSTANTS.DEFAULT_POSITION.LINE, 
            character: PARSING_CONSTANTS.DEFAULT_POSITION.CHARACTER 
        },
        end: { 
            line: PARSING_CONSTANTS.DEFAULT_POSITION.LINE, 
            character: PARSING_CONSTANTS.DEFAULT_POSITION.CHARACTER 
        }
    },

    /**
     * 필드 위치 검색 시 최대 라인 수
     */
    MAX_FIELD_SEARCH_LINES: PARSING_CONSTANTS.ANNOTATION_LOOKUP_MAX_LINES,

    /**
     * Java 키워드 및 구문 기호 (인터페이스 필터링용)
     */
    JAVA_KEYWORDS_AND_SYMBOLS: new Set([
        'Implements', 'implements', 'extends', 'Extends',
        ',', '<', '>', '(', ')', '[', ']', '{', '}',
        'public', 'private', 'protected', 'static', 'final',
        'class', 'interface', 'enum', 'package', 'import'
    ]),

    /**
     * 인터페이스 이름 유효성 검사 정규식 (Java 명명 규칙)
     */
    INTERFACE_NAME_REGEX: /^[A-Z][a-zA-Z0-9_]*$/,

    /**
     * 파싱할 Java 파일 확장자들
     */
    JAVA_FILE_EXTENSIONS: ['.java'] as const,

    /**
     * 무시할 디렉토리 패턴들
     */
    IGNORE_PATTERNS: [
        '**/target/**',
        '**/build/**',
        '**/.gradle/**',
        '**/node_modules/**',
        '**/.git/**'
    ] as const
} as const; 