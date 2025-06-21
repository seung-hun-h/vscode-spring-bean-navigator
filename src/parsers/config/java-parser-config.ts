/**
 * Java 파서 관련 설정 상수들
 */
export const JAVA_PARSER_CONFIG = {
    /**
     * Spring 어노테이션 목록
     */
    SPRING_ANNOTATIONS: new Set([
        'Component', 'Service', 'Repository', 'Controller', 'RestController',
        'Configuration', 'Bean', 'Autowired'
    ]),

    /**
     * 인터페이스 검색 최대 깊이
     */
    MAX_INTERFACE_SEARCH_DEPTH: 5,

    /**
     * 위치 정보 계산 실패 시 fallback 값
     */
    POSITION_FALLBACK: {
        line: 0,
        character: 0
    },

    /**
     * 범위 정보 계산 실패 시 fallback 값
     */
    RANGE_FALLBACK: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 }
    },

    /**
     * 필드 위치 검색 시 최대 라인 수
     */
    MAX_FIELD_SEARCH_LINES: 5,

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
    INTERFACE_NAME_REGEX: /^[A-Z][a-zA-Z0-9_]*$/
}; 