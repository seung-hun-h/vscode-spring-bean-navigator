import * as vscode from 'vscode';
import { JAVA_PARSER_CONFIG } from '../config/java-parser-config';
import { ErrorHandler, PositionCalculationError } from './parser-errors';
import { CSTNode } from '../../models/spring-types';

/**
 * AST 노드의 위치 및 범위 계산을 담당하는 클래스
 */
export class PositionCalculator {
    
    /**
     * CST 노드의 위치 정보를 계산합니다.
     * 
     * @param node - CST 노드
     * @param lines - 파일 라인 배열
     * @returns VSCode Position
     */
    public calculatePosition(node: CSTNode, lines: string[]): vscode.Position {
        try {
            // CST에서 실제 위치 정보 추출 시도
            if (node?.location?.startLine !== undefined && node?.location?.startColumn !== undefined) {
                // 1-based를 0-based로 변환
                return new vscode.Position(node.location.startLine - 1, node.location.startColumn - 1);
            }
            
            // image가 있는 경우 파일 내용에서 해당 텍스트 찾기
            if (node?.image && typeof node.image === 'string') {
                const position = this.findTextPosition(node.image, lines);
                if (position) {
                    return position;
                }
            }
            
            // 하위 노드에서 위치 정보 찾기
            const childPosition = this.findPositionInChildren(node, lines);
            if (childPosition) {
                return childPosition;
            }
            
        } catch (error) {
            const positionError = new PositionCalculationError(
                '위치 계산 실패',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        // fallback: 설정값 반환
        return new vscode.Position(
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.line, 
            JAVA_PARSER_CONFIG.POSITION_FALLBACK.character
        );
    }

    /**
     * CST 노드의 범위 정보를 계산합니다.
     * 
     * @param node - CST 노드
     * @param lines - 파일 라인 배열
     * @returns VSCode Range
     */
    public calculateRange(node: CSTNode, lines: string[]): vscode.Range {
        try {
            // CST에서 실제 범위 정보 추출 시도
            if (node?.location?.startLine !== undefined && 
                node?.location?.startColumn !== undefined &&
                node?.location?.endLine !== undefined && 
                node?.location?.endColumn !== undefined) {
                
                const start = new vscode.Position(node.location.startLine - 1, node.location.startColumn - 1);
                const end = new vscode.Position(node.location.endLine - 1, node.location.endColumn - 1);
                return new vscode.Range(start, end);
            }
            
            // image가 있는 경우 텍스트 길이를 기반으로 범위 계산
            if (node?.image && typeof node.image === 'string') {
                const start = this.findTextPosition(node.image, lines);
                if (start) {
                    const end = new vscode.Position(start.line, start.character + node.image.length);
                    return new vscode.Range(start, end);
                }
            }
            
            // 하위 노드를 기반으로 범위 계산
            const childRange = this.calculateRangeFromChildren(node, lines);
            if (childRange) {
                return childRange;
            }
            
        } catch (error) {
            const positionError = new PositionCalculationError(
                '범위 계산 실패',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        // fallback: 기본 범위 반환
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
     * 파일 내용에서 특정 텍스트의 위치를 찾습니다.
     * 
     * @param text - 찾을 텍스트
     * @param lines - 파일 라인 배열
     * @returns 위치 정보 또는 undefined
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
                '텍스트 위치 찾기 실패',
                text,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }

    /**
     * 하위 노드에서 위치 정보를 찾습니다.
     * 
     * @param node - 부모 노드
     * @param lines - 파일 라인 배열
     * @returns 위치 정보 또는 undefined
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
                '하위 노드 위치 찾기 실패',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }

    /**
     * 하위 노드들을 기반으로 범위를 계산합니다.
     * 
     * @param node - 부모 노드
     * @param lines - 파일 라인 배열
     * @returns 범위 정보 또는 undefined
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
                '하위 노드 범위 계산 실패',
                this.getNodeName(node),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }

    /**
     * 첫 번째 위치가 두 번째 위치보다 앞에 있는지 확인합니다.
     * 
     * @param pos1 - 첫 번째 위치
     * @param pos2 - 두 번째 위치
     * @returns pos1이 pos2보다 앞에 있으면 true
     */
    private isPositionBefore(pos1: vscode.Position, pos2: vscode.Position): boolean {
        return pos1.line < pos2.line || (pos1.line === pos2.line && pos1.character < pos2.character);
    }

    /**
     * 첫 번째 위치가 두 번째 위치보다 뒤에 있는지 확인합니다.
     * 
     * @param pos1 - 첫 번째 위치
     * @param pos2 - 두 번째 위치
     * @returns pos1이 pos2보다 뒤에 있으면 true
     */
    private isPositionAfter(pos1: vscode.Position, pos2: vscode.Position): boolean {
        return pos1.line > pos2.line || (pos1.line === pos2.line && pos1.character > pos2.character);
    }

    /**
     * 노드의 이름이나 타입을 추출합니다.
     * 
     * @param node - 노드
     * @returns 노드 이름 또는 'Unknown'
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
     * 특정 필드의 실제 위치를 파일 내용에서 찾습니다.
     * 
     * @param fieldName - 필드 이름
     * @param fieldType - 필드 타입
     * @param lines - 파일 라인 배열
     * @returns 필드 위치 또는 undefined
     */
    public findFieldPosition(fieldName: string, fieldType: string, lines: string[]): vscode.Position | undefined {
        try {
            // @Autowired와 필드 선언 패턴 찾기
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];
                
                // @Autowired 어노테이션 찾기
                if (line.includes('@Autowired')) {
                    // 다음 몇 줄에서 해당 필드 찾기
                    for (let nextLineIndex = lineIndex + 1; 
                         nextLineIndex < Math.min(lineIndex + JAVA_PARSER_CONFIG.MAX_FIELD_SEARCH_LINES, lines.length); 
                         nextLineIndex++) {
                        
                        const nextLine = lines[nextLineIndex];
                        
                        // 필드 선언 패턴: "타입 필드명" 또는 "private 타입 필드명"
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
                '필드 위치 찾기 실패',
                `${fieldType} ${fieldName}`,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(positionError);
        }
        
        return undefined;
    }
} 