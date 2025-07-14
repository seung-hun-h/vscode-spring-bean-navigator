import { ErrorHandler, CSTParsingError } from './parser-errors';
import { 
    CSTNode, 
    CompilationUnitNode, 
    ImportDeclarationNode,
    ClassDeclarationNode,
    IdentifierNode
} from '../../models/spring-types';

/**
 * CST (Concrete Syntax Tree) navigator for parsing Java source code
 */
export class CSTNavigator {
    
    /**
     * Extracts package name from CST.
     * 
     * @param cst - CST root node
     * @returns Package name or undefined
     */
    public extractPackageName(cst: CompilationUnitNode): string | undefined {
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            if (ordinaryCompUnit?.children?.packageDeclaration) {
                const packageDecl = ordinaryCompUnit.children.packageDeclaration[0];
                if (packageDecl.children?.Identifier) {
                    const identifiers = packageDecl.children.Identifier;
                    return identifiers.map((id: IdentifierNode) => id.image).join('.');
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to extract package name',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        return undefined;
    }

    /**
     * Extracts import statements from CST.
     * 
     * @param cst - CST root node
     * @returns Array of import statements
     */
    public extractImports(cst: CompilationUnitNode): string[] {
        const imports: string[] = [];
        
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            const importDeclarations = ordinaryCompUnit?.children?.importDeclaration;
            
            if (importDeclarations) {
                for (const importDecl of importDeclarations) {
                    const importName = this.extractImportName(importDecl);
                    if (importName) {
                        imports.push(importName);
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to extract imports',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return imports;
    }

    /**
     * Finds class declarations in CST.
     * 
     * @param cst - CST root node
     * @returns Array of class declaration nodes
     */
    public findClassDeclarations(cst: CompilationUnitNode): ClassDeclarationNode[] {
        const classDeclarations: ClassDeclarationNode[] = [];
        
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            const typeDeclarations = ordinaryCompUnit?.children?.typeDeclaration;
            
            if (typeDeclarations) {
                for (const typeDecl of typeDeclarations) {
                    if (typeDecl.children?.classDeclaration) {
                        classDeclarations.push(typeDecl.children.classDeclaration[0]);
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to find class declarations',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return classDeclarations;
    }

    /**
     * Extracts import name from import declaration node.
     * 
     * @param importDecl - Import declaration node
     * @returns Import name or undefined
     */
    private extractImportName(importDecl: ImportDeclarationNode): string | undefined {
        try {
            if (importDecl.children?.packageOrTypeName?.[0]?.children?.Identifier) {
                const identifiers = importDecl.children.packageOrTypeName[0].children.Identifier;
                let importName = identifiers.map((id: IdentifierNode) => id.image).join('.');
                
                if (importDecl.children?.Star) {
                    importName += '.*';
                }
                
                return importName;
            }
            
            // Handle alternative structure when packageOrTypeName is not available
            const allTokens = this.extractAllTokensFromImport(importDecl);
            if (allTokens.length > 0) {
                let importName = '';
                for (let i = 0; i < allTokens.length; i++) {
                    const token = allTokens[i];
                    if (token === '*') {
                        importName += '.*';
                    } else if (token === '.') {
                        if (i < allTokens.length - 1 && allTokens[i + 1] === '*') {
                            importName += '.';
                        } else {
                            importName += '.';
                        }
                    } else if (token !== 'import' && token !== ';') {
                        if (importName && !importName.endsWith('.')) {
                            importName += '.';
                        }
                        importName += token;
                    }
                }
                
                if (importName) {
                    return importName;
                }
            }
            
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to extract import name',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        return undefined;
    }

    /**
     * Extracts all tokens from import node.
     * 
     * @param importDecl - Import declaration node
     * @returns Array of extracted tokens
     */
    private extractAllTokensFromImport(importDecl: ImportDeclarationNode): string[] {
        const tokens: string[] = [];
        
        try {
            this.collectTokensRecursively(importDecl, tokens);
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to collect tokens',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return tokens;
    }

    /**
     * Recursively collects all tokens from CST node.
     * 
     * @param node - Node to traverse
     * @param tokens - Array to store collected tokens
     */
    private collectTokensRecursively(node: CSTNode, tokens: string[]): void {
        if (!node) {
            return;
        }
        
        try {
            if (node.image && typeof node.image === 'string') {
                tokens.push(node.image);
                return;
            }
            
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            this.collectTokensRecursively(child, tokens);
                        }
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to collect tokens recursively',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
    }

    /**
     * Extracts all tokens from a CST node recursively.
     * Unlike collectTokensRecursively, this method continues to traverse child nodes
     * even after finding a node with an image property.
     * 
     * @param node - CST node to traverse
     * @returns Array of all tokens found in the node and its children
     */
    public extractAllTokens(node: CSTNode): string[] {
        const tokens: string[] = [];
        
        if (!node) {
            return tokens;
        }
        
        try {
            if (node.image && typeof node.image === 'string') {
                tokens.push(node.image);
            }
            
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            tokens.push(...this.extractAllTokens(child));
                        }
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                'Failed to collect all tokens from node',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return tokens;
    }
} 