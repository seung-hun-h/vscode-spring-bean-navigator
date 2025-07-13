import { JavaSyntaxUtils } from './java-syntax-utils';

/**
 * Utility class for parsing method declarations from Java source code.
 * Handles multi-line method declarations and various edge cases.
 */
export class MethodDeclareUtils {
    
    /**
     * Extracts method declaration from lines starting at the given index.
     * 
     * @param lines - All lines of the file
     * @param startIndex - Start line index
     * @returns Method declaration string and end index
     */
    static extractMethodDeclaration(lines: string[], startIndex: number): { methodDeclaration: string; endIndex: number } {
        let methodDeclaration = '';
        let endIndex = startIndex;
        let bracketCount = 0;
        let foundOpenParen = false;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            methodDeclaration += line.trim();
            
            // Count parentheses using JavaSyntaxUtils (ignores string literals)
            const openCount = JavaSyntaxUtils.countCharacterOutsideStrings(line, '(');
            const closeCount = JavaSyntaxUtils.countCharacterOutsideStrings(line, ')');
            
            if (openCount > 0) {
                foundOpenParen = true;
            }
            bracketCount += openCount - closeCount;
            
            // Check if we found the end of method declaration
            if (foundOpenParen && bracketCount === 0) {
                // Method body starts with { or abstract method ends with ;
                const braceCount = JavaSyntaxUtils.countCharacterOutsideStrings(line, '{');
                const semicolonCount = JavaSyntaxUtils.countCharacterOutsideStrings(line, ';');
                
                if (braceCount > 0 || semicolonCount > 0) {
                    endIndex = i;
                    break;
                }
            }
            
            // Add space between lines
            if (i < lines.length - 1 && foundOpenParen && bracketCount > 0) {
                methodDeclaration += ' ';
            }
        }
        
        return { methodDeclaration, endIndex };
    }
    
    /**
     * Parses method signature to extract visibility, return type, and method name.
     * 
     * @param methodDeclaration - Method declaration string
     * @returns Parsed signature with visibility, returnType, and name
     */
    static parseMethodSignature(methodDeclaration: string): { visibility: string; returnType: string; name: string } | undefined {
        const methodMatch = methodDeclaration.match(/\b(public|private|protected)\s+([\w<>,\s]+)\s+(\w+)\s*\(/);
        if (!methodMatch) {
            return undefined;
        }
        
        return {
            visibility: methodMatch[1],
            returnType: methodMatch[2].trim(),
            name: methodMatch[3]
        };
    }
} 