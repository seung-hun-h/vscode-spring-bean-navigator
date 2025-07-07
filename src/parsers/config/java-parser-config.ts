/**
 * Java parser configuration constants
 */

/**
 * Spring Framework annotation names
 */
export const SPRING_ANNOTATION_NAMES = {
    // Core Spring Annotations
    COMPONENT: 'Component',
    SERVICE: 'Service', 
    REPOSITORY: 'Repository',
    CONTROLLER: 'Controller',
    REST_CONTROLLER: 'RestController',
    CONFIGURATION: 'Configuration',
    BEAN: 'Bean',
    AUTOWIRED: 'Autowired',
    QUALIFIER: 'Qualifier',
    VALUE: 'Value', // Spring @Value
    
    // Lombok Annotations
    REQUIRED_ARGS_CONSTRUCTOR: 'RequiredArgsConstructor',
    ALL_ARGS_CONSTRUCTOR: 'AllArgsConstructor',
    NO_ARGS_CONSTRUCTOR: 'NoArgsConstructor',
    DATA: 'Data',
    LOMBOK_VALUE: 'Value', // Lombok @Value
    SLF4J: 'Slf4j',
    NON_NULL: 'NonNull',
    NONNULL: 'Nonnull' // JSR-305
};

/**
 * Spring Framework annotation package paths
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
 * Constants used for code analysis
 */
export const PARSING_CONSTANTS = {
    /**
     * Maximum lines to search for annotations
     */
    ANNOTATION_LOOKUP_MAX_LINES: 5,
    
    /**
     * Maximum range for setter method search
     */
    SETTER_METHOD_SEARCH_RANGE: 3,
    
    /**
     * Maximum length for error messages
     */
    ERROR_MESSAGE_MAX_LENGTH: 100,
    
    /**
     * Maximum length for parameter strings
     */
    PARAMETER_STRING_MAX_LENGTH: 50,
    
    MIN_ARRAY_INDEX: 0,
    
    SETTER_PREFIX_LENGTH: 3, // "set".length
    
    /**
     * Default position values (0-based)
     */
    DEFAULT_POSITION: {
        LINE: 0,
        COLUMN: 0,
        CHARACTER: 0
    },
    
    /**
     * Array index offsets
     */
    ARRAY_OFFSET: {
        FIRST: 0,
        SECOND: 1,
        PREV: -1,
        NEXT: 1
    }
} as const;

/**
 * Java parser configuration
 */
export const JAVA_PARSER_CONFIG = {
    /**
     * Set of Spring-related annotations to detect
     * Includes Lombok annotations
     */
    SPRING_ANNOTATIONS: new Set([
        // Core Spring Framework annotations
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
        
        // Lombok annotations
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
     * Fallback values for position calculation failures
     */
    POSITION_FALLBACK: {
        line: PARSING_CONSTANTS.DEFAULT_POSITION.LINE,
        character: PARSING_CONSTANTS.DEFAULT_POSITION.CHARACTER
    },

    /**
     * Maximum lines to search for field positions
     */
    MAX_FIELD_SEARCH_LINES: PARSING_CONSTANTS.ANNOTATION_LOOKUP_MAX_LINES,

    /**
     * Java keywords and syntax symbols for interface filtering
     */
    JAVA_KEYWORDS_AND_SYMBOLS: new Set([
        'Implements', 'implements', 'extends', 'Extends',
        ',', '<', '>', '(', ')', '[', ']', '{', '}',
        'public', 'private', 'protected', 'static', 'final',
        'class', 'interface', 'enum', 'package', 'import'
    ]),

    /**
     * Regular expression for validating interface names (Java naming conventions)
     */
    INTERFACE_NAME_REGEX: /^[A-Z][a-zA-Z0-9_]*$/,
} as const; 