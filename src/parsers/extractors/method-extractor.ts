import * as vscode from 'vscode';
import { MethodInfo, ParameterInfo, AnnotationInfo } from '../../models/spring-types';
import { AnnotationParser } from './annotation-parser';
import { ErrorHandler } from '../core/parser-errors';
import { PARSING_CONSTANTS } from '../config/java-parser-config';

/**
 * Java 클래스에서 모든 메서드를 추출하는 클래스
 * @Bean 메서드와 일반 메서드를 모두 감지합니다.
 */
export class MethodExtractor {
    private readonly annotationParser: AnnotationParser;

    constructor(annotationParser?: AnnotationParser) {
        this.annotationParser = annotationParser || new AnnotationParser();
    }
    
    /**
     * Java 파일 내용에서 모든 메서드들을 추출합니다.
     * @param content Java 파일 내용
     * @param uri 파일 URI
     * @returns 추출된 메서드 정보 배열
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
                
                // 메서드 선언 패턴 찾기: public/private/protected ... methodName(...) - 한 줄 또는 여러 줄 처리
                const methodRegex = /\b(public|private|protected)\s+[\w<>,\s]+\s+(\w+)\s*\(/;
                const methodStartRegex = /\b(public|private|protected)\s+([\w<>,\s]+\s+)?(\w+)\s*$/; // 다음 줄에 괄호
                
                // 여러 줄에 걸친 메서드를 위한 추가 검사
                let isMethodDeclaration = false;
                if (methodStartRegex.test(line)) {
                    // 다음 줄에 여는 괄호가 있는지 확인
                    for (let j = i + PARSING_CONSTANTS.ARRAY_OFFSET.NEXT; j < Math.min(i + PARSING_CONSTANTS.SETTER_METHOD_SEARCH_RANGE, lines.length); j++) {
                        const nextLine = lines[j].trim();
                        if (nextLine.includes('(')) {
                            isMethodDeclaration = true;
                            break;
                        }
                        if (nextLine && !nextLine.startsWith('@')) {
                            break; // 어노테이션이 아닌 다른 코드가 나오면 중단
                        }
                    }
                }
                
                if (methodRegex.test(line) || isMethodDeclaration) {
                    const methodInfo = this.parseMethodFromLines(lines, i, uri);
                    if (methodInfo) {
                        // 모든 어노테이션을 한 번에 추출
                        const allAnnotations = this.extractMethodAnnotations(lines, i);
                        methodInfo.annotations = allAnnotations;
                        
                        methods.push(methodInfo);
                    }
                }
            }
            
            return methods;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '메서드 추출');
            ErrorHandler.logError(parsingError, { 
                fileName: uri.toString(),
                contentLength: content.length
            });
            return [];
        }
    }
    
    /**
     * 메서드 선언을 정확한 매개변수 문자열과 함께 파싱합니다.
     * @param methodDeclaration 메서드 선언문
     * @param parametersString 정확하게 추출된 매개변수 문자열
     * @returns 파싱된 메서드 정보 또는 undefined
     */
    parseMethodDeclarationWithParameters(methodDeclaration: string, parametersString: string): { name: string; returnType: string; parameters: ParameterInfo[] } | undefined {
        try {
            // 필드 선언이면 무시
            if (methodDeclaration.includes(';') && !methodDeclaration.includes('(')) {
                return undefined;
            }
            
            // 메서드 패턴: [접근제어자] [반환타입] [메서드명]([매개변수])
            const methodMatch = methodDeclaration.match(/\b(public|private|protected)\s+([\w<>,\s]+)\s+(\w+)\s*\(/);
            if (!methodMatch) {
                return undefined;
            }
            
            const returnType = methodMatch[2].trim();
            const methodName = methodMatch[3].trim();
            
            // 정확하게 추출된 매개변수 문자열 사용
            const parameters = this.extractParametersFromDeclaration(parametersString);
            
            return {
                name: methodName,
                returnType,
                parameters
            };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '매개변수와 함께 메서드 선언 파싱');
            ErrorHandler.logError(parsingError, { 
                methodDeclaration: methodDeclaration?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.ERROR_MESSAGE_MAX_LENGTH) || 'Unknown',
                parametersString: parametersString?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.PARAMETER_STRING_MAX_LENGTH) || 'Unknown'
            });
            return undefined;
        }
    }
    
    /**
     * setter 메서드인지 판별합니다.
     * @param methodName 메서드 이름
     * @param parameterCount 매개변수 개수
     * @returns setter 메서드 여부
     */
    isSetterMethod(methodName: string, parameterCount: number): boolean {
        try {
            // setXxx 패턴이고 매개변수가 1개 이상이어야 함
            return methodName.startsWith('set') && 
                   methodName.length > PARSING_CONSTANTS.SETTER_PREFIX_LENGTH && 
                   parameterCount > PARSING_CONSTANTS.MIN_ARRAY_INDEX;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Setter 메서드 판별');
            ErrorHandler.logError(parsingError, { 
                methodName: methodName || 'Unknown',
                parameterCount: parameterCount || PARSING_CONSTANTS.MIN_ARRAY_INDEX
            });
            return false;
        }
    }
    
    /**
     * 라인들에서 메서드 정보를 파싱합니다.
     */
    private parseMethodFromLines(lines: string[], startIndex: number, uri: vscode.Uri): MethodInfo | null {
        try {
            let methodDeclaration = '';
            let endIndex = startIndex;
            let bracketCount = 0;
            let foundOpenParen = false;
            
            // 다중 라인 메서드 처리 - 괄호 매칭으로 정확한 종료점 찾기
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                methodDeclaration += line;
                
                // 괄호 카운팅 (문자열 리터럴 내부의 괄호는 제외)
                let inString = false;
                let stringChar = '';
                for (let j = PARSING_CONSTANTS.MIN_ARRAY_INDEX; j < line.length; j++) {
                    const char = line[j];
                    const prevChar = j > PARSING_CONSTANTS.MIN_ARRAY_INDEX ? line[j + PARSING_CONSTANTS.ARRAY_OFFSET.PREV] : '';
                    
                    // 문자열 시작/종료 처리
                    if ((char === '"' || char === "'") && prevChar !== '\\') {
                        if (!inString) {
                            inString = true;
                            stringChar = char;
                        } else if (char === stringChar) {
                            inString = false;
                            stringChar = '';
                        }
                    }
                    
                    // 문자열 외부의 괄호만 카운팅
                    if (!inString) {
                        if (char === '(') {
                            bracketCount++;
                            foundOpenParen = true;
                        } else if (char === ')') {
                            bracketCount--;
                        }
                    }
                }
                
                // 괄호가 모두 닫혔으면 종료
                if (foundOpenParen && bracketCount === 0) {
                    endIndex = i;
                    break;
                }
                
                // 문자열 외부에서 중괄호나 세미콜론 발견 시 종료 (메서드 본문 시작)
                let foundBodyStart = false;
                inString = false;
                stringChar = '';
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
                        foundBodyStart = true;
                        break;
                    }
                }
                
                if (foundOpenParen && foundBodyStart) {
                    endIndex = i;
                    break;
                }
                
                // 다음 줄이 있으면 공백 추가
                if (i < lines.length + PARSING_CONSTANTS.ARRAY_OFFSET.PREV) {
                    methodDeclaration += ' ';
                }
            }
            
            // 메서드 선언 파싱
            const cleanDeclaration = methodDeclaration.replace(/\s+/g, ' ').trim();
            
            // 여러 줄에 걸친 매개변수를 올바르게 추출하기 위해 정확한 매개변수 추출
            const parametersString = this.extractParametersStringFromDeclaration(cleanDeclaration);
            
            const parsedMethod = this.parseMethodDeclarationWithParameters(cleanDeclaration, parametersString);
            
            if (!parsedMethod) {
                return null;
            }
            
            // 각 매개변수의 정확한 위치 정보 계산
            const parametersWithPositions = this.calculateParameterPositions(
                parsedMethod.parameters, 
                lines, 
                startIndex, 
                endIndex
            );
            
            // setter 메서드인지 확인
            const isSetterMethod = this.isSetterMethod(parsedMethod.name, parsedMethod.parameters.length);
            
            // 위치 정보 생성
            const position = new vscode.Position(startIndex, PARSING_CONSTANTS.DEFAULT_POSITION.CHARACTER);
            const range = new vscode.Range(position, new vscode.Position(endIndex, lines[endIndex].length));
            
            return {
                name: parsedMethod.name,
                parameters: parametersWithPositions,
                range,
                annotations: [], // 나중에 채워짐
                isSetterMethod,
                position,
                returnType: parsedMethod.returnType
            };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '메서드 라인 파싱');
            ErrorHandler.logError(parsingError, { 
                startIndex: startIndex,
                fileName: uri.toString()
            });
            return null;
        }
    }
    
    /**
     * 메서드의 어노테이션들을 추출합니다.
     */
    private extractMethodAnnotations(lines: string[], methodLineIndex: number): AnnotationInfo[] {
        return this.annotationParser.extractMethodAnnotationsFromLines(lines, methodLineIndex);
    }
    
    /**
     * 매개변수 선언에서 매개변수들을 추출합니다.
     * @param parametersDeclaration 매개변수 선언 문자열
     * @returns 추출된 매개변수 정보 배열
     */
    private extractParametersFromDeclaration(parametersDeclaration: string): ParameterInfo[] {
        if (!parametersDeclaration || parametersDeclaration.trim() === '') {
            return [];
        }
        
        try {
            const parameters: ParameterInfo[] = [];
            
            // 매개변수들을 쉼표로 분리 (제네릭 고려)
            const parameterStrings = this.splitParameters(parametersDeclaration);
            
            for (const paramStr of parameterStrings) {
                const param = this.parseParameter(paramStr.trim());
                if (param) {
                    parameters.push(param);
                }
            }
            
            return parameters;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '메서드 매개변수 추출');
            ErrorHandler.logError(parsingError, { 
                parametersDeclaration: parametersDeclaration?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.ERROR_MESSAGE_MAX_LENGTH) || 'Unknown'
            });
            return [];
        }
    }
    
    /**
     * 매개변수를 제네릭을 고려하여 분리합니다.
     */
    private splitParameters(parametersDeclaration: string): string[] {
        const parameters: string[] = [];
        let current = '';
        let depth = 0;
        
        for (let i = 0; i < parametersDeclaration.length; i++) {
            const char = parametersDeclaration[i];
            
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
     * 메서드 선언에서 매개변수 문자열을 정확하게 추출합니다.
     */
    private extractParametersStringFromDeclaration(declaration: string): string {
        try {
            // 메서드 이름 뒤의 첫 번째 여는 괄호 찾기
            let methodParenStart = -1;
            let methodParenEnd = -1;
            let bracketCount = 0;
            let inString = false;
            let stringChar = '';
            
            // 첫 번째 여는 괄호 찾기
            for (let i = 0; i < declaration.length; i++) {
                const char = declaration[i];
                const prevChar = i > 0 ? declaration[i-1] : '';
                
                // 문자열 처리
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
            const parsingError = ErrorHandler.handleParsingError(error, '메서드 매개변수 문자열 추출');
            ErrorHandler.logError(parsingError, { 
                declaration: declaration?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.ERROR_MESSAGE_MAX_LENGTH) || 'Unknown'
            });
            return '';
        }
    }
    
    /**
     * 단일 매개변수를 파싱합니다.
     */
    private parseParameter(parameterString: string): ParameterInfo | null {
        try {
            // 어노테이션 제거
            let cleanParam = parameterString.replace(/@\w+(\([^)]*\))?\s*/g, '');
            
            // 타입과 변수명 분리
            const parts = cleanParam.trim().split(/\s+/);
            if (parts.length < 2) {
                return null;
            }
            
            // 마지막이 변수명, 나머지가 타입
            const name = parts[parts.length - 1];
            const type = parts.slice(0, -1).join(' ');
            
            return { name, type };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '메서드 매개변수 파싱');
            ErrorHandler.logError(parsingError, { 
                parameterString: parameterString?.substring(PARSING_CONSTANTS.MIN_ARRAY_INDEX, PARSING_CONSTANTS.PARAMETER_STRING_MAX_LENGTH) || 'Unknown'
            });
            return null;
        }
    }

    /**
     * 매개변수들의 정확한 위치 정보를 계산합니다.
     * 
     * @param parameters - 기본 매개변수 정보들
     * @param lines - 파일의 모든 라인들
     * @param methodStartIndex - 메서드 시작 라인 인덱스
     * @param methodEndIndex - 메서드 종료 라인 인덱스
     * @returns 위치 정보가 포함된 매개변수 배열
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
                // 각 매개변수의 위치를 찾기
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
            const parsingError = ErrorHandler.handleParsingError(error, '매개변수 위치 계산');
            ErrorHandler.logError(parsingError, { 
                parameterCount: parameters.length,
                methodStartIndex,
                methodEndIndex
            });
            // 에러 발생 시 기본 매개변수 정보 반환
            return parameters;
        }

        return parametersWithPositions;
    }

    /**
     * 특정 매개변수의 위치를 찾습니다.
     * 
     * @param parameterName - 찾을 매개변수 이름
     * @param lines - 파일의 모든 라인들
     * @param startIndex - 검색 시작 라인 인덱스
     * @param endIndex - 검색 종료 라인 인덱스
     * @returns 매개변수의 위치 정보
     */
    private findParameterPosition(
        parameterName: string, 
        lines: string[], 
        startIndex: number, 
        endIndex: number
    ): { position: vscode.Position; range: vscode.Range } {
        try {
            // 매개변수 이름이 나타나는 라인을 찾기
            for (let i = startIndex; i <= endIndex && i < lines.length; i++) {
                const line = lines[i];
                const parameterIndex = line.indexOf(parameterName);
                
                // 매개변수 이름을 찾았고, 이것이 변수명일 가능성이 높은 경우
                if (parameterIndex !== -1) {
                    // 변수명 앞뒤의 문자를 확인하여 정확한 매개변수인지 검증
                    const beforeChar = parameterIndex > 0 ? line[parameterIndex - 1] : ' ';
                    const afterIndex = parameterIndex + parameterName.length;
                    const afterChar = afterIndex < line.length ? line[afterIndex] : ' ';
                    
                    // 단어 경계 확인 (앞뒤가 공백이나 특수문자여야 함)
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
            const parsingError = ErrorHandler.handleParsingError(error, '매개변수 위치 검색');
            ErrorHandler.logError(parsingError, { 
                parameterName,
                startIndex,
                endIndex
            });
        }

        // 찾지 못한 경우 기본 위치 반환
        const defaultPosition = new vscode.Position(startIndex, 0);
        const defaultRange = new vscode.Range(defaultPosition, defaultPosition);
        return { position: defaultPosition, range: defaultRange };
    }
} 