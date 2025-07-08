import * as vscode from 'vscode';
import { 
    ClassInfo, 
    AnnotationInfo, 
    CompilationUnitNode, 
    ClassDeclarationNode, 
    InterfaceTypeNode, 
    CSTNode 
} from '../../models/spring-types';
import { JAVA_PARSER_CONFIG } from '../config/java-parser-config';
import { ErrorHandler, ClassExtractionError } from '../core/parser-errors';
import { CSTNavigator } from '../core/cst-navigator';
import { PositionCalculator } from '../core/position-calculator';
import { AnnotationParser } from './annotation-parser';
import { FieldExtractor } from './field-extractor';

/**
 * Extracts Java class information.
 * Parses class declarations, annotations, interface implementations, etc.
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
     * Extracts class information from CST.
     * 
     * @param cst - Parsed CST
     * @param fileUri - File URI
     * @param content - File content
     * @returns Array of extracted class information
     */
    public extractClasses(cst: CompilationUnitNode, fileUri: vscode.Uri, content: string): ClassInfo[] {
        const classes: ClassInfo[] = [];
        const lines = content.split('\n');
        
        try {
            const packageName = this.cstNavigator.extractPackageName(cst);
            const imports = this.cstNavigator.extractImports(cst);
            const classDeclarations = this.cstNavigator.findClassDeclarations(cst);
            
            for (const classDecl of classDeclarations) {
                const classInfo = this.parseClassDeclaration(
                    classDecl, 
                    fileUri, 
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
                'Error extracting classes',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return classes;
    }

    /**
     * Parses class declaration to create ClassInfo object.
     * 
     * @param classDecl - Class declaration CST node
     * @param fileUri - File URI
     * @param lines - File content lines
     * @param packageName - Package name
     * @param imports - Import statements
     * @returns Parsed class information or undefined
     */
    public parseClassDeclaration(
        classDecl: ClassDeclarationNode, 
        fileUri: vscode.Uri, 
        lines: string[], 
        packageName: string | undefined, 
        imports: string[]
    ): ClassInfo | undefined {
        try {
            const className = classDecl.children?.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
            
            if (!className) {
                return undefined;
            }

            const position = this.positionCalculator.calculatePosition(classDecl, lines);
            const range = this.positionCalculator.calculateRange(classDecl, lines);
            const annotations = this.extractClassAnnotations(classDecl, lines);
            const fields = this.fieldExtractor.extractFields(classDecl, lines);
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

            // Add interface information as extended property
            if (interfaces.length > 0) {
                (classInfo as any).interfaces = interfaces;
            }

            return classInfo;
            
        } catch (error) {
            const classError = new ClassExtractionError(
                'Failed to parse class',
                classDecl?.children?.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
            return undefined;
        }
    }

    /**
     * Extracts class annotations.
     * 
     * @param classDecl - Class declaration CST node
     * @param lines - File content lines
     * @returns Array of extracted annotation information
     */
    public extractClassAnnotations(classDecl: ClassDeclarationNode, lines: string[]): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            // Actual structure: classDeclaration.children = ['classModifier', 'normalClassDeclaration']
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
                'Failed to extract class annotations',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return annotations;
    }

    /**
     * Extracts interfaces implemented by the class.
     * 
     * @param classDecl - Class declaration CST node
     * @returns Array of implemented interface names
     */
    public extractImplementedInterfaces(classDecl: ClassDeclarationNode): string[] {
        const interfaces: string[] = [];
        
        try {
            const normalClassDecl = classDecl.children?.normalClassDeclaration?.[0];
            
            if (normalClassDecl?.children) {
                const superinterfaces = normalClassDecl.children.superinterfaces;
                
                if (superinterfaces && superinterfaces.length > 0) {
                    const interfaceTypeList = superinterfaces[0].children?.interfaceTypeList;
                    if (interfaceTypeList && interfaceTypeList.length > 0) {
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
                    // Alternative: recursively find Implements keyword and Identifiers
                    const foundInterfaces = this.findInterfacesRecursively(normalClassDecl);
                    interfaces.push(...foundInterfaces);
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                'Failed to extract interfaces',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return interfaces;
    }

    /**
     * Recursively searches CST to find interfaces in implements clause.
     * 
     * @param node - CST node to search
     * @returns Array of found interface names
     */
    public findInterfacesRecursively(node: CSTNode): string[] {
        const interfaces: string[] = [];
        
        if (!node) {
            return interfaces;
        }
        
        try {
            // If Implements keyword is found, collect Identifiers that follow
            if (node.children?.Implements) {
                const identifiers = this.collectIdentifiersAfterImplements(node);
                interfaces.push(...identifiers);
            }
            
            // Recursively search child nodes
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
                'Failed during recursive search',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return interfaces;
    }

    /**
     * Collects Identifiers after Implements keyword.
     * 
     * @param node - CST node to search
     * @returns Array of collected interface names
     */
    public collectIdentifiersAfterImplements(node: CSTNode): string[] {
        const identifiers: string[] = [];
        
        try {
            this.collectAllIdentifiers(node, identifiers);
            
            // Filter out Java keywords and symbols, keep only actual interface names
            const filteredIdentifiers = identifiers.filter(id => 
                id && 
                id.trim() !== '' && 
                !JAVA_PARSER_CONFIG.JAVA_KEYWORDS_AND_SYMBOLS.has(id) &&
                // First letter uppercase (Java interface naming convention)
                JAVA_PARSER_CONFIG.INTERFACE_NAME_REGEX.test(id)
            );
            
            // Remove duplicates
            const uniqueInterfaces = [...new Set(filteredIdentifiers)];
            
            return uniqueInterfaces;
            
        } catch (error) {
            const classError = new ClassExtractionError(
                'Failed to collect identifiers',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return identifiers;
    }

    /**
     * Recursively collects all Identifiers from node.
     * 
     * @param node - CST node to search
     * @param identifiers - Array to store collected identifiers
     */
    public collectAllIdentifiers(node: CSTNode, identifiers: string[]): void {
        if (!node) {
            return;
        }
        
        try {
            if (node.image && typeof node.image === 'string') {
                identifiers.push(node.image);
            }
            
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
                'Error collecting identifiers',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
    }

    /**
     * Extracts interface name from individual interface type.
     * 
     * @param interfaceType - Interface type CST node
     * @returns Interface name
     */
    public extractInterfaceName(interfaceType: InterfaceTypeNode): string | undefined {
        try {
            // interfaceType structure: classType
            const classType = interfaceType.children?.classType?.[0];
            
            if (classType) {
                const identifiers = classType.children?.Identifier;
                
                if (identifiers && Array.isArray(identifiers)) {
                    // Get last part if package name is included
                    const interfaceName = identifiers[identifiers.length - 1].image;
                    return interfaceName;
                }
                
                if (classType.children?.Identifier && classType.children.Identifier.length > 0) {
                    return classType.children.Identifier[0].image;
                }
            }
            
            // Try alternative structure
            if (interfaceType.children?.Identifier) {
                const identifiers = interfaceType.children.Identifier;
                if (Array.isArray(identifiers) && identifiers.length > 0) {
                    return identifiers[identifiers.length - 1].image;
                }
            }
            
        } catch (error) {
            const classError = new ClassExtractionError(
                'Failed to extract interface name',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(classError);
        }
        
        return undefined;
    }


    /**
     * Checks if class belongs to specific package.
     * 
     * @param classInfo - Class to check
     * @param packageName - Package name to check
     * @returns true if class belongs to the package
     */
    public isInPackage(classInfo: ClassInfo, packageName: string): boolean {
        return classInfo.packageName === packageName;
    }
} 