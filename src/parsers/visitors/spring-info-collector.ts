import * as vscode from 'vscode';
import { ClassInfo } from '../../models/spring-types';

// Dynamic import type for java-parser
let BaseJavaCstVisitorWithDefaults: any;

/**
 * Collects Spring-related information by traversing the CST using the Visitor pattern.
 * Extends BaseJavaCstVisitorWithDefaults from java-parser library.
 */
export class SpringInfoCollector {
    private static isInitialized = false;
    
    public classes: ClassInfo[] = [];
    private currentPackageName: string | undefined;

    constructor(private readonly fileUri: vscode.Uri) {
        // validateVisitor is called after prototype setup
    }

    /**
     * Dynamically loads the java-parser module.
     * This is required because java-parser is an ES module.
     */
    public static async initialize(): Promise<void> {
        if (!this.isInitialized) {
            const javaParser = await import('java-parser');
            BaseJavaCstVisitorWithDefaults = javaParser.BaseJavaCstVisitorWithDefaults;
            this.isInitialized = true;
        }
    }

    /**
     * Visits the CST and collects Spring information.
     * 
     * @param cst - The Concrete Syntax Tree from java-parser
     * @returns The result of the visit operation
     */
    public visit(cst: any): any {
        return BaseJavaCstVisitorWithDefaults.prototype.visit.call(this, cst);
    }

    /**
     * Processes package declaration nodes.
     * Extracts and stores the current package name for use in fully qualified names.
     * 
     * @param ctx - The package declaration context from the CST
     */
    public packageDeclaration(ctx: any): void {
        const identifiers = ctx.Identifier;
        if (identifiers) {
            this.currentPackageName = identifiers.map((id: any) => id.image).join('.');
        }
    }

    /**
     * Processes class declaration nodes.
     * Extracts class name, annotations, and creates ClassInfo objects.
     * 
     * @param ctx - The class declaration context from the CST
     */
    public classDeclaration(ctx: any): void {
        if (!ctx.normalClassDeclaration || ctx.normalClassDeclaration.length === 0) {
            return;
        }
        
        const normalClass = ctx.normalClassDeclaration[0];
        const typeIdentifier = normalClass.children.typeIdentifier[0];
        const className = typeIdentifier.children.Identifier[0].image;
        
        const annotations = this.extractClassAnnotations(ctx);

        const nameLocation = typeIdentifier.location;
        const position = new vscode.Position(nameLocation.startLine - 1, nameLocation.startColumn - 1);

        const declarationLocation = normalClass.location;
        const range = new vscode.Range(
            new vscode.Position(declarationLocation.startLine - 1, declarationLocation.startColumn - 1),
            new vscode.Position(declarationLocation.endLine - 1, declarationLocation.endColumn)
        );
        
        const classInfo: ClassInfo = {
            name: className,
            packageName: this.currentPackageName,
            fullyQualifiedName: this.currentPackageName 
                ? `${this.currentPackageName}.${className}` 
                : className,
            annotations: annotations,
            fields: [],
            methods: [],
            constructors: [],
            imports: [],
            position: position,
            range: range,
            fileUri: this.fileUri
        };
        
        this.classes.push(classInfo);
    }

    /**
     * Extracts annotations from class modifiers.
     * 
     * @param ctx - The class declaration context
     * @returns Array of annotation information
     */
    private extractClassAnnotations(ctx: any): any[] {
        const annotations: any[] = [];
        
        if (ctx.classModifier) {
            ctx.classModifier.forEach((modifier: any) => {
                if (modifier.children.annotation) {
                    modifier.children.annotation.forEach((annotation: any) => {
                        const annotationName = annotation.children.typeName[0].children.Identifier[0].image;
                        annotations.push({
                            name: annotationName
                        });
                    });
                }
            });
        }
        
        return annotations;
    }
}

/**
 * Creates a SpringInfoCollector instance with proper prototype chain setup.
 * This factory function is necessary to handle the dynamic import of java-parser
 * and ensure the visitor methods are properly bound.
 * 
 * @param fileUri - The URI of the file being processed
 * @returns A properly initialized SpringInfoCollector instance
 */
export async function createSpringInfoCollector(fileUri: vscode.Uri): Promise<SpringInfoCollector> {
    await SpringInfoCollector.initialize();
    
    const collector = new SpringInfoCollector(fileUri);
    
    // Set up prototype chain to inherit from BaseJavaCstVisitorWithDefaults
    Object.setPrototypeOf(collector, BaseJavaCstVisitorWithDefaults.prototype);
    
    // Bind visitor methods to maintain correct 'this' context
    collector.packageDeclaration = SpringInfoCollector.prototype.packageDeclaration.bind(collector);
    collector.classDeclaration = SpringInfoCollector.prototype.classDeclaration.bind(collector);
    
    // Bind private methods as well
    (collector as any).extractClassAnnotations = SpringInfoCollector.prototype['extractClassAnnotations'].bind(collector);
    
    // Validate the visitor to ensure all methods are properly set up
    if (typeof (collector as any).validateVisitor === 'function') {
        (collector as any).validateVisitor();
    }
    
    return collector;
} 