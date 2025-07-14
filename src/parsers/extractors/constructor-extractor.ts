import * as vscode from 'vscode';
import { ConstructorInfo, ParameterInfo, SpringAnnotationType } from '../../models/spring-types';
import { Position } from 'vscode';
import { AnnotationParser } from './annotation-parser';
import { ErrorHandler } from '../core/parser-errors';
import { JavaSyntaxUtils } from '../utils/java-syntax-utils';
import { ParameterParser } from '../utils/parameter-parse-utils';

/**
 * Extracts constructors from Java classes.
 * Detects Spring Framework's constructor injection patterns.
 */
export class ConstructorExtractor {
    private readonly annotationParser: AnnotationParser;

    constructor(annotationParser?: AnnotationParser) {
        this.annotationParser = annotationParser || new AnnotationParser();
    }
    
    /**
     * Extracts all constructors from Java file content.
     * @param content Java file content
     * @param uri File URI
     * @returns Array of extracted constructor information
     */
    public extractConstructors(content: string, uri: vscode.Uri): ConstructorInfo[] {
        if (!content || content.trim() === '') {
            return [];
        }
        
        // Extract class name at top level to make it accessible in catch block
        let className = undefined;
        
        try {
            const lines = content.split('\n');
            const constructors: ConstructorInfo[] = [];
            
            className = this.extractClassName(content);
            if (!className) {
                return [];
            }
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Find constructor pattern: public ClassName(...) - handle single or multiple lines
                const constructorRegex = new RegExp(`public\\s+${className}\\s*\\(`);
                const constructorStartRegex = new RegExp(`public\\s+${className}\\s*$`); // Opening parenthesis on next line
                
                if (constructorRegex.test(line) || constructorStartRegex.test(line)) {
                    const constructorInfo = this.parseConstructorFromLines(lines, i, className, uri);
                    if (constructorInfo) {
                        constructors.push(constructorInfo);
                    }
                }
            }
            return constructors;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Constructor extraction');
            ErrorHandler.logError(parsingError, { 
                fileName: uri.toString(),
                className: className || 'Unknown',
                contentLength: content.length
            });
            return [];
        }
    }
    
    /**
     * Detects @Autowired annotation using unified logic from AnnotationParser.
     * @param lines Java file lines
     * @param constructorLineIndex Constructor line index
     * @returns true if @Autowired annotation exists
     */
    private detectAutowiredAnnotation(lines: string[], constructorLineIndex: number): boolean {
        return this.annotationParser.detectAnnotationInLines(
            lines, 
            constructorLineIndex - 1, 
            SpringAnnotationType.AUTOWIRED
        );
    }
    
    /**
     * Extracts class name.
     */
    private extractClassName(content: string): string | null {
        const classMatch = content.match(/public\s+class\s+(\w+)/);
        return classMatch ? classMatch[1] : null;
    }
    
    /**
     * Parses constructor information from lines.
     */
    private parseConstructorFromLines(lines: string[], startIndex: number, className: string, uri: vscode.Uri): ConstructorInfo | null {
        try {
            // Build constructor declaration by joining lines
            const declaration = this.buildConstructorDeclaration(lines, startIndex);
            
            // Extract parameters using utility
            const parametersString = JavaSyntaxUtils.extractBetweenParentheses(declaration);
            const parameters = ParameterParser.parseParameters(parametersString);
            
            // Detect @Autowired
            const hasAutowiredAnnotation = this.detectAutowiredAnnotation(lines, startIndex);
            
            // Calculate range
            const endIndex = this.findConstructorEndIndex(lines, startIndex, declaration);
            const position = new Position(startIndex, 0);
            const range = new vscode.Range(position, new Position(endIndex, lines[endIndex].length));
            
            return {
                parameters,
                hasAutowiredAnnotation,
                position,
                range
            };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Constructor line parsing');
            ErrorHandler.logError(parsingError, { 
                className: className || 'Unknown',
                startIndex: startIndex,
                fileName: uri.toString()
            });
            return null;
        }
    }
    
    /**
     * Builds constructor declaration by joining lines until complete.
     */
    private buildConstructorDeclaration(lines: string[], startIndex: number): string {
        let declaration = '';
        let foundOpenParen = false;
        let bracketCount = 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            declaration += line;
            
            // Count parentheses outside string literals
            for (let j = 0; j < line.length; j++) {
                if (!JavaSyntaxUtils.isInStringLiteral(line, j + 1)) {
                    const char = line[j];
                    if (char === '(') {
                        bracketCount++;
                        foundOpenParen = true;
                    } else if (char === ')') {
                        bracketCount--;
                    }
                }
            }
            
            // Check if declaration is complete
            if (foundOpenParen && bracketCount === 0) {
                break;
            }
            
            // Check for body start
            const hasBodyStart = this.checkForBodyStart(line);
            if (foundOpenParen && hasBodyStart) {
                break;
            }
            
            // Add space for next line
            if (i < lines.length - 1) {
                declaration += ' ';
            }
        }
        
        return declaration.replace(/\s+/g, ' ').trim();
    }
    
    /**
     * Checks if line contains constructor body start.
     */
    private checkForBodyStart(line: string): boolean {
        for (let i = 0; i < line.length; i++) {
            if (!JavaSyntaxUtils.isInStringLiteral(line, i + 1)) {
                const char = line[i];
                if (char === '{' || char === ';') {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Finds the end index of constructor declaration.
     */
    private findConstructorEndIndex(lines: string[], startIndex: number, declaration: string): number {
        let currentLength = 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            currentLength += lines[i].length;
            if (currentLength >= declaration.length) {
                return i;
            }
            currentLength += 1; // Space between lines
        }
        
        return startIndex;
    }
} 