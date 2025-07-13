import * as vscode from 'vscode';
import { MethodInfo, ParameterInfo, AnnotationInfo } from '../../models/spring-types';
import { AnnotationParser } from './annotation-parser';
import { ErrorHandler } from '../core/parser-errors';
import { PARSING_CONSTANTS } from '../config/java-parser-config';
import { ParameterParser } from '../utils/parameter-parser';

/**
 * Extracts all methods from Java classes including @Bean methods and regular methods.
 */
export class MethodExtractor {
    private readonly annotationParser: AnnotationParser;

    constructor(annotationParser?: AnnotationParser) {
        this.annotationParser = annotationParser || new AnnotationParser();
    }
    
    /**
     * Extracts all methods from Java file content.
     * 
     * @param content - Java file content
     * @param uri - File URI
     * @returns Array of extracted method information
     */
    extractAllMethods(content: string, uri: vscode.Uri): MethodInfo[] {
        if (!content || content.trim() === '') {
            return [];
        }
        
        try {
            const lines = content.split('\n');
            const methods: MethodInfo[] = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Find method declaration pattern: public/private/protected ... methodName(...) - single or multi-line
                const methodRegex = /\b(public|private|protected)\s+[\w<>,\s]+\s+(\w+)\s*\(/;
                const methodStartRegex = /\b(public|private|protected)\s+([\w<>,\s]+\s+)?(\w+)\s*$/; // Parenthesis on next line
                
                // Additional check for multi-line methods
                let isMethodDeclaration = false;
                if (methodStartRegex.test(line)) {
                    // Check if opening parenthesis is on next line
                    for (let j = i + PARSING_CONSTANTS.ARRAY_OFFSET.NEXT; j < Math.min(i + PARSING_CONSTANTS.SETTER_METHOD_SEARCH_RANGE, lines.length); j++) {
                        const nextLine = lines[j].trim();
                        if (nextLine.includes('(')) {
                            isMethodDeclaration = true;
                            break;
                        }
                        if (nextLine && !nextLine.startsWith('@')) {
                            break; // Stop if non-annotation code appears
                        }
                    }
                }
                
                if (methodRegex.test(line) || isMethodDeclaration) {
                    const methodInfo = this.parseMethodFromLines(lines, i, uri);
                    if (methodInfo) {
                        const allAnnotations = this.extractMethodAnnotations(lines, i);
                        methodInfo.annotations = allAnnotations;
                        
                        methods.push(methodInfo);
                    }
                }
            }
            
            return methods;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Method extraction');
            ErrorHandler.logError(parsingError, { 
                fileName: uri.toString(),
                contentLength: content.length
            });
            return [];
        }
    }
    
