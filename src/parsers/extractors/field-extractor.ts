import { 
    FieldInfo, 
    AnnotationInfo, 
    ClassDeclarationNode, 
    FieldDeclarationNode, 
    CSTNode 
} from '../../models/spring-types';
import { ErrorHandler, FieldExtractionError } from '../core/parser-errors';
import { PositionCalculator } from '../core/position-calculator';
import { AnnotationParser } from './annotation-parser';

export class FieldExtractor {
    private readonly positionCalculator: PositionCalculator;
    private readonly annotationParser: AnnotationParser;
    // Performance optimization: exploration cache
    private exploredNodes = new Set<CSTNode>();

    constructor(
        positionCalculator: PositionCalculator,
        annotationParser: AnnotationParser
    ) {
        this.positionCalculator = positionCalculator;
        this.annotationParser = annotationParser;
    }

    /**
     * Extracts fields from a class (performance optimized version).
     * 
     * @param classDecl - Class declaration CST node
     * @param lines - File content lines
     * @returns Array of extracted field information
     * 
     * @example
     * This method can handle various field declaration structures:
     * 
     * 1. Standard field declarations:
     * ```java
     * public class MyClass {
     *     private String name;
     *     protected int count;
     *     public static final String CONSTANT = "value";
     * }
     * ```
     * 
     * 2. Fields with annotations:
     * ```java
     * public class Service {
     *     @Autowired
     *     private UserRepository repository;
     *     
     *     @Value("${app.config}")
     *     private String config;
     * }
     * ```
     * 
     * 3. Generic type fields:
     * ```java
     * public class Container {
     *     private List<String> items;
     *     private Map<String, List<Integer>> complexMap;
     *     private Optional<User> currentUser;
     * }
     * ```
     * 
     * 4. Multiple fields in one declaration:
     * ```java
     * public class Point {
     *     private int x, y, z;  // Extracts x, y, z separately
     * }
     * ```
     * 
     * 5. Interface constants:
     * ```java
     * public interface Constants {
     *     String API_KEY = "xyz";  // Implicit public static final
     *     int MAX_SIZE = 100;
     * }
     * ```
     * 
     * 6. Enum fields:
     * ```java
     * public enum Status {
     *     ACTIVE, INACTIVE;
     *     private String description;  // Instance field
     *     public static final int CODE = 200;  // Static field
     * }
     * ```
     * 
     * 7. Nested class fields:
     * ```java
     * public class Outer {
     *     private String outerField;
     *     
     *     class Inner {
     *         private String innerField;
     *         
     *         class DeepInner {
     *             private String deepField;
     *         }
     *     }
     * }
     * ```
     * 
     * 8. Record fields (implicit):
     * ```java
     * public record Person(String name, int age) {
     *     private static final Logger log = getLogger();  // Static fields in records
     * }
     * ```
     * 
     * 9. Fields with complex modifiers:
     * ```java
     * public class Advanced {
     *     private volatile transient Map<String, Object> cache;
     *     protected final AtomicInteger counter = new AtomicInteger(0);
     * }
     * ```
     */
    public extractFields(classDecl: ClassDeclarationNode, lines: string[]): FieldInfo[] {
        this.exploredNodes.clear();
        
        // Performance optimization: Use Map for efficient deduplication
        const fieldMap = new Map<string, FieldInfo>();
        
        try {
            // Step 1: Search fields in standard structure
            this.extractFieldsFromStandardStructure(classDecl, lines, fieldMap);
            
            // Step 2: Recursive search for any missed fields
            this.extractFieldsRecursively(classDecl, lines, fieldMap);
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to extract fields',
                undefined,
                'Field extraction context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return Array.from(fieldMap.values());
    }

    /**
     * Extracts fields from standard class structure.
     * 
     * @param classDecl - Class declaration CST node
     * @param lines - File content lines
     * @param fieldMap - Map to store fields (for deduplication)
     */
    private extractFieldsFromStandardStructure(classDecl: ClassDeclarationNode, lines: string[], fieldMap: Map<string, FieldInfo>): void {
        try {
            const classBody = classDecl.children?.normalClassDeclaration?.[0]?.children?.classBody?.[0];
            const classMemberDeclarations = classBody?.children?.classBodyDeclaration;
            
            if (classMemberDeclarations) {
                for (const memberDecl of classMemberDeclarations) {
                    // Standard field declaration structure
                    if (memberDecl.children?.classMemberDeclaration?.[0]?.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.classMemberDeclaration[0].children.fieldDeclaration[0];
                        this.processFieldDeclaration(fieldDecl, lines, fieldMap);
                    }
                    
                    // Direct fieldDeclaration (structure variation)
                    else if (memberDecl.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.fieldDeclaration[0];
                        this.processFieldDeclaration(fieldDecl, lines, fieldMap);
                    }
                }
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to extract fields from standard structure',
                undefined,
                'Standard structure extraction',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
    }

    /**
     * Recursively finds field declarations (performance optimized with cache).
     * 
     * @param node - CST node to explore
     * @param lines - File content lines
     * @param fieldMap - Map to store fields (for deduplication)
     */
    private extractFieldsRecursively(node: CSTNode, lines: string[], fieldMap: Map<string, FieldInfo>): void {
        if (!node || this.exploredNodes.has(node)) {
            return;
        }
        
        this.exploredNodes.add(node);
        
        try {
            if (node.name === 'fieldDeclaration' || (node.children && this.isFieldDeclarationNode(node))) {
                this.processFieldDeclaration(node, lines, fieldMap);
            }
            
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            this.extractFieldsRecursively(child, lines, fieldMap);
                        }
                    }
                }
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed during recursive field search',
                undefined,
                'Recursive field search context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
    }

    /**
     * Processes field declaration and adds to map (performance: O(1) duplicate check).
     * 
     * @param fieldDecl - Field declaration CST node
     * @param lines - File content lines
     * @param fieldMap - Map to store fields
     */
    private processFieldDeclaration(fieldDecl: FieldDeclarationNode, lines: string[], fieldMap: Map<string, FieldInfo>): void {
        try {
            const fieldInfo = this.parseFieldDeclaration(fieldDecl, lines);
            if (fieldInfo && !fieldMap.has(fieldInfo.name)) {
                fieldMap.set(fieldInfo.name, fieldInfo);
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to process field declaration',
                undefined,
                'Field declaration processing',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
    }

    /**
     * Checks if node is a fieldDeclaration node.
     * 
     * @param node - Node to check
     * @returns true if fieldDeclaration node
     */
    private isFieldDeclarationNode(node: CSTNode): boolean {
        try {
            return !!(
                node.children?.unannType &&
                node.children?.variableDeclaratorList
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Parses field declaration to create FieldInfo object.
     * 
     * @param fieldDecl - Field declaration CST node
     * @param lines - File content lines
     * @returns Parsed field information or undefined
     */
    public parseFieldDeclaration(fieldDecl: FieldDeclarationNode, lines: string[]): FieldInfo | undefined {
        try {
            const fieldType = this.extractFieldType(fieldDecl);
            const fieldName = this.extractFieldName(fieldDecl);
            
            if (!fieldType || !fieldName) {
                return undefined;
            }

            const position = this.positionCalculator.calculatePosition(fieldDecl, lines);
            const range = this.positionCalculator.calculateRange(fieldDecl, lines);
            const annotations = this.extractFieldAnnotations(fieldDecl, lines);
            const modifiers = this.extractFieldModifiers(fieldDecl);

            const fieldInfo: FieldInfo = {
                name: fieldName,
                type: fieldType,
                position,
                range,
                annotations,
                visibility: modifiers.visibility,
                isFinal: modifiers.isFinal,
                isStatic: modifiers.isStatic
            };

            return fieldInfo;
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to parse field',
                undefined,
                'Field declaration context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
            return undefined;
        }
    }

    /**
     * Extracts field type.
     * 
     * @param fieldDecl - Field declaration CST node
     * @returns Field type string or undefined
     */
    public extractFieldType(fieldDecl: FieldDeclarationNode): string | undefined {
        try {
            const unannType = fieldDecl.children?.unannType?.[0];
            
            // Try to extract full type text (including generics)
            const fullType = this.extractFullTypeText(fieldDecl);
            if (fullType) {
                return fullType;
            }
            
            // Reference types (classes, interfaces)
            if (unannType?.children?.unannReferenceType?.[0]?.children?.unannClassOrInterfaceType?.[0]?.children?.unannClassType?.[0]?.children?.Identifier?.[0]?.image) {
                const typeName = unannType.children.unannReferenceType[0].children.unannClassOrInterfaceType[0].children.unannClassType[0].children.Identifier[0].image;
                
                const genericPart = this.extractGenericTypeArguments(unannType);
                if (genericPart) {
                    return `${typeName}<${genericPart}>`;
                }
                
                return typeName;
            }
            
            // Primitive types (int, boolean, char, etc.)
            if (unannType?.children?.unannPrimitiveType?.[0]?.children) {
                const primitiveType = unannType.children.unannPrimitiveType[0].children;
                
                if (primitiveType.IntegralType?.[0]?.children) {
                    const integralChildren = primitiveType.IntegralType[0].children;
                    if (integralChildren.Int) return 'int';
                    if (integralChildren.Byte) return 'byte';
                    if (integralChildren.Short) return 'short';
                    if (integralChildren.Long) return 'long';
                    if (integralChildren.Char) return 'char';
                }
                
                if (primitiveType.FloatingPointType?.[0]?.children) {
                    const floatingChildren = primitiveType.FloatingPointType[0].children;
                    if (floatingChildren.Float) return 'float';
                    if (floatingChildren.Double) return 'double';
                }
                
                if (primitiveType.Boolean) return 'boolean';
            }
            
            // Alternative: find type identifier in entire node
            if (unannType) {
                const typeFromRecursive = this.findTypeRecursively(unannType);
                if (typeFromRecursive) {
                    return typeFromRecursive;
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to extract field type',
                undefined,
                'Field type context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return undefined;
    }

    /**
     * Extracts full type text from field declaration (including generics).
     * 
     * @param fieldDecl - Field declaration CST node
     * @returns Full type string or undefined
     */
    private extractFullTypeText(fieldDecl: FieldDeclarationNode): string | undefined {
        try {
            const unannType = fieldDecl.children?.unannType?.[0];
            if (unannType?.location) {
                // Collect all tokens from CST node to construct complete type
                const typeTokens = this.collectAllTokensFromNode(unannType);
                if (typeTokens.length > 0) {
                    return typeTokens.join('');
                }
            }
        } catch (error) {
            // Ignore error and try alternative method
        }
        
        return undefined;
    }

    /**
     * Collects all tokens from CST node.
     * 
     * @param node - CST node
     * @returns Array of tokens
     */
    private collectAllTokensFromNode(node: CSTNode): string[] {
        const tokens: string[] = [];
        
        if (!node) return tokens;
        
        try {
            if (node.image && typeof node.image === 'string') {
                tokens.push(node.image);
            }
            
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            tokens.push(...this.collectAllTokensFromNode(child));
                        }
                    }
                }
            }
        } catch (error) {
            // Ignore error
        }
        
        return tokens;
    }

    /**
     * Extracts generic type arguments.
     * 
     * @param unannType - unannType CST node
     * @returns Generic arguments string or undefined
     */
    private extractGenericTypeArguments(unannType: CSTNode): string | undefined {
        try {
            const typeArgs = this.findNodeRecursively(unannType, 'typeArguments');
            if (typeArgs && typeArgs.children) {
                const argumentTokens = this.collectAllTokensFromNode(typeArgs);
                if (argumentTokens.length > 0) {
                    // Remove < and >
                    const joined = argumentTokens.join('');
                    return joined.replace(/^</, '').replace(/>$/, '');
                }
            }
        } catch (error) {
            // Ignore error
        }
        
        return undefined;
    }

    /**
     * Recursively finds node with specific name.
     * 
     * @param node - Node to search
     * @param targetName - Target node name
     * @returns Found node or undefined
     */
    private findNodeRecursively(node: CSTNode, targetName: string): CSTNode | undefined {
        if (!node) return undefined;
        
        if (node.name === targetName) {
            return node;
        }
        
        if (node.children) {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        const result = this.findNodeRecursively(child, targetName);
                        if (result) return result;
                    }
                }
            }
        }
        
        return undefined;
    }

    /**
     * Recursively finds type information from node.
     * 
     * @param node - Node to search
     * @returns Found type or undefined
     */
    private findTypeRecursively(node: CSTNode): string | undefined {
        if (!node) {
            return undefined;
        }
        
        try {
            const primitiveTypes = ['int', 'boolean', 'char', 'byte', 'short', 'long', 'float', 'double'];
            
            if (node.image && typeof node.image === 'string') {
                if (primitiveTypes.includes(node.image.toLowerCase())) {
                    return node.image;
                }
                // Uppercase first letter suggests class/interface type
                if (node.image.match(/^[A-Z][a-zA-Z0-9_]*$/)) {
                    return node.image;
                }
            }
            
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            const result = this.findTypeRecursively(child);
                            if (result) {
                                return result;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed during recursive type search',
                undefined,
                'Recursive type search context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return undefined;
    }

    /**
     * Extracts field name.
     * 
     * @param fieldDecl - Field declaration CST node
     * @returns Field name string or undefined
     */
    public extractFieldName(fieldDecl: FieldDeclarationNode): string | undefined {
        try {
            const variableDeclarators = fieldDecl.children?.variableDeclaratorList?.[0]?.children?.variableDeclarator;
            if (variableDeclarators && variableDeclarators.length > 0) {
                return variableDeclarators[0].children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image;
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to extract field name',
                undefined,
                'Field name context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        return undefined;
    }

    /**
     * Extracts field annotations.
     * 
     * @param fieldDecl - Field declaration CST node
     * @param lines - File content lines
     * @returns Array of extracted annotation information
     */
    public extractFieldAnnotations(fieldDecl: FieldDeclarationNode, lines: string[]): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            const fieldModifiers = fieldDecl.children?.fieldModifier;
            
            if (fieldModifiers) {
                for (const modifier of fieldModifiers) {
                    if (modifier.children?.annotation) {
                        const annotation = this.annotationParser.parseAnnotation(modifier.children.annotation[0], lines);
                        if (annotation) {
                            annotations.push(annotation);
                        }
                    }
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to extract field annotations',
                undefined,
                'Field annotation context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return annotations;
    }

    /**
     * Extracts field access modifiers and keywords.
     * 
     * @param fieldDecl - Field declaration CST node
     * @returns Access modifiers and keywords information
     */
    public extractFieldModifiers(fieldDecl: FieldDeclarationNode): { visibility?: string; isFinal: boolean; isStatic: boolean } {
        const result = { visibility: undefined as string | undefined, isFinal: false, isStatic: false };
        
        try {
            const fieldModifiers = fieldDecl.children?.fieldModifier;
            
            if (fieldModifiers) {
                for (const modifier of fieldModifiers) {
                    if (modifier.children?.Public) {
                        result.visibility = 'public';
                    } else if (modifier.children?.Private) {
                        result.visibility = 'private';
                    } else if (modifier.children?.Protected) {
                        result.visibility = 'protected';
                    } else if (modifier.children?.Final) {
                        result.isFinal = true;
                    } else if (modifier.children?.Static) {
                        result.isStatic = true;
                    }
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                'Failed to extract field modifiers',
                undefined,
                'Field modifier context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return result;
    }
} 