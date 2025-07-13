import * as vscode from 'vscode';
import { MethodInfo, ParameterInfo, AnnotationInfo } from '../../models/spring-types';
import { AnnotationParser } from './annotation-parser';
import { ErrorHandler } from '../core/parser-errors';
import { PARSING_CONSTANTS } from '../config/java-parser-config';
import { ParameterParser } from '../utils/parameter-parse-utils';
import { JavaSyntaxUtils } from '../utils/java-syntax-utils';
import { MethodDeclareUtils } from '../utils/method-declare-utils';
import { MethodClassifyUtils } from '../utils/method-classify-utils';
import { TextPositionCalculateUtils } from '../utils/text-position-calculate-utils';

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
     * Parses method information from lines.
     */
    private parseMethodFromLines(lines: string[], startIndex: number, uri: vscode.Uri): MethodInfo | null {
        try {
            const { methodDeclaration, endIndex } = MethodDeclareUtils.extractMethodDeclaration(lines, startIndex);
            
            const cleanDeclaration = methodDeclaration.replace(/\s+/g, ' ').trim();
            
            const parametersString = this.extractParametersStringFromDeclaration(cleanDeclaration);
            const parsedMethod = this.parseMethodDeclarationWithParameters(cleanDeclaration, parametersString);
            
            if (!parsedMethod) {
                return null;
            }
            
            const parametersWithPositions = TextPositionCalculateUtils.calculateParameterPositions(
                parsedMethod.parameters, 
                lines, 
                startIndex, 
                endIndex
            );
            
            const isSetterMethod = MethodClassifyUtils.isSetterMethod(parsedMethod.name, parsedMethod.parameters.length);
            
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
        return JavaSyntaxUtils.extractBetweenParentheses(declaration);
    }
} 