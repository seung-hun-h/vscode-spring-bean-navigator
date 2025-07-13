import { ParameterInfo } from '../../models/spring-types';
import { ErrorHandler, JavaParsingError } from '../core/parser-errors';

/**
 * Utility class for parsing method and constructor parameters.
 * Handles generic types and complex parameter declarations.
 */
export class ParameterParser {
    
    /**
     * Parses parameters from a parameter declaration string.
     * 
     * @param parametersDeclaration - Parameters string (without parentheses)
     * @returns Array of parsed parameter information
     */
    static parseParameters(parametersDeclaration: string): ParameterInfo[] {
        if (!parametersDeclaration || parametersDeclaration.trim() === '') {
            return [];
        }
        
        try {
            const parameterStrings = this.splitParametersByComma(parametersDeclaration);
            const parameters: ParameterInfo[] = [];
            
            for (const paramStr of parameterStrings) {
                const param = this.parseSingleParameter(paramStr.trim());
                if (param) {
                    parameters.push(param);
                }
            }
            
            return parameters;
        } catch (error) {
            const parsingError = new JavaParsingError(
                'Failed to parse parameters',
                error instanceof Error ? error : undefined,
                'ParameterParser'
            );
            ErrorHandler.logError(parsingError, {
                parametersDeclaration: parametersDeclaration?.substring(0, 100) || 'Unknown'
            });
            return [];
        }
    }
    
    /**
     * Splits parameters by comma, considering generic types.
     * 
     * @param parametersText - Parameters text to split
     * @returns Array of parameter strings
     */
    static splitParametersByComma(parametersText: string): string[] {
        const parameters: string[] = [];
        let current = '';
        let depth = 0;
        
        for (let i = 0; i < parametersText.length; i++) {
            const char = parametersText[i];
            
            if (char === '<') {
                depth++;
            } else if (char === '>') {
                depth--;
            } else if (char === ',' && depth === 0) {
                parameters.push(current.trim());
                current = '';
                continue;
            }
            
            current += char;
        }
        
        if (current.trim()) {
            parameters.push(current.trim());
        }
        
        return parameters;
    }
    
    /**
     * Parses a single parameter declaration.
     * 
     * @param parameterString - Single parameter string
     * @returns Parsed parameter information or null
     */
    static parseSingleParameter(parameterString: string): ParameterInfo | null {
        try {
            // Remove annotations
            let cleanParam = parameterString.replace(/@\w+(\([^)]*\))?\s*/g, '');
            
            // Remove 'final' keyword
            cleanParam = cleanParam.replace(/\bfinal\s+/g, '');
            
            // Split type and variable name
            const parts = cleanParam.trim().split(/\s+/);
            if (parts.length < 2) {
                return null;
            }
            
            // Last part is variable name, rest is type
            const name = parts[parts.length - 1];
            const type = parts.slice(0, -1).join(' ');
            
            // Validate parsed values
            if (!name || !type || name.includes('<') || name.includes('>')) {
                return null;
            }
            
            return { name, type };
        } catch (error) {
            const parsingError = new JavaParsingError(
                'Failed to parse single parameter',
                error instanceof Error ? error : undefined,
                'ParameterParser'
            );
            ErrorHandler.logError(parsingError, {
                parameterString: parameterString?.substring(0, 50) || 'Unknown'
            });
            return null;
        }
    }
    
    /**
     * Extracts parameter names from a parameter list.
     * 
     * @param parameters - Array of parameter information
     * @returns Array of parameter names
     */
    static extractParameterNames(parameters: ParameterInfo[]): string[] {
        return parameters.map(param => param.name);
    }
    
    /**
     * Extracts parameter types from a parameter list.
     * 
     * @param parameters - Array of parameter information
     * @returns Array of parameter types
     */
    static extractParameterTypes(parameters: ParameterInfo[]): string[] {
        return parameters.map(param => param.type);
    }
    
    /**
     * Checks if a parameter type is a generic type.
     * 
     * @param type - Type string to check
     * @returns true if type contains generic notation
     */
    static isGenericType(type: string): boolean {
        return type.includes('<') && type.includes('>');
    }
    
    /**
     * Extracts the base type from a generic type.
     * 
     * @param genericType - Generic type string
     * @returns Base type without generic parameters
     */
    static extractBaseType(genericType: string): string {
        const genericStart = genericType.indexOf('<');
        return genericStart > 0 ? genericType.substring(0, genericStart).trim() : genericType;
    }
    
    /**
     * Extracts generic type parameters.
     * 
     * @param genericType - Generic type string
     * @returns Array of generic type parameters
     */
    static extractGenericParameters(genericType: string): string[] {
        const genericStart = genericType.indexOf('<');
        const genericEnd = genericType.lastIndexOf('>');
        
        if (genericStart === -1 || genericEnd === -1 || genericStart >= genericEnd) {
            return [];
        }
        
        const genericContent = genericType.substring(genericStart + 1, genericEnd);
        return this.splitParametersByComma(genericContent);
    }
} 