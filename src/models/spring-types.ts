import * as vscode from 'vscode';

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
    VALUE = 'Value', // Spring @Value annotation
    LOMBOK_REQUIRED_ARGS_CONSTRUCTOR = 'RequiredArgsConstructor',
    LOMBOK_ALL_ARGS_CONSTRUCTOR = 'AllArgsConstructor',
    LOMBOK_NO_ARGS_CONSTRUCTOR = 'NoArgsConstructor',
    LOMBOK_DATA = 'Data',
    LOMBOK_VALUE = 'LombokValue', // Distinguished from Spring @Value
    LOMBOK_SLF4J = 'Slf4j',
    LOMBOK_NON_NULL = 'NonNull'
}

/**
 * Injection types for different dependency injection patterns
 */
export enum InjectionType {
    FIELD = 'field',           // @Autowired field injection
    CONSTRUCTOR = 'constructor', // Constructor injection
    SETTER = 'setter',         // Setter injection
    LOMBOK = 'lombok',         // Lombok-based injection
    CONSTRUCTOR_LOMBOK = 'constructor_lombok', // Lombok constructor injection
    BEAN_METHOD = 'bean_method' // @Bean method parameter injection
}

/**
 * Base interface for position information
 */
export interface BasePositionInfo {
    /** Declaration position */
    position: vscode.Position;
    /** Range (optional for backward compatibility) */
    range?: vscode.Range;
}

/**
 * Annotation information parsed from Java files
 */
export interface AnnotationInfo {
    /** Annotation name */
    name: string;
    /** Annotation type */
    type: SpringAnnotationType;
    /** Line number where annotation is located (0-based) */
    line: number;
    /** Column number where annotation is located (0-based) */
    column: number;
    /** Annotation parameters (e.g., @Service("userService")) */
    parameters?: Map<string, string>;
}

/**
 * Java field information
 */
export interface FieldInfo extends BasePositionInfo {
    /** Field name */
    name: string;
    /** Field type (e.g., UserRepository, List<User>) */
    type: string;
    /** Field range */
    range: vscode.Range;
    /** Annotations attached to the field */
    annotations: AnnotationInfo[];
    /** Access modifier (public, private, protected) */
    visibility?: string;
    /** Whether field has final keyword */
    isFinal?: boolean;
    /** Whether field has static keyword */
    isStatic?: boolean;
}

/**
 * Parameter information for constructors and methods
 */
export interface ParameterInfo {
    /** Parameter name */
    name: string;
    /** Parameter type (e.g., UserRepository, List<User>, Optional<Service>) */
    type: string;
    /** Parameter declaration position (optional for simpler implementation) */
    position?: vscode.Position;
    /** Parameter range (optional) */
    range?: vscode.Range;
    /** Parameter order (0-based, optional) */
    index?: number;
}

/**
 * Constructor information for Spring constructor injection
 */
export interface ConstructorInfo extends BasePositionInfo {
    /** Constructor parameters */
    parameters: ParameterInfo[];
    /** Constructor range */
    range: vscode.Range;
    /** Whether constructor has @Autowired annotation */
    hasAutowiredAnnotation: boolean;
    /** Access modifier (public, private, protected) */
    visibility?: string;
}

/**
 * Method information for Spring setter injection
 */
export interface MethodInfo extends BasePositionInfo {
    /** Method name */
    name: string;
    /** Method parameters */
    parameters: ParameterInfo[];
    /** Method range */
    range: vscode.Range;
    /** Annotations attached to the method */
    annotations: AnnotationInfo[];
    /** Whether method is a setter (setXxx pattern + 1 parameter) */
    isSetterMethod: boolean;
    /** Access modifier (public, private, protected) */
    visibility?: string;
    /** Return type */
    returnType?: string;
}

/**
 * Java class information
 */
export interface ClassInfo extends BasePositionInfo {
    /** Class name */
    name: string;
    /** Package name */
    packageName?: string;
    /** Fully qualified class name (including package) */
    fullyQualifiedName: string;
    /** File URI where class is defined */
    fileUri: vscode.Uri;
    /** Class range */
    range: vscode.Range;
    /** Annotations attached to the class */
    annotations: AnnotationInfo[];
    /** Class fields */
    fields: FieldInfo[];
    /** Class constructors (optional) */
    constructors?: ConstructorInfo[];
    /** Class methods (optional) */
    methods?: MethodInfo[];
    /** Import statements */
    imports: string[];
}

