import { AnnotationInfo, SpringAnnotationType } from '../../models/spring-types';
import { JAVA_PARSER_CONFIG, SPRING_ANNOTATION_NAMES, SPRING_ANNOTATION_PACKAGES } from '../config/java-parser-config';
import { ErrorHandler, AnnotationParsingError } from '../core/parser-errors';
import { PositionCalculator } from '../core/position-calculator';

/**
 * Java 어노테이션 파싱을 담당하는 클래스
 */
export class AnnotationParser {
    private readonly positionCalculator: PositionCalculator;

    constructor(positionCalculator?: PositionCalculator) {
        this.positionCalculator = positionCalculator || new PositionCalculator();
    }

    /**
     * 어노테이션을 파싱합니다.
     * 
     * @param annotation - 어노테이션 노드
     * @param lines - 파일 라인 배열
     * @returns 어노테이션 정보 또는 undefined
     */
    public parseAnnotation(annotation: any, lines: string[]): AnnotationInfo | undefined {
        let annotationName: string | undefined;
        
        try {
            let parameters = new Map<string, string>();
            
            // 실제 구조: annotation.children = ['At', 'typeName'] 또는 ['At', 'typeName', 'LParen', 'elementValuePairList', 'RParen']
            if (annotation.children?.typeName?.[0]?.children?.Identifier?.[0]?.image) {
                annotationName = annotation.children.typeName[0].children.Identifier[0].image;
            } else {
                return undefined;
            }
            
            if (!annotationName) {
                return undefined;
            }

            // Spring 어노테이션인지 확인
            if (!JAVA_PARSER_CONFIG.SPRING_ANNOTATIONS.has(annotationName)) {
                return undefined;
            }

            // 어노테이션 매개변수 파싱 시도
            parameters = this.extractAnnotationParameters(annotation);

            const springAnnotationType = this.mapToSpringAnnotationType(annotationName);
            if (!springAnnotationType) {
                return undefined;
            }

            // 위치 정보 계산
            const position = this.positionCalculator.calculatePosition(annotation, lines);

            const annotationInfo: AnnotationInfo = {
                name: annotationName,
                type: springAnnotationType,
                line: position.line,
                column: position.character,
                parameters
            };

            return annotationInfo;
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                '어노테이션 파싱 실패',
                annotationName,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
            return undefined;
        }
    }

