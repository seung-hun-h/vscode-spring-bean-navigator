import * as vscode from 'vscode';
import { ConstructorInfo, ParameterInfo, SpringAnnotationType } from '../../models/spring-types';
import { Position } from 'vscode';
import { AnnotationParser } from './annotation-parser';
import { ErrorHandler } from '../core/parser-errors';

/**
 * Java 클래스에서 생성자를 추출하는 클래스
 * Spring Framework의 생성자 주입 패턴을 감지합니다.
 */
export class ConstructorExtractor {
    private readonly annotationParser: AnnotationParser;

    constructor(annotationParser?: AnnotationParser) {
        this.annotationParser = annotationParser || new AnnotationParser();
    }
    
    /**
     * Java 파일 내용에서 모든 생성자를 추출합니다.
     * @param content Java 파일 내용
     * @param uri 파일 URI
     * @returns 추출된 생성자 정보 배열
     */
    extractConstructors(content: string, uri: vscode.Uri): ConstructorInfo[] {
        if (!content || content.trim() === '') {
            return [];
        }
        
        // 클래스명을 최상위에서 추출하여 catch 블록에서도 접근 가능하도록 함
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
                
                // 생성자 패턴 찾기: public ClassName(...) - 한 줄 또는 여러 줄 처리
                const constructorRegex = new RegExp(`public\\s+${className}\\s*\\(`);
                const constructorStartRegex = new RegExp(`public\\s+${className}\\s*$`); // 다음 줄에 괄호
                
                if (constructorRegex.test(line) || constructorStartRegex.test(line)) {
                    const constructorInfo = this.parseConstructorFromLines(lines, i, className, uri);
                    if (constructorInfo) {
                        constructors.push(constructorInfo);
                    }
                }
            }
            return constructors;
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '생성자 추출');
            ErrorHandler.logError(parsingError, { 
                fileName: uri.toString(),
                className: className || 'Unknown',
                contentLength: content.length
            });
            return [];
        }
    }
    
    /**
     * 생성자 선언을 파싱합니다.
     * @param constructorDeclaration 생성자 선언문
     * @returns 파싱된 생성자 정보 또는 undefined
     */
    parseConstructorDeclaration(constructorDeclaration: string): { parameters: ParameterInfo[] } | undefined {
        try {
            // 메소드인지 확인 (반환 타입이 있으면 메소드)
            if (/public\s+\w+\s+\w+\s*\(/.test(constructorDeclaration) && !/public\s+\w+\s*\(/.test(constructorDeclaration)) {
                return undefined;
            }
            
            // 매개변수 부분 추출
            const parametersMatch = constructorDeclaration.match(/\(([^)]*)\)/);
            if (!parametersMatch) {
                return { parameters: [] };
            }
            
            const parametersString = parametersMatch[1].trim();
            const parameters = this.extractParametersFromDeclaration(parametersString);
            
            return { parameters };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '생성자 선언 파싱');
            ErrorHandler.logError(parsingError, { 
                constructorDeclaration: constructorDeclaration?.substring(0, 100) || 'Unknown'
            });
            return undefined;
        }
    }
    
    /**
     * @Autowired 어노테이션 감지 (AnnotationParser를 사용하여 통합된 로직 적용)
     * @param lines Java 파일 라인들
     * @param constructorLineIndex 생성자 라인 인덱스
     * @returns @Autowired 어노테이션 존재 여부
     */
    detectAutowiredAnnotation(lines: string[], constructorLineIndex: number): boolean {
        return this.annotationParser.detectAnnotationInLines(
            lines, 
            constructorLineIndex - 1, 
            SpringAnnotationType.AUTOWIRED
        );
    }
    
    /**
     * 매개변수 선언에서 매개변수들을 추출합니다.
     * @param parametersDeclaration 매개변수 선언 문자열
     * @returns 추출된 매개변수 정보 배열
     */
    extractParametersFromDeclaration(parametersDeclaration: string): ParameterInfo[] {
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
            const parsingError = ErrorHandler.handleParsingError(error, '매개변수 추출');
            ErrorHandler.logError(parsingError, { 
                parametersDeclaration: parametersDeclaration?.substring(0, 100) || 'Unknown'
            });
            return [];
        }
    }
    
    /**
     * 클래스명을 추출합니다.
     */
    private extractClassName(content: string): string | null {
        const classMatch = content.match(/public\s+class\s+(\w+)/);
        return classMatch ? classMatch[1] : null;
    }
    
    /**
     * 라인들에서 생성자 정보를 파싱합니다.
     */
    private parseConstructorFromLines(lines: string[], startIndex: number, className: string, uri: vscode.Uri): ConstructorInfo | null {
        try {
            let constructorDeclaration = '';
            let endIndex = startIndex;
            let bracketCount = 0;
            let foundOpenParen = false;
            
            // 다중 라인 생성자 처리 - 괄호 매칭으로 정확한 종료점 찾기
            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i];
                constructorDeclaration += line;
                
                // 괄호 카운팅 (문자열 리터럴 내부의 괄호는 제외)
                let inString = false;
                let stringChar = '';
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    const prevChar = j > 0 ? line[j-1] : '';
                    
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
                
                // 문자열 외부에서 중괄호나 세미콜론 발견 시 종료 (생성자 본문 시작)
                let foundBodyStart = false;
                inString = false;
                stringChar = '';
                for (let k = 0; k < line.length; k++) {
                    const char = line[k];
                    const prevChar = k > 0 ? line[k-1] : '';
                    
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
                if (i < lines.length - 1) {
                    constructorDeclaration += ' ';
                }
            }
            
            // 매개변수 추출 - 괄호 매칭을 정확하게 수행
            const cleanDeclaration = constructorDeclaration.replace(/\s+/g, ' ').trim();
            
            // 생성자 선언에서 매개변수 부분을 정확하게 추출
            const parametersString = this.extractParametersStringFromDeclaration(cleanDeclaration);
            const parameters = this.extractParametersFromDeclaration(parametersString);
            
            // @Autowired 감지
            const hasAutowiredAnnotation = this.detectAutowiredAnnotation(lines, startIndex);
            
            // 위치 정보 생성
            const position = new Position(startIndex, 0);
            const range = new vscode.Range(position, new Position(endIndex, lines[endIndex].length));
            
            return {
                parameters,
                hasAutowiredAnnotation,
                position,
                range
            };
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '생성자 라인 파싱');
            ErrorHandler.logError(parsingError, { 
                className: className || 'Unknown',
                startIndex: startIndex,
                fileName: uri.toString()
            });
            return null;
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
     * 생성자 선언에서 매개변수 문자열을 정확하게 추출합니다.
     */
    private extractParametersStringFromDeclaration(declaration: string): string {
        try {
            // 생성자 이름 뒤의 첫 번째 여는 괄호 찾기
            let constructorParenStart = -1;
            let constructorParenEnd = -1;
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
                
                if (!inString && char === '(' && constructorParenStart === -1) {
                    constructorParenStart = i;
                    bracketCount = 1;
                } else if (!inString && constructorParenStart !== -1) {
                    if (char === '(') {
                        bracketCount++;
                    } else if (char === ')') {
                        bracketCount--;
                        if (bracketCount === 0) {
                            constructorParenEnd = i;
                            break;
                        }
                    }
                }
            }
            
            if (constructorParenStart !== -1 && constructorParenEnd !== -1) {
                return declaration.substring(constructorParenStart + 1, constructorParenEnd);
            }
            
            return '';
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '생성자 매개변수 문자열 추출');
            ErrorHandler.logError(parsingError, { 
                declaration: declaration?.substring(0, 100) || 'Unknown'
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
            const parsingError = ErrorHandler.handleParsingError(error, '매개변수 파싱');
            ErrorHandler.logError(parsingError, { 
                parameterString: parameterString?.substring(0, 50) || 'Unknown'
            });
            return null;
        }
    }
} 