    /**
     * Parses method declaration with its parameters.
     * 
     * @param methodDeclaration - Method declaration string
     * @param parametersString - Exactly extracted parameter string
     * @returns Parsed method information or undefined
     */
    parseMethodDeclarationWithParameters(methodDeclaration: string, parametersString: string): { name: string; returnType: string; parameters: ParameterInfo[] } | undefined {
        try {
            // Ignore field declarations
            if (methodDeclaration.includes(';') && !methodDeclaration.includes('(')) {
                return undefined;
            }
            
            const methodMatch = methodDeclaration.match(/\b(public|private|protected)\s+([\w<>,\s]+)\s+(\w+)\s*\(/);
            if (!methodMatch) {
                return undefined;
            }
            
            const returnType = methodMatch[2].trim();
            const methodName = methodMatch[3].trim();
            const parameters = ParameterParser.parseParameters(parametersString);
            
            return {
                name: methodName,
                returnType,
                parameters
            };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Parse method declaration with parameters');
            ErrorHandler.logError(parsingError, { 
                methodDeclaration: methodDeclaration?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.ERROR_MESSAGE_MAX_LENGTH) || 'Unknown',
                parametersString: parametersString?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.PARAMETER_STRING_MAX_LENGTH) || 'Unknown'
            });
            return undefined;
        }
    }
    
    /**
     * Determines if it's a setter method.
     * 
     * @param methodName - Method name
     * @param parameterCount - Number of parameters
     * @returns Whether it's a setter method
     */
    isSetterMethod(methodName: string, parameterCount: number): boolean {
        try {
            // Setter pattern: starts with 'set' followed by uppercase letter
            if (!methodName.startsWith('set') || methodName.length <= PARSING_CONSTANTS.SETTER_PREFIX_LENGTH) {
                return false;
            }
            
            // Check if the character after 'set' is uppercase
            const fourthChar = methodName.charAt(PARSING_CONSTANTS.SETTER_PREFIX_LENGTH);
            const isUppercase = fourthChar === fourthChar.toUpperCase() && fourthChar !== fourthChar.toLowerCase();
            
            return isUppercase && parameterCount > PARSING_CONSTANTS.MIN_ARRAY_INDEX;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Determine setter method');
            ErrorHandler.logError(parsingError, { 
                methodName: methodName || 'Unknown',
                parameterCount: parameterCount || PARSING_CONSTANTS.MIN_ARRAY_INDEX
            });
            return false;
        }
    }
    
    /**
     * Parses method information from lines.
     */
    private parseMethodFromLines(lines: string[], startIndex: number, uri: vscode.Uri): MethodInfo | null {
        try {
            const { methodDeclaration, endIndex } = this.extractMethodDeclaration(lines, startIndex);
            
            const cleanDeclaration = methodDeclaration.replace(/\s+/g, ' ').trim();
            
            const parametersString = this.extractParametersStringFromDeclaration(cleanDeclaration);
            const parsedMethod = this.parseMethodDeclarationWithParameters(cleanDeclaration, parametersString);
            
            if (!parsedMethod) {
                return null;
            }
            
            const parametersWithPositions = this.calculateParameterPositions(
                parsedMethod.parameters, 
                lines, 
                startIndex, 
                endIndex
            );
            
            const isSetterMethod = this.isSetterMethod(parsedMethod.name, parsedMethod.parameters.length);
            
            const position = new vscode.Position(startIndex, PARSING_CONSTANTS.DEFAULT_POSITION.CHARACTER);
            const range = new vscode.Range(position, new vscode.Position(endIndex, lines[endIndex].length));
            
            return {
                name: parsedMethod.name,
                parameters: parametersWithPositions,
                range,
                annotations: [], // Will be filled later
                isSetterMethod,
                position,
                returnType: parsedMethod.returnType
            };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Parse method lines');
            ErrorHandler.logError(parsingError, { 
                startIndex: startIndex,
                fileName: uri.toString()
            });
            return null;
        }
    }

    /**
     * Extracts method declaration from lines.
     * 
     * @param lines - All lines of the file
     * @param startIndex - Start line index
     * @returns Method declaration string and end index
     */
    private extractMethodDeclaration(lines: string[], startIndex: number): { methodDeclaration: string; endIndex: number } {
        let methodDeclaration = '';
        let endIndex = startIndex;
        let bracketCount = 0;
        let foundOpenParen = false;
        
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            methodDeclaration += line;
            
            const { openCount, closeCount, hasOpened } = this.countParentheses(line);
            bracketCount += openCount - closeCount;
            foundOpenParen = foundOpenParen || hasOpened;
            
            if (foundOpenParen && bracketCount === 0) {
                endIndex = i;
                break;
            }
            
            if (foundOpenParen && this.hasMethodBodyStart(line)) {
                endIndex = i;
                break;
            }
            
            if (i < lines.length + PARSING_CONSTANTS.ARRAY_OFFSET.PREV) {
                methodDeclaration += ' ';
            }
        }
        
        return { methodDeclaration, endIndex };
    }

    /**
     * Counts parentheses in a line, excluding string literals.
     * 
     * @param line - Line to analyze
     * @returns Count of open and close parentheses and whether it has opened
     */
    private countParentheses(line: string): { openCount: number; closeCount: number; hasOpened: boolean } {
        let openCount = 0;
        let closeCount = 0;
        let hasOpened = false;
        let inString = false;
        let stringChar = '';
        
        for (let j = PARSING_CONSTANTS.MIN_ARRAY_INDEX; j < line.length; j++) {
            const char = line[j];
            const prevChar = j > PARSING_CONSTANTS.MIN_ARRAY_INDEX ? line[j + PARSING_CONSTANTS.ARRAY_OFFSET.PREV] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            }
            
            if (!inString) {
                if (char === '(') {
                    openCount++;
                    hasOpened = true;
                } else if (char === ')') {
                    closeCount++;
                }
            }
        }
        
        return { openCount, closeCount, hasOpened };
    }

    /**
     * Checks if a line contains method body start.
     * 
     * @param line - Line to check
     * @returns True if line contains '{' or ';' outside string literals
     */
    private hasMethodBodyStart(line: string): boolean {
        let inString = false;
        let stringChar = '';
        
        for (let k = PARSING_CONSTANTS.MIN_ARRAY_INDEX; k < line.length; k++) {
            const char = line[k];
            const prevChar = k > PARSING_CONSTANTS.MIN_ARRAY_INDEX ? line[k + PARSING_CONSTANTS.ARRAY_OFFSET.PREV] : '';
            
            if ((char === '"' || char === "'") && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
            }
            
            if (!inString && (char === '{' || char === ';')) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Extracts annotations for a method.
     */
    private extractMethodAnnotations(lines: string[], methodLineIndex: number): AnnotationInfo[] {
        return this.annotationParser.extractMethodAnnotationsFromLines(lines, methodLineIndex);
    }


    
    /**
     * Extracts the exact parameter string from the method declaration.
     * 
     * @param declaration - Method declaration string
     * @returns Parameter string between parentheses
     */
    private extractParametersStringFromDeclaration(declaration: string): string {
        try {
            let methodParenStart = -1;
            let methodParenEnd = -1;
            let bracketCount = 0;
            let inString = false;
            let stringChar = '';
            
            for (let i = 0; i < declaration.length; i++) {
                const char = declaration[i];
                const prevChar = i > 0 ? declaration[i-1] : '';
                
                if ((char === '"' || char === "'") && prevChar !== '\\') {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                        stringChar = '';
                    }
                }
                
                if (!inString && char === '(' && methodParenStart === -1) {
                    methodParenStart = i;
                    bracketCount = 1;
                } else if (!inString && methodParenStart !== -1) {
                    if (char === '(') {
                        bracketCount++;
                    } else if (char === ')') {
                        bracketCount--;
                        if (bracketCount === 0) {
                            methodParenEnd = i;
                            break;
                        }
                    }
                }
            }
            
            if (methodParenStart !== -1 && methodParenEnd !== -1) {
                return declaration.substring(methodParenStart + 1, methodParenEnd);
            }
            
            return '';
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Extract method parameter string');
            ErrorHandler.logError(parsingError, { 
                declaration: declaration?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.ERROR_MESSAGE_MAX_LENGTH) || 'Unknown'
            });
            return '';
        }
    }
    


    /**
     * Calculates exact position information for parameters.
     * 
     * @param parameters - Basic parameter information
     * @param lines - All lines of the file
     * @param methodStartIndex - Method start line index
     * @param methodEndIndex - Method end line index
     * @returns Array of parameters with position information
     */
    private calculateParameterPositions(
        parameters: ParameterInfo[], 
        lines: string[], 
        methodStartIndex: number, 
        methodEndIndex: number
    ): ParameterInfo[] {
        const parametersWithPositions: ParameterInfo[] = [];

        try {
            for (const parameter of parameters) {
                const parameterPosition = this.findParameterPosition(
                    parameter.name, 
                    lines, 
                    methodStartIndex, 
                    methodEndIndex
                );

                const enhancedParameter: ParameterInfo = {
                    ...parameter,
                    position: parameterPosition.position,
                    range: parameterPosition.range
                };

                parametersWithPositions.push(enhancedParameter);
            }
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Calculate parameter positions');
            ErrorHandler.logError(parsingError, { 
                parameterCount: parameters.length,
                methodStartIndex,
                methodEndIndex
            });
            return parameters;
        }

        return parametersWithPositions;
    }

    /**
     * Finds the position of a specific parameter.
     * 
     * @param parameterName - Parameter name to find
     * @param lines - All lines of the file
     * @param startIndex - Search start line index
     * @param endIndex - Search end line index
     * @returns Position information of the parameter
     */
    private findParameterPosition(
        parameterName: string, 
        lines: string[], 
        startIndex: number, 
        endIndex: number
    ): { position: vscode.Position; range: vscode.Range } {
        try {
            for (let i = startIndex; i <= endIndex && i < lines.length; i++) {
                const line = lines[i];
                const parameterIndex = line.indexOf(parameterName);
                
                if (parameterIndex !== -1) {
                    const beforeChar = parameterIndex > 0 ? line[parameterIndex - 1] : ' ';
                    const afterIndex = parameterIndex + parameterName.length;
                    const afterChar = afterIndex < line.length ? line[afterIndex] : ' ';
                    
                    const isWordBoundary = /\s|,|;|\(|\)/.test(beforeChar) && /\s|,|;|\(|\)/.test(afterChar);
                    
                    if (isWordBoundary) {
                        const position = new vscode.Position(i, parameterIndex);
                        const range = new vscode.Range(
                            position, 
                            new vscode.Position(i, parameterIndex + parameterName.length)
                        );
                        
                        return { position, range };
                    }
                }
            }
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Find parameter position');
            ErrorHandler.logError(parsingError, { 
                parameterName,
                startIndex,
                endIndex
            });
        }

        const defaultPosition = new vscode.Position(startIndex, 0);
        const defaultRange = new vscode.Range(defaultPosition, defaultPosition);
        return { position: defaultPosition, range: defaultRange };
    }
} 