    /**
     * 어노테이션 매개변수를 추출합니다.
     * 
     * @param annotation - 어노테이션 노드
     * @returns 매개변수 맵
     */
    public extractAnnotationParameters(annotation: any): Map<string, string> {
        const parameters = new Map<string, string>();
        
        try {
            // @Service("value") 형태의 단일 값
            if (annotation.children?.LParen && annotation.children?.StringLiteral) {
                const value = annotation.children.StringLiteral[0].image;
                // 따옴표 제거
                const cleanValue = value.replace(/["']/g, '');
                parameters.set('value', cleanValue);
                return parameters;
            }
            
            // elementValuePairList 구조 확인 (향후 확장용)
            if (annotation.children?.elementValuePairList) {
                // TODO: 더 복잡한 매개변수 구조 파싱
                const pairListParams = this.extractElementValuePairList(annotation.children.elementValuePairList[0]);
                pairListParams.forEach((value, key) => parameters.set(key, value));
                return parameters;
            }
            
            // 모든 자식 노드를 탐색해서 문자열 리터럴 찾기
            const literals = this.findStringLiterals(annotation);
            if (literals.length > 0) {
                parameters.set('value', literals[0]);
            }
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                '어노테이션 매개변수 추출 실패',
                this.getAnnotationName(annotation),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return parameters;
    }

    /**
     * 문자열을 SpringAnnotationType으로 매핑합니다. (상수 사용으로 리팩토링)
     * 
     * @param annotationName - 어노테이션 이름
     * @returns SpringAnnotationType 또는 undefined
     */
    private mapToSpringAnnotationType(annotationName: string): SpringAnnotationType | undefined {
        switch (annotationName) {
            // Spring Framework 어노테이션
            case SPRING_ANNOTATION_NAMES.COMPONENT: return SpringAnnotationType.COMPONENT;
            case SPRING_ANNOTATION_NAMES.SERVICE: return SpringAnnotationType.SERVICE;
            case SPRING_ANNOTATION_NAMES.REPOSITORY: return SpringAnnotationType.REPOSITORY;
            case SPRING_ANNOTATION_NAMES.CONTROLLER: return SpringAnnotationType.CONTROLLER;
            case SPRING_ANNOTATION_NAMES.REST_CONTROLLER: return SpringAnnotationType.REST_CONTROLLER;
            case SPRING_ANNOTATION_NAMES.CONFIGURATION: return SpringAnnotationType.CONFIGURATION;
            case SPRING_ANNOTATION_NAMES.BEAN: return SpringAnnotationType.BEAN;
            case SPRING_ANNOTATION_NAMES.AUTOWIRED: return SpringAnnotationType.AUTOWIRED;
            case SPRING_ANNOTATION_NAMES.QUALIFIER: return SpringAnnotationType.QUALIFIER;
            case SPRING_ANNOTATION_NAMES.VALUE: return SpringAnnotationType.VALUE;
            // Phase 3: Lombok 어노테이션들
            case SPRING_ANNOTATION_NAMES.REQUIRED_ARGS_CONSTRUCTOR: return SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR;
            case SPRING_ANNOTATION_NAMES.ALL_ARGS_CONSTRUCTOR: return SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR;
            case SPRING_ANNOTATION_NAMES.NO_ARGS_CONSTRUCTOR: return SpringAnnotationType.LOMBOK_NO_ARGS_CONSTRUCTOR;
            case SPRING_ANNOTATION_NAMES.DATA: return SpringAnnotationType.LOMBOK_DATA;
            case SPRING_ANNOTATION_NAMES.LOMBOK_VALUE: return SpringAnnotationType.LOMBOK_VALUE;
            case SPRING_ANNOTATION_NAMES.SLF4J: return SpringAnnotationType.LOMBOK_SLF4J;
            case SPRING_ANNOTATION_NAMES.NON_NULL: return SpringAnnotationType.LOMBOK_NON_NULL;
            case SPRING_ANNOTATION_NAMES.NONNULL: return SpringAnnotationType.LOMBOK_NON_NULL;  // JSR-305 javax.annotation.Nonnull
            default: return undefined;
        }
    }

    /**
     * elementValuePairList에서 키-값 쌍을 추출합니다.
     * 
     * @param pairList - elementValuePairList 노드
     * @returns 매개변수 맵
     */
    private extractElementValuePairList(pairList: any): Map<string, string> {
        const parameters = new Map<string, string>();
        
        try {
            if (pairList.children?.elementValuePair) {
                const pairs = pairList.children.elementValuePair;
                
                for (const pair of pairs) {
                    const key = this.extractElementKey(pair);
                    const value = this.extractElementValue(pair);
                    
                    if (key && value) {
                        parameters.set(key, value);
                    }
                }
            }
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                'elementValuePairList 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return parameters;
    }

    /**
     * elementValuePair에서 키를 추출합니다.
     * 
     * @param pair - elementValuePair 노드
     * @returns 키 문자열 또는 undefined
     */
    private extractElementKey(pair: any): string | undefined {
        try {
            if (pair.children?.Identifier?.[0]?.image) {
                return pair.children.Identifier[0].image;
            }
        } catch (error) {
            ErrorHandler.logError(new AnnotationParsingError(
                'element key 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            ));
        }
        
        return undefined;
    }

    /**
     * elementValuePair에서 값을 추출합니다.
     * 
     * @param pair - elementValuePair 노드
     * @returns 값 문자열 또는 undefined
     */
    private extractElementValue(pair: any): string | undefined {
        try {
            if (pair.children?.elementValue?.[0]) {
                const elementValue = pair.children.elementValue[0];
                
                // String literal 값
                if (elementValue.children?.conditionalExpression?.[0]?.children?.StringLiteral) {
                    const value = elementValue.children.conditionalExpression[0].children.StringLiteral[0].image;
                    return value.replace(/["']/g, '');
                }
                
                // 다른 형태의 값들도 처리 가능하도록 확장
                const literals = this.findStringLiterals(elementValue);
                if (literals.length > 0) {
                    return literals[0];
                }
            }
        } catch (error) {
            ErrorHandler.logError(new AnnotationParsingError(
                'element value 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            ));
        }
        
        return undefined;
    }

    /**
     * 노드에서 모든 문자열 리터럴을 재귀적으로 찾습니다.
     * 
     * @param node - 탐색할 노드
     * @returns 문자열 리터럴 배열
     */
    private findStringLiterals(node: any): string[] {
        const literals: string[] = [];
        
        try {
            if (node?.image && typeof node.image === 'string' && (node.image.startsWith('"') || node.image.startsWith("'"))) {
                literals.push(node.image.replace(/["']/g, ''));
            }
            
            if (node?.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            literals.push(...this.findStringLiterals(child));
                        }
                    }
                }
            }
        } catch (error) {
            ErrorHandler.logError(new AnnotationParsingError(
                'string literal 찾기 실패',
                undefined,
                error instanceof Error ? error : undefined
            ));
        }
        
        return literals;
    }

    /**
     * 어노테이션 노드에서 어노테이션 이름을 추출합니다.
     * 
     * @param annotation - 어노테이션 노드
     * @returns 어노테이션 이름 또는 'Unknown'
     */
    private getAnnotationName(annotation: any): string {
        try {
            if (annotation?.children?.typeName?.[0]?.children?.Identifier?.[0]?.image) {
                return annotation.children.typeName[0].children.Identifier[0].image;
            }
        } catch (error) {
            // 에러 로깅은 생략 (너무 많은 로그 방지)
        }
        
        return 'Unknown';
    }

    /**
     * 특정 어노테이션 타입인지 확인합니다.
     * 
     * @param annotation - 어노테이션 노드
     * @param targetType - 확인할 타입
     * @returns 해당 타입이면 true
     */
    public isAnnotationType(annotation: any, targetType: SpringAnnotationType): boolean {
        try {
            const annotationInfo = this.parseAnnotation(annotation, []);
            return annotationInfo?.type === targetType;
        } catch (error) {
            return false;
        }
    }

    /**
     * 어노테이션 배열에서 특정 타입의 어노테이션을 찾습니다.
     * 
     * @param annotations - 어노테이션 정보 배열
     * @param targetType - 찾을 타입
     * @returns 해당 타입의 어노테이션 또는 undefined
     */
    public findAnnotationByType(annotations: AnnotationInfo[], targetType: SpringAnnotationType): AnnotationInfo | undefined {
        return annotations.find(annotation => annotation.type === targetType);
    }

    /**
     * 어노테이션이 특정 매개변수를 가지고 있는지 확인합니다.
     * 
     * @param annotation - 어노테이션 정보
     * @param paramName - 매개변수 이름
     * @returns 매개변수 값 또는 undefined
     */
    public getAnnotationParameter(annotation: AnnotationInfo, paramName: string): string | undefined {
        return annotation.parameters?.get(paramName);
    }

    /**
     * 라인들에서 특정 어노테이션을 감지합니다. (메서드/생성자 위의 어노테이션 탐지용)
     * 
     * @param lines - Java 파일 라인들
     * @param startLineIndex - 탐지를 시작할 라인 인덱스
     * @param annotationType - 찾을 어노테이션 타입
     * @param maxLookupLines - 최대 탐색 라인 수 (기본값: 5)
     * @returns 어노테이션을 찾았으면 true
     */
    public detectAnnotationInLines(
        lines: string[], 
        startLineIndex: number, 
        annotationType: SpringAnnotationType,
        maxLookupLines: number = 5
    ): boolean {
        try {
            // 시작 라인부터 역순으로 탐색
            for (let i = startLineIndex; i >= 0 && i >= startLineIndex - maxLookupLines; i--) {
                const line = lines[i].trim();
                
                // @Autowired 패턴 매칭 (상수 사용)
                if (annotationType === SpringAnnotationType.AUTOWIRED) {
                    const autowiredPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_NAMES.AUTOWIRED}\\b`);
                    const autowiredFullPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_PACKAGES.AUTOWIRED_FULL.replace('.', '\\.')}\\b`);
                    if (autowiredPattern.test(line) || autowiredFullPattern.test(line)) {
                        return true;
                    }
                }
                
                // Lombok 어노테이션들 (상수 사용)
                if (annotationType === SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR) {
                    const requiredArgsPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_NAMES.REQUIRED_ARGS_CONSTRUCTOR}\\b`);
                    const requiredArgsFullPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_PACKAGES.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR_FULL.replace('.', '\\.')}\\b`);
                    if (requiredArgsPattern.test(line) || requiredArgsFullPattern.test(line)) {
                        return true;
                    }
                }
                
                if (annotationType === SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR) {
                    const allArgsPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_NAMES.ALL_ARGS_CONSTRUCTOR}\\b`);
                    const allArgsFullPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_PACKAGES.LOMBOK_ALL_ARGS_CONSTRUCTOR_FULL.replace('.', '\\.')}\\b`);
                    if (allArgsPattern.test(line) || allArgsFullPattern.test(line)) {
                        return true;
                    }
                }
                
                // 빈 라인이나 주석은 건너뛰기
                if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                    continue;
                }
                
                // 다른 어노테이션은 계속 확인
                if (line.startsWith('@')) {
                    continue;
                }
                
                // 어노테이션이 아닌 실제 코드가 나오면 중단
                if (line && (line.includes('{') || line.includes('}') || line.includes(';') || 
                           line.includes('public ') || line.includes('private ') || line.includes('protected '))) {
                    break;
                }
            }
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                '라인 어노테이션 감지 실패',
                annotationType.toString(),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return false;
    }

    /**
     * 라인들에서 메서드의 모든 어노테이션들을 추출합니다.
     * 
     * @param lines - Java 파일 라인들
     * @param methodLineIndex - 메서드 라인 인덱스
     * @param maxLookupLines - 최대 탐색 라인 수 (기본값: 5)
     * @returns 추출된 어노테이션 정보 배열
     */
    public extractMethodAnnotationsFromLines(
        lines: string[], 
        methodLineIndex: number,
        maxLookupLines: number = 5
    ): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            for (let i = methodLineIndex - 1; i >= 0 && i >= methodLineIndex - maxLookupLines; i--) {
                const line = lines[i].trim();
                
                // 어노테이션 패턴 찾기
                if (line.startsWith('@')) {
                    const annotationMatch = line.match(/@(\w+)/);
                    if (annotationMatch) {
                        const annotationName = annotationMatch[1];
                        
                        // 어노테이션 타입 매핑
                        const annotationType = this.mapToSpringAnnotationType(annotationName);
                        if (annotationType) {
                            annotations.push({
                                name: annotationName,
                                type: annotationType,
                                line: i,
                                column: 0,
                                parameters: new Map() // 라인 파싱에서는 매개변수 추출 생략
                            });
                        }
                    }
                }
                
                // 다른 어노테이션이나 주석이 아닌 실제 코드가 나오면 중단
                if (line && !line.startsWith('@') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && line !== '') {
                    break;
                }
            }
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                '메서드 어노테이션 추출 실패',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return annotations;
    }
} 