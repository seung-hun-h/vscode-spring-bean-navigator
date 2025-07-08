import { ErrorHandler, JavaParsingError } from '../core/parser-errors';

/**
 * Utility class for Java syntax parsing operations.
 * Provides reusable methods for string literal handling, bracket matching, etc.
 */
export class JavaSyntaxUtils {
    
    /**
     * Checks if a position is inside a string literal.
     * 
     * @param text - Text to analyze
     * @param position - Position to check
     * @returns true if position is inside a string literal
     */
    static isInStringLiteral(text: string, position: number): boolean {
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < position && i < text.length; i++) {
            const char = text[i];
            const prevChar = i > 0 ? text[i-1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            }
        }
        
        return inString;
    }
    
    /**
     * Extracts text between matching parentheses.
     * 
     * @param text - Text containing parentheses
     * @param startFrom - Optional starting position
     * @returns Text between parentheses or empty string
     */
    static extractBetweenParentheses(text: string, startFrom: number = 0): string {
        try {
            let parenStart = -1;
            let parenEnd = -1;
            let bracketCount = 0;
            
            for (let i = startFrom; i < text.length; i++) {
                if (!this.isInStringLiteral(text, i)) {
                    const char = text[i];
                    
                    if (char === '(' && parenStart === -1) {
                        parenStart = i;
                        bracketCount = 1;
                    } else if (parenStart !== -1) {
                        if (char === '(') {
                            bracketCount++;
                        } else if (char === ')') {
                            bracketCount--;
                            if (bracketCount === 0) {
                                parenEnd = i;
                                break;
                            }
                        }
                    }
                }
            }
            
            if (parenStart !== -1 && parenEnd !== -1) {
                return text.substring(parenStart + 1, parenEnd);
            }
            
            return '';
        } catch (error) {
            const parsingError = new JavaParsingError(
                'Failed to extract between parentheses',
                error instanceof Error ? error : undefined,
                'JavaSyntaxUtils'
            );
            ErrorHandler.logError(parsingError, { 
                textLength: text?.length || 0,
                startFrom 
            });
            return '';
        }
    }
    
    /**
     * Finds the position of matching closing bracket.
     * 
     * @param text - Text to search
     * @param openPos - Position of opening bracket
     * @param openChar - Opening bracket character
     * @param closeChar - Closing bracket character
     * @returns Position of closing bracket or -1
     */
    static findMatchingBracket(
        text: string, 
        openPos: number, 
        openChar: string, 
        closeChar: string
    ): number {
        if (openPos < 0 || openPos >= text.length || text[openPos] !== openChar) {
            return -1;
        }
        
        let bracketCount = 1;
        
        for (let i = openPos + 1; i < text.length; i++) {
            if (!this.isInStringLiteral(text, i)) {
                const char = text[i];
                if (char === openChar) {
                    bracketCount++;
                } else if (char === closeChar) {
                    bracketCount--;
                    if (bracketCount === 0) {
                        return i;
                    }
                }
            }
        }
        
        return -1;
    }
    
    /**
     * Counts occurrences of a character outside string literals.
     * 
     * @param text - Text to analyze
     * @param targetChar - Character to count
     * @returns Number of occurrences
     */
    static countCharacterOutsideStrings(text: string, targetChar: string): number {
        let count = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const prevChar = i > 0 ? text[i-1] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            } else if (!inString && char === targetChar) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * Checks if text contains unclosed parentheses.
     * 
     * @param text - Text to check
     * @returns true if parentheses are balanced
     */
    static areParenthesesBalanced(text: string): boolean {
        let count = 0;
        
        for (let i = 0; i < text.length; i++) {
            if (!this.isInStringLiteral(text, i)) {
                const char = text[i];
                if (char === '(') count++;
                else if (char === ')') count--;
                
                if (count < 0) return false; // More closing than opening
            }
        }
        
        return count === 0;
    }
} 