/**
 * Spring Bean definition information
 */
export interface BeanDefinition {
    /** Bean name (default: class name with first letter lowercase) */
    name: string;
    /** Bean type (class name or interface name) */
    type: string;
    /** Fully qualified name of the bean implementation class */
    implementationClass: string;
    /** File URI where bean is defined */
    fileUri: vscode.Uri;
    /** Position where bean is defined */
    position: vscode.Position;
    /** Bean definition type */
    definitionType: 'class' | 'method'; // Class-level (@Component, etc.) or method-level (@Bean)
    /** Annotation that defines the bean */
    annotation: SpringAnnotationType;
    
    // Convenience properties for backward compatibility
    beanName: string;
    className: string;
    annotationType: SpringAnnotationType;
    fullyQualifiedName: string;
}

/**
 * Dependency injection information
 */
export interface InjectionInfo {
    /** Type to be injected */
    targetType: string;
    /** Injection method */
    injectionType: InjectionType;
    /** Position where injection occurs */
    position: vscode.Position;
    /** Range where injection occurs */
    range: vscode.Range;
    /** Name of the field or parameter being injected */
    targetName: string;
    /** Resolved bean definition (if available) */
    resolvedBean?: BeanDefinition;
    /** Multiple bean candidates (if applicable) */
    candidateBeans?: BeanDefinition[];
}

/**
 * Java file parsing result
 */
export interface JavaFileParseResult {
    /** Parsed class information */
    classes: ClassInfo[];
    /** Discovered bean definitions */
    beanDefinitions: BeanDefinition[];
    /** Discovered injection information */
    injections: InjectionInfo[];
    /** Parsing errors */
    errors: string[];
}

/**
 * Bean resolution result
 */
export interface BeanResolutionResult {
    /** Resolved bean (if unique candidate exists) */
    resolved?: BeanDefinition;
    /** Possible bean candidates */
    candidates: BeanDefinition[];
}

/**
 * QuickPick item for bean selection
 */
export interface BeanQuickPickItem extends vscode.QuickPickItem {
    /** Associated bean definition */
    bean: BeanDefinition;
}

/**
 * Bean display information
 */
export interface BeanDisplayInfo {
    /** Class name (without package) */
    className: string;
    /** Package name */
    packageName: string;
}

/**
 * Virtual constructor information for Lombok simulation
 * Simulates constructors that Lombok annotations will generate at compile time
 */
export interface VirtualConstructorInfo extends BasePositionInfo {
    /** Virtual constructor parameters */
    parameters: ParameterInfo[];
    /** Constructor range */
    range: vscode.Range;
    /** Lombok annotation type that generates this constructor */
    lombokAnnotationType: SpringAnnotationType;
    /** Annotation source (RequiredArgs, AllArgs, Data, etc.) */
    annotationSource: string;
    /** Access modifier (public by default) */
    visibility: string;
    /** Indicates this is a simulated constructor */
    isVirtual: true;
}

/**
 * Lombok-specific annotation information
 */
export interface LombokAnnotationInfo extends AnnotationInfo {
    /** Lombok configuration parameters (access, staticName, etc.) */
    lombokConfig?: Map<string, string>;
    /** Virtual constructor information to be generated */
    virtualConstructor?: VirtualConstructorInfo;
}

/**
 * Lombok field analysis result for virtual constructor generation
 */
export interface LombokFieldAnalysis {
    /** Fields to be included in @RequiredArgsConstructor (final + @NonNull) */
    requiredArgsFields: FieldInfo[];
    /** Fields to be included in @AllArgsConstructor (excluding static) */
    allArgsFields: FieldInfo[];
    /** Analyzed class information */
    classInfo: ClassInfo;
}

/**
 * Lombok simulation result
 * Contains the results of Lombok annotation analysis and virtual constructor generation
 * 
 * Design principles:
 * - Eliminate duplication: lombokAnnotations removed as it duplicates ClassInfo.annotations
 * - Consistency: Both virtualConstructors and fieldAnalysis use array structure
 * - Extensibility: Array structure supports multiple classes or analysis types
 */
export interface LombokSimulationResult {
    /** Generated virtual constructors */
    virtualConstructors: VirtualConstructorInfo[];
    /** Field analysis results (per class or analysis type) */
    fieldAnalysis: LombokFieldAnalysis[];
    /** Whether simulation was successful */
    isSuccess: boolean;
    /** Simulation error messages */
    errors?: string[];
}

