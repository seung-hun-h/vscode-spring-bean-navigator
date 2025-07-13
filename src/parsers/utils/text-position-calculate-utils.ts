import * as vscode from 'vscode';
import { ParameterInfo } from '../../models/spring-types';

/**
 * Utility class for calculating text positions in Java source files.
 * Handles position calculations for methods, parameters, and other elements.
 */
export class TextPositionCalculateUtils {
    
    /**
     * Finds the position of a specific parameter in the source code.
     * 
     * @param parameterName - Parameter name to find
     * @param lines - All lines of the file
     * @param startIndex - Search start line index
     * @param endIndex - Search end line index
     * @returns Position information of the parameter
     */
    static findParameterPosition(
        parameterName: string, 
        lines: string[], 
        startIndex: number, 
        endIndex: number
    ): { position: vscode.Position; range: vscode.Range } {
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

        // Default position if not found
        const defaultPosition = new vscode.Position(startIndex, 0);
        const defaultRange = new vscode.Range(defaultPosition, defaultPosition);
        return { position: defaultPosition, range: defaultRange };
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
    static calculateParameterPositions(
        parameters: ParameterInfo[], 
        lines: string[], 
        methodStartIndex: number, 
        methodEndIndex: number
    ): ParameterInfo[] {
        const parametersWithPositions: ParameterInfo[] = [];

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

        return parametersWithPositions;
    }
} 