import * as vscode from 'vscode';
import { JAVA_PARSER_CONFIG } from '../config/java-parser-config';
import { ErrorHandler, PositionCalculationError } from './parser-errors';
import { CSTNode } from '../../models/spring-types';

/**
 * Handles position and range calculations for AST nodes
 */
export class PositionCalculator {
    
    /**
     * Calculates the position information of a CST node.
     * 
     * @param node - CST node
     * @param lines - Array of file lines
     * @returns VSCode Position
     */
    public calculatePosition(node: CSTNode, lines: string[]): vscode.Position {
        try {
            if (node?.location?.startLine !== undefined && node?.location?.startColumn !== undefined) {
                // Convert 1-based to 0-based
                return new vscode.Position(node.location.startLine - 1, node.location.startColumn - 1);
            }
            
            if (node?.image && typeof node.image === 'string') {
                const position = this.findTextPosition(node.image, lines);
                if (position) {
                    return position;
                }
            }
            
            const childPosition = this.findPositionInChildren(node, lines);
            if (childPosition) {
                return childPosition;
            }
            
        } catch (error) {
            const positionError = new PositionCalculationError(
                'Failed to calculate position',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return new vscode.Position(
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.line, 
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.character
        );
    }

    /**
     * Calculates the range information of a CST node.
     * 
     * @param node - CST node
     * @param lines - Array of file lines
     * @returns VSCode Range
     */
    public calculateRange(node: CSTNode, lines: string[]): vscode.Range {
        try {
            if (node?.location?.startLine !== undefined && 
                node?.location?.startColumn !== undefined &&
                node?.location?.endLine !== undefined && 
                node?.location?.endColumn !== undefined) {
                
                const start = new vscode.Position(node.location.startLine - 1, node.location.startColumn - 1);
                const end = new vscode.Position(node.location.endLine - 1, node.location.endColumn - 1);
                return new vscode.Range(start, end);
            }
            
            if (node?.image && typeof node.image === 'string') {
                const start = this.findTextPosition(node.image, lines);
                if (start) {
                    const end = new vscode.Position(start.line, start.character + node.image.length);
                    return new vscode.Range(start, end);
                }
            }
            
            const childRange = this.calculateRangeFromChildren(node, lines);
            if (childRange) {
                return childRange;
            }
            
        } catch (error) {
            const positionError = new PositionCalculationError(
                'Failed to calculate range',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        const fallbackStart = new vscode.Position(
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.line,
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.character
        );
        const fallbackEnd = new vscode.Position(
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.line,
            lines[0]?.length || JAVA_PARSER_CONFIG.POSITION_FALLBACK.character
        );
        return new vscode.Range(fallbackStart, fallbackEnd);
    }

    /**
     * Finds the position of specific text within file content.
     * 
     * @param text - Text to find
     * @param lines - Array of file lines
     * @returns Position information or undefined
     */
    private findTextPosition(text: string, lines: string[]): vscode.Position | undefined {
        try {
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const columnIndex = lines[lineIndex].indexOf(text);
                if (columnIndex >= 0) {
                    return new vscode.Position(lineIndex, columnIndex);
                }
            }
        } catch (error) {
            const positionError = new PositionCalculationError(
                'Failed to find text position',
                text,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }

    /**
     * Finds position information from child nodes.
     * 
     * @param node - Parent node
     * @param lines - Array of file lines
     * @returns Position information or undefined
     */
    private findPositionInChildren(node: CSTNode, lines: string[]): vscode.Position | undefined {
        if (!node?.children) {
            return undefined;
        }
        
        try {
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        if (child?.image && typeof child.image === 'string') {
                            const position = this.findTextPosition(child.image, lines);
                            if (position) {
                                return position;
                            }
                        }
                        
                        const childPosition = this.findPositionInChildren(child, lines);
                        if (childPosition) {
                            return childPosition;
                        }
                    }
                }
            }
        } catch (error) {
            const positionError = new PositionCalculationError(
                'Failed to find position in child nodes',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }

    /**
     * Calculates range based on child nodes.
     * 
     * @param node - Parent node
     * @param lines - Array of file lines
     * @returns Range information or undefined
     */
    private calculateRangeFromChildren(node: CSTNode, lines: string[]): vscode.Range | undefined {
        if (!node?.children) {
            return undefined;
        }
        
        try {
            let minPosition: vscode.Position | undefined;
            let maxPosition: vscode.Position | undefined;
            
            for (const key of Object.keys(node.children)) {
                if (Array.isArray(node.children[key])) {
                    for (const child of node.children[key]) {
                        const childRange = this.calculateRange(child, lines);
                        
                        if (!minPosition || this.isPositionBefore(childRange.start, minPosition)) {
                            minPosition = childRange.start;
                        }
                        
                        if (!maxPosition || this.isPositionAfter(childRange.end, maxPosition)) {
                            maxPosition = childRange.end;
                        }
                    }
                }
            }
            
            if (minPosition && maxPosition) {
                return new vscode.Range(minPosition, maxPosition);
            }
        } catch (error) {
            const positionError = new PositionCalculationError(
                'Failed to calculate range from child nodes',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }

    /**
     * Checks if the first position is before the second position.
     * 
     * @param pos1 - First position
     * @param pos2 - Second position
     * @returns true if pos1 is before pos2
     */
    private isPositionBefore(pos1: vscode.Position, pos2: vscode.Position): boolean {
        return pos1.line < pos2.line || (pos1.line === pos2.line && pos1.character < pos2.character);
    }

    /**
     * Checks if the first position is after the second position.
     * 
     * @param pos1 - First position
     * @param pos2 - Second position
     * @returns true if pos1 is after pos2
     */
    private isPositionAfter(pos1: vscode.Position, pos2: vscode.Position): boolean {
        return pos1.line > pos2.line || (pos1.line === pos2.line && pos1.character > pos2.character);
    }

    /**
     * Extracts the name or type of a node.
     * 
     * @param node - Node
     * @returns Node name or 'Unknown'
     */
    private getNodeName(node: CSTNode): string {
        if (node?.image && typeof node.image === 'string') {
            return node.image;
        }
        
        if (node?.name && typeof node.name === 'string') {
            return node.name;
        }
        
        if (node?.type && typeof node.type === 'string') {
            return node.type;
        }
        
        return 'Unknown';
    }

    /**
     * Finds the actual position of a specific field in file content.
     * 
     * @param fieldName - Field name
     * @param fieldType - Field type
     * @param lines - Array of file lines
     * @returns Field position or undefined
     */
    public findFieldPosition(fieldName: string, fieldType: string, lines: string[]): vscode.Position | undefined {
        try {
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                
                if (line.includes('@Autowired')) {
                    // Check next few lines for field declaration since @Autowired
                    // typically appears immediately before the field declaration
                    for (let nextLineIndex = lineIndex + 1; 
                         nextLineIndex < Math.min(lineIndex + JAVA_PARSER_CONFIG.MAX_FIELD_SEARCH_LINES, lines.length); 
                         nextLineIndex++) {
                        
                        const nextLine = lines[nextLineIndex];
                        
                        // Match field declaration patterns: "Type fieldName" or "private Type fieldName"
                        const fieldPattern = new RegExp(`\\b${fieldType}\\s+${fieldName}\\b`);
                        if (fieldPattern.test(nextLine)) {
                            const columnIndex = nextLine.indexOf(fieldName);
                            if (columnIndex >= 0) {
                                return new vscode.Position(nextLineIndex, columnIndex);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            const positionError = new PositionCalculationError(
                'Failed to find field position',
                `${fieldType} ${fieldName}`,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }
} 