/**
 * CST node type definitions for improved type safety
 */

/**
 * Base CST node interface
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

export interface CompilationUnitNode extends CSTNode {
    children?: {
        ordinaryCompilationUnit?: OrdinaryCompilationUnitNode[];
    };
}

export interface OrdinaryCompilationUnitNode extends CSTNode {
    children?: {
        packageDeclaration?: PackageDeclarationNode[];
        importDeclaration?: ImportDeclarationNode[];
        typeDeclaration?: TypeDeclarationNode[];
    };
}

export interface PackageDeclarationNode extends CSTNode {
    children?: {
        packageOrTypeName?: PackageOrTypeNameNode[];
        Identifier?: IdentifierNode[];
        Package?: IdentifierNode[];
        Dot?: IdentifierNode[];
        Semicolon?: IdentifierNode[];
    };
}

export interface PackageOrTypeNameNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

export interface IdentifierNode extends CSTNode {
    image: string;
}

export interface ImportDeclarationNode extends CSTNode {
    children?: {
        packageOrTypeName?: PackageOrTypeNameNode[];
        Identifier?: IdentifierNode[];
        Star?: IdentifierNode[];
        Import?: IdentifierNode[];
        Semicolon?: IdentifierNode[];
    };
}

export interface TypeDeclarationNode extends CSTNode {
    children?: {
        classDeclaration?: ClassDeclarationNode[];
        interfaceDeclaration?: InterfaceDeclarationNode[];
    };
}

export interface ClassDeclarationNode extends CSTNode {
    children?: {
        classModifier?: ClassModifierNode[];
        normalClassDeclaration?: NormalClassDeclarationNode[];
    };
}

export interface NormalClassDeclarationNode extends CSTNode {
    children?: {
        typeIdentifier?: TypeIdentifierNode[];
        classBody?: ClassBodyNode[];
        Identifier?: IdentifierNode[];
        superclass?: SuperclassNode[];
        superinterfaces?: SuperinterfacesNode[];
    };
}

export interface ClassBodyNode extends CSTNode {
    children?: {
        classBodyDeclaration?: ClassBodyDeclarationNode[];
    };
}

export interface ClassBodyDeclarationNode extends CSTNode {
    children?: {
        classMemberDeclaration?: ClassMemberDeclarationNode[];
        fieldDeclaration?: FieldDeclarationNode[];
        methodDeclaration?: MethodDeclarationNode[];
        constructorDeclaration?: ConstructorDeclarationNode[];
    };
}

export interface ClassMemberDeclarationNode extends CSTNode {
    children?: {
        fieldDeclaration?: FieldDeclarationNode[];
        methodDeclaration?: MethodDeclarationNode[];
        constructorDeclaration?: ConstructorDeclarationNode[];
    };
}

export interface FieldDeclarationNode extends CSTNode {
    children?: {
        fieldModifier?: FieldModifierNode[];
        unannType?: UnannTypeNode[];
        variableDeclaratorList?: VariableDeclaratorListNode[];
    };
}

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

export interface TypeNameNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

export interface ElementValuePairListNode extends CSTNode {
    children?: {
        elementValuePair?: ElementValuePairNode[];
    };
}

export interface ElementValuePairNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
        elementValue?: ElementValueNode[];
    };
}

export interface ElementValueNode extends CSTNode {
    children?: {
        conditionalExpression?: ConditionalExpressionNode[];
    };
}

export interface ConditionalExpressionNode extends CSTNode {
    children?: {
        StringLiteral?: IdentifierNode[];
    };
}

/**
 * Type node (UnannType)
 */
export interface UnannTypeNode extends CSTNode {
    children?: {
        unannReferenceType?: UnannReferenceTypeNode[];
        unannPrimitiveType?: UnannPrimitiveTypeNode[];
    };
}

export interface UnannReferenceTypeNode extends CSTNode {
    children?: {
        unannClassOrInterfaceType?: UnannClassOrInterfaceTypeNode[];
    };
}

export interface UnannClassOrInterfaceTypeNode extends CSTNode {
    children?: {
        unannClassType?: UnannClassTypeNode[];
    };
}

export interface UnannClassTypeNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

