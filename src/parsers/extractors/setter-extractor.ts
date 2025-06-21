import * as vscode from 'vscode';
import { MethodInfo, ParameterInfo, AnnotationInfo, SpringAnnotationType } from '../../models/spring-types';

/**
 * Java 클래스에서 setter 메서드를 추출하는 클래스
 * Spring Framework의 setter 주입 패턴을 감지합니다.
 */
export class SetterExtractor {
    
    /**
     * Java 파일 내용에서 @Autowired가 붙은 setter 메서드들을 추출합니다.
     * @param content Java 파일 내용
     * @param uri 파일 URI
     * @returns 추출된 setter 메서드 정보 배열
     */
    extractSetterMethods(content: string, uri: vscode.Uri): MethodInfo[] {
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
                    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
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
                    // 먼저 @Autowired 어노테이션이 있는지 확인
                    const hasAutowired = this.detectAutowiredAnnotation(lines, i);
                    if (hasAutowired) {
                        const methodInfo = this.parseMethodFromLines(lines, i, uri);
                        if (methodInfo && methodInfo.isSetterMethod) {
                            // @Autowired 어노테이션 추가
                            const autowiredAnnotation: AnnotationInfo = {
                                name: 'Autowired',
                                type: SpringAnnotationType.AUTOWIRED,
                                line: i - 1, // 어노테이션은 메서드 위에 있음
                                column: 0
                            };
                            methodInfo.annotations = [autowiredAnnotation];
                            
                            // 다른 어노테이션도 찾기 (@Qualifier 등)
                            const additionalAnnotations = this.extractMethodAnnotations(lines, i);
                            methodInfo.annotations.push(...additionalAnnotations);
                            
                            methods.push(methodInfo);
                        }
                    }
                }
            }
            
            return methods;
        } catch (error) {
            console.error('Error extracting setter methods:', error);
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
            return undefined;
        }
    }
    
    /**
     * 메서드 선언을 파싱합니다.
     * @param methodDeclaration 메서드 선언문
     * @returns 파싱된 메서드 정보 또는 undefined
     */
    parseMethodDeclaration(methodDeclaration: string): { name: string; returnType: string; parameters: ParameterInfo[] } | undefined {
        try {
            // 필드 선언이면 무시
            if (methodDeclaration.includes(';') && !methodDeclaration.includes('(')) {
                return undefined;
            }
            
            // 메서드 패턴: [접근제어자] [반환타입] [메서드명]([매개변수])
            const methodMatch = methodDeclaration.match(/\b(public|private|protected)\s+([\w<>,\s]+)\s+(\w+)\s*\(([^)]*)\)/);
            if (!methodMatch) {
                return undefined;
            }
            
            const returnType = methodMatch[2].trim();
            const methodName = methodMatch[3].trim();
            const parametersString = methodMatch[4].trim();
            
            const parameters = this.extractParametersFromDeclaration(parametersString);
            
            return {
                name: methodName,
                returnType,
                parameters
            };
        } catch (error) {
            return undefined;
        }
    }
    
    /**
     * @Autowired 어노테이션 감지
     * @param lines Java 파일 라인들
     * @param methodLineIndex 메서드 라인 인덱스
     * @returns @Autowired 어노테이션 존재 여부
     */
    detectAutowiredAnnotation(lines: string[], methodLineIndex: number): boolean {
        try {
            // 메서드 바로 위의 라인들에서만 @Autowired 찾기
            for (let i = methodLineIndex - 1; i >= 0; i--) {
                const line = lines[i].trim();
                
                // 실제 어노테이션 패턴만 매칭 (주석 내의 텍스트는 제외)
                if (/^\s*@Autowired\b/.test(line) || /^\s*@org\.springframework\.beans\.factory\.annotation\.Autowired\b/.test(line)) {
                    return true;
                }
                
                // 빈 라인이나 주석은 건너뛰기
                if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                    continue;
                }
                
                // 다른 어노테이션은 계속 확인
                if (line.startsWith('@')) {
                    continue;
                }
                
                // 어노테이션이 아닌 실제 코드(필드, 메서드, 클래스, 중괄호 등)가 나오면 중단
                if (line && (line.includes('{') || line.includes('}') || line.includes(';') || 
                           line.includes('public ') || line.includes('private ') || line.includes('protected '))) {
                    break;
                }
            }
            return false;
        } catch (error) {
            return false;
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
                   methodName.length > 3 && 
                   parameterCount > 0;
        } catch (error) {
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
                
                // 문자열 외부에서 중괄고나 세미콜론 발견 시 종료 (메서드 본문 시작)
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
                    methodDeclaration += ' ';
                }
            }
            
            // 메서드 선언 파싱
            const cleanDeclaration = methodDeclaration.replace(/\s+/g, ' ').trim();
            
            // 여러 줄에 걸친 매개변수를 올바르게 추출하기 위해 ConstructorExtractor의 로직 재사용
            const parametersString = this.extractParametersStringFromDeclaration(cleanDeclaration);
            
            const parsedMethod = this.parseMethodDeclarationWithParameters(cleanDeclaration, parametersString);
            
            if (!parsedMethod) {
                return null;
            }
            
            // setter 메서드인지 확인
            const isSetterMethod = this.isSetterMethod(parsedMethod.name, parsedMethod.parameters.length);
            
            // 위치 정보 생성
            const position = new vscode.Position(startIndex, 0);
            const range = new vscode.Range(position, new vscode.Position(endIndex, lines[endIndex].length));
            
            return {
                name: parsedMethod.name,
                parameters: parsedMethod.parameters,
                range,
                annotations: [], // 나중에 채워짐
                isSetterMethod,
                position,
                returnType: parsedMethod.returnType
            };
        } catch (error) {
            return null;
        }
    }
    
    /**
     * 메서드의 어노테이션들을 추출합니다.
     */
    private extractMethodAnnotations(lines: string[], methodLineIndex: number): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            for (let i = methodLineIndex - 1; i >= 0 && i >= methodLineIndex - 5; i--) {
                const line = lines[i].trim();
                
                // @Qualifier, @Value 등의 어노테이션 찾기
                if (line.startsWith('@') && !line.includes('@Autowired')) {
                    const annotationMatch = line.match(/@(\w+)/);
                    if (annotationMatch) {
                        const annotationName = annotationMatch[1];
                        let annotationType: SpringAnnotationType;
                        
                        // 어노테이션 타입 결정
                        switch (annotationName.toLowerCase()) {
                            case 'qualifier':
                                // @Qualifier는 현재 SpringAnnotationType에 없으므로 임시로 AUTOWIRED 사용
                                annotationType = SpringAnnotationType.AUTOWIRED;
                                break;
                            case 'value':
                                annotationType = SpringAnnotationType.AUTOWIRED;
                                break;
                            default:
                                annotationType = SpringAnnotationType.AUTOWIRED;
                        }
                        
                        annotations.push({
                            name: annotationName,
                            type: annotationType,
                            line: i,
                            column: 0
                        });
                    }
                }
                
                // 다른 어노테이션이나 주석이 아닌 실제 코드가 나오면 중단
                if (line && !line.startsWith('@') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
                    break;
                }
            }
        } catch (error) {
            // 에러 발생 시 빈 배열 반환
        }
        
        return annotations;
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
     * (ConstructorExtractor의 로직과 동일)
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
            return null;
        }
    }
} 