export interface UnannPrimitiveTypeNode extends CSTNode {
    children?: {
        IntegralType?: IntegralTypeNode[];
        FloatingPointType?: FloatingPointTypeNode[];
        Boolean?: IdentifierNode[];
    };
}

export interface IntegralTypeNode extends CSTNode {
    children?: {
        Byte?: IdentifierNode[];
        Short?: IdentifierNode[];
        Int?: IdentifierNode[];
        Long?: IdentifierNode[];
        Char?: IdentifierNode[];
    };
}

export interface FloatingPointTypeNode extends CSTNode {
    children?: {
        Float?: IdentifierNode[];
        Double?: IdentifierNode[];
    };
}

export interface VariableDeclaratorListNode extends CSTNode {
    children?: {
        variableDeclarator?: VariableDeclaratorNode[];
    };
}

export interface VariableDeclaratorNode extends CSTNode {
    children?: {
        variableDeclaratorId?: VariableDeclaratorIdNode[];
    };
}

export interface VariableDeclaratorIdNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

export interface MethodDeclarationNode extends CSTNode {
    children?: {
        methodModifier?: MethodModifierNode[];
        methodHeader?: MethodHeaderNode[];
        methodBody?: MethodBodyNode[];
    };
}

export interface MethodModifierNode extends CSTNode {
    children?: {
        annotation?: AnnotationNode[];
        Public?: IdentifierNode[];
        Private?: IdentifierNode[];
        Protected?: IdentifierNode[];
        Static?: IdentifierNode[];
    };
}

export interface MethodHeaderNode extends CSTNode {
    children?: {
        result?: ResultNode[];
        methodDeclarator?: MethodDeclaratorNode[];
    };
}

export interface ResultNode extends CSTNode {
    children?: {
        unannType?: UnannTypeNode[];
        Void?: IdentifierNode[];
    };
}

export interface MethodDeclaratorNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
        formalParameterList?: FormalParameterListNode[];
    };
}

export interface FormalParameterListNode extends CSTNode {
    children?: {
        formalParameter?: FormalParameterNode[];
    };
}

export interface FormalParameterNode extends CSTNode {
    children?: {
        unannType?: UnannTypeNode[];
        variableDeclaratorId?: VariableDeclaratorIdNode[];
    };
}

export interface MethodBodyNode extends CSTNode {
    children?: {
        block?: BlockNode[];
    };
}

export interface BlockNode extends CSTNode {
    children?: {
        blockStatements?: BlockStatementsNode[];
    };
}

export interface BlockStatementsNode extends CSTNode {
    children?: {
        blockStatement?: BlockStatementNode[];
    };
}

export interface BlockStatementNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

export interface ConstructorDeclarationNode extends CSTNode {
    children?: {
        constructorModifier?: ConstructorModifierNode[];
        constructorDeclarator?: ConstructorDeclaratorNode[];
        constructorBody?: ConstructorBodyNode[];
    };
}

export interface ConstructorModifierNode extends CSTNode {
    children?: {
        annotation?: AnnotationNode[];
        Public?: IdentifierNode[];
        Private?: IdentifierNode[];
        Protected?: IdentifierNode[];
    };
}

export interface ConstructorDeclaratorNode extends CSTNode {
    children?: {
        simpleTypeName?: SimpleTypeNameNode[];
        formalParameterList?: FormalParameterListNode[];
    };
}

export interface SimpleTypeNameNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

export interface ConstructorBodyNode extends CSTNode {
    children?: {
        explicitConstructorInvocation?: ExplicitConstructorInvocationNode[];
        blockStatements?: BlockStatementsNode[];
    };
}

export interface ExplicitConstructorInvocationNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

export interface InterfaceDeclarationNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

export interface SuperclassNode extends CSTNode {
    children?: Record<string, CSTNode[]>;
}

export interface SuperinterfacesNode extends CSTNode {
    children?: {
        interfaceTypeList?: InterfaceTypeListNode[];
    };
}

export interface InterfaceTypeListNode extends CSTNode {
    children?: {
        interfaceType?: InterfaceTypeNode[];
    };
}

export interface InterfaceTypeNode extends CSTNode {
    children?: {
        classType?: ClassTypeNode[];
        Identifier?: IdentifierNode[];
    };
}

export interface ClassTypeNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}

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

export interface TypeIdentifierNode extends CSTNode {
    children?: {
        Identifier?: IdentifierNode[];
    };
}