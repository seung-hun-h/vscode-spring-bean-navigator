import { 
    FieldInfo, 
    AnnotationInfo, 
    ClassDeclarationNode, 
    FieldDeclarationNode, 
    CSTNode 
} from '../../models/spring-types';
import { ErrorHandler, FieldExtractionError } from '../core/parser-errors';
import { PositionCalculator } from '../core/position-calculator';
import { AnnotationParser } from './annotation-parser';

/**
 * Java 클래스의 필드 정보를 추출하는 클래스입니다.
 * 필드 선언, 타입, 이름, 어노테이션, 접근 제한자 등을 파싱합니다.
 */
export class FieldExtractor {
    private readonly positionCalculator: PositionCalculator;
    private readonly annotationParser: AnnotationParser;
    // 성능 최적화: 탐색 캐시
    private exploredNodes = new Set<CSTNode>();

    constructor(
        positionCalculator: PositionCalculator,
        annotationParser: AnnotationParser
    ) {
        this.positionCalculator = positionCalculator;
        this.annotationParser = annotationParser;
    }

    /**
     * 클래스의 필드들을 추출합니다. (성능 최적화 버전)
     * 
     * @param classDecl - 클래스 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @returns 추출된 필드 정보 배열
     */
    public extractFields(classDecl: ClassDeclarationNode, lines: string[]): FieldInfo[] {
        // 성능 최적화: 캐시 초기화
        this.exploredNodes.clear();
        
        // 성능 최적화: Map을 사용한 효율적인 중복 제거
        const fieldMap = new Map<string, FieldInfo>();
        
        try {
            // 1단계: 표준 구조로 필드 탐색
            this.extractFieldsFromStandardStructure(classDecl, lines, fieldMap);
            
            // 2단계: 누락된 필드가 있을 수 있으므로 한 번만 재귀 탐색
            this.extractFieldsRecursively(classDecl, lines, fieldMap);
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 추출 실패',
                undefined,
                'Field extraction context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        // Map에서 Array로 변환하여 반환
        return Array.from(fieldMap.values());
    }

    /**
     * 표준 클래스 구조에서 필드들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @param fieldMap - 필드를 저장할 Map (중복 제거용)
     */
    private extractFieldsFromStandardStructure(classDecl: ClassDeclarationNode, lines: string[], fieldMap: Map<string, FieldInfo>): void {
        try {
            const classBody = classDecl.children?.normalClassDeclaration?.[0]?.children?.classBody?.[0];
            const classMemberDeclarations = classBody?.children?.classBodyDeclaration;
            
            if (classMemberDeclarations) {
                for (const memberDecl of classMemberDeclarations) {
                    // 기본 필드 선언 구조
                    if (memberDecl.children?.classMemberDeclaration?.[0]?.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.classMemberDeclaration[0].children.fieldDeclaration[0];
                        this.processFieldDeclaration(fieldDecl, lines, fieldMap);
                    }
                    
                    // 직접 fieldDeclaration이 있는 경우 (구조 변형)
                    else if (memberDecl.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.fieldDeclaration[0];
                        this.processFieldDeclaration(fieldDecl, lines, fieldMap);
                    }
                }
            }
        } catch (error) {
            // 표준 구조 탐색 실패는 로깅만 하고 계속 진행
            const fieldError = new FieldExtractionError(
                '표준 구조 필드 추출 실패',
                undefined,
                'Standard structure extraction',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
    }

    /**
     * 재귀적으로 필드 선언을 찾습니다. (성능 최적화: 캐시 사용)
     * 
     * @param node - 탐색할 CST 노드
     * @param lines - 파일 내용의 라인들
     * @param fieldMap - 필드를 저장할 Map (중복 제거용)
     */
    private extractFieldsRecursively(node: CSTNode, lines: string[], fieldMap: Map<string, FieldInfo>): void {
        if (!node || this.exploredNodes.has(node)) {
            return; // 이미 탐색한 노드는 건너뛰기
        }
        
        // 성능 최적화: 탐색한 노드 마킹
        this.exploredNodes.add(node);
        
        try {
            // fieldDeclaration 노드를 직접 찾은 경우
            if (node.name === 'fieldDeclaration' || (node.children && this.isFieldDeclarationNode(node))) {
                this.processFieldDeclaration(node, lines, fieldMap);
            }
            
            // 자식 노드들을 재귀적으로 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            this.extractFieldsRecursively(child, lines, fieldMap);
                        }
                    }
                }
            }
        } catch (error) {
            // 재귀 탐색 중 에러는 로깅만 하고 계속 진행
            const fieldError = new FieldExtractionError(
                '재귀 필드 탐색 실패',
                undefined,
                'Recursive field search context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
    }

    /**
     * 필드 선언을 처리하여 Map에 추가합니다. (성능 최적화: 중복 체크 O(1))
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @param fieldMap - 필드를 저장할 Map
     */
    private processFieldDeclaration(fieldDecl: FieldDeclarationNode, lines: string[], fieldMap: Map<string, FieldInfo>): void {
        try {
            const fieldInfo = this.parseFieldDeclaration(fieldDecl, lines);
            if (fieldInfo && !fieldMap.has(fieldInfo.name)) {
                fieldMap.set(fieldInfo.name, fieldInfo);
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 선언 처리 실패',
                undefined,
                'Field declaration processing',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
    }

    /**
     * 노드가 fieldDeclaration 노드인지 확인합니다.
     * 
     * @param node - 확인할 노드
     * @returns fieldDeclaration 노드이면 true
     */
    private isFieldDeclarationNode(node: CSTNode): boolean {
        try {
            // fieldDeclaration 노드의 특징적인 구조 확인
            return !!(
                node.children?.unannType &&
                node.children?.variableDeclaratorList
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * 필드 선언을 파싱하여 FieldInfo 객체를 생성합니다.
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @returns 파싱된 필드 정보 또는 undefined
     */
    public parseFieldDeclaration(fieldDecl: FieldDeclarationNode, lines: string[]): FieldInfo | undefined {
        try {
            // 필드 타입 추출
            const fieldType = this.extractFieldType(fieldDecl);
            
            // 필드 이름 추출
            const fieldName = this.extractFieldName(fieldDecl);
            
            if (!fieldType || !fieldName) {
                return undefined;
            }

            // 위치 정보 계산
            const position = this.positionCalculator.calculatePosition(fieldDecl, lines);
            const range = this.positionCalculator.calculateRange(fieldDecl, lines);

            // 필드 어노테이션 추출
            const annotations = this.extractFieldAnnotations(fieldDecl, lines);

            // 접근 제한자 및 키워드 추출
            const modifiers = this.extractFieldModifiers(fieldDecl);

            const fieldInfo: FieldInfo = {
                name: fieldName,
                type: fieldType,
                position,
                range,
                annotations,
                visibility: modifiers.visibility,
                isFinal: modifiers.isFinal,
                isStatic: modifiers.isStatic
            };

            return fieldInfo;
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 파싱 실패',
                undefined,
                'Field declaration context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
            return undefined;
        }
    }

    /**
     * 필드 타입을 추출합니다.
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @returns 필드 타입 문자열 또는 undefined
     */
    public extractFieldType(fieldDecl: FieldDeclarationNode): string | undefined {
        try {
            const unannType = fieldDecl.children?.unannType?.[0];
            
            // 참조 타입 (클래스, 인터페이스) 처리
            if (unannType?.children?.unannReferenceType?.[0]?.children?.unannClassOrInterfaceType?.[0]?.children?.unannClassType?.[0]?.children?.Identifier?.[0]?.image) {
                const typeName = unannType.children.unannReferenceType[0].children.unannClassOrInterfaceType[0].children.unannClassType[0].children.Identifier[0].image;
                return typeName;
            }
            
            // 기본 타입 (int, boolean, char, etc.) 처리
            if (unannType?.children?.unannPrimitiveType?.[0]?.children) {
                const primitiveType = unannType.children.unannPrimitiveType[0].children;
                
                // 숫자 타입들
                if (primitiveType.IntegralType?.[0]?.children) {
                    const integralChildren = primitiveType.IntegralType[0].children;
                    if (integralChildren.Int) {return 'int';}
                    if (integralChildren.Byte) {return 'byte';}
                    if (integralChildren.Short) {return 'short';}
                    if (integralChildren.Long) {return 'long';}
                    if (integralChildren.Char) {return 'char';}
                }
                
                // 실수 타입들
                if (primitiveType.FloatingPointType?.[0]?.children) {
                    const floatingChildren = primitiveType.FloatingPointType[0].children;
                    if (floatingChildren.Float) {return 'float';}
                    if (floatingChildren.Double) {return 'double';}
                }
                
                // 불린 타입
                if (primitiveType.Boolean) {return 'boolean';}
            }
            
            // 대안적인 방법: 전체 노드에서 타입 식별자 찾기
            if (unannType) {
                const typeFromRecursive = this.findTypeRecursively(unannType);
                if (typeFromRecursive) {
                    return typeFromRecursive;
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 타입 추출 실패',
                undefined,
                'Field type context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return undefined;
    }

    /**
     * 재귀적으로 노드에서 타입 정보를 찾습니다.
     * 
     * @param node - 탐색할 노드
     * @returns 발견된 타입 또는 undefined
     */
    private findTypeRecursively(node: CSTNode): string | undefined {
        if (!node) {
            return undefined;
        }
        
        try {
            // 기본 타입 키워드들 확인
            const primitiveTypes = ['int', 'boolean', 'char', 'byte', 'short', 'long', 'float', 'double'];
            
            if (node.image && typeof node.image === 'string') {
                if (primitiveTypes.includes(node.image.toLowerCase())) {
                    return node.image;
                }
                // 첫 글자가 대문자인 식별자면 클래스/인터페이스 타입일 가능성
                if (node.image.match(/^[A-Z][a-zA-Z0-9_]*$/)) {
                    return node.image;
                }
            }
            
            // 자식 노드들을 재귀적으로 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            const result = this.findTypeRecursively(child);
                            if (result) {
                                return result;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '재귀 타입 탐색 실패',
                undefined,
                'Recursive type search context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return undefined;
    }

    /**
     * 필드 이름을 추출합니다.
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @returns 필드 이름 문자열 또는 undefined
     */
    public extractFieldName(fieldDecl: FieldDeclarationNode): string | undefined {
        try {
            const variableDeclarators = fieldDecl.children?.variableDeclaratorList?.[0]?.children?.variableDeclarator;
            if (variableDeclarators && variableDeclarators.length > 0) {
                return variableDeclarators[0].children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image;
            }
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 이름 추출 실패',
                undefined,
                'Field name context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        return undefined;
    }

    /**
     * 필드의 어노테이션들을 추출합니다.
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @returns 추출된 어노테이션 정보 배열
     */
    public extractFieldAnnotations(fieldDecl: FieldDeclarationNode, lines: string[]): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            const fieldModifiers = fieldDecl.children?.fieldModifier;
            
            if (fieldModifiers) {
                for (const modifier of fieldModifiers) {
                    if (modifier.children?.annotation) {
                        const annotation = this.annotationParser.parseAnnotation(modifier.children.annotation[0], lines);
                        if (annotation) {
                            annotations.push(annotation);
                        }
                    }
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 어노테이션 추출 실패',
                undefined,
                'Field annotation context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return annotations;
    }

    /**
     * 필드의 접근 제한자 및 키워드를 추출합니다.
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @returns 접근 제한자 및 키워드 정보
     */
    public extractFieldModifiers(fieldDecl: FieldDeclarationNode): { visibility?: string; isFinal: boolean; isStatic: boolean } {
        const result = { visibility: undefined as string | undefined, isFinal: false, isStatic: false };
        
        try {
            const fieldModifiers = fieldDecl.children?.fieldModifier;
            
            if (fieldModifiers) {
                for (const modifier of fieldModifiers) {
                    if (modifier.children?.Public) {
                        result.visibility = 'public';
                    } else if (modifier.children?.Private) {
                        result.visibility = 'private';
                    } else if (modifier.children?.Protected) {
                        result.visibility = 'protected';
                    } else if (modifier.children?.Final) {
                        result.isFinal = true;
                    } else if (modifier.children?.Static) {
                        result.isStatic = true;
                    }
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 제한자 추출 실패',
                undefined,
                'Field modifier context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return result;
    }

    /**
     * 클래스에서 특정 타입의 필드들을 찾습니다.
     * 
     * @param fields - 필드 배열
     * @param targetType - 찾을 타입
     * @returns 해당 타입의 필드들
     */
    public findFieldsByType(fields: FieldInfo[], targetType: string): FieldInfo[] {
        return fields.filter(field => field.type === targetType);
    }

    /**
     * 특정 어노테이션이 붙은 필드들을 찾습니다.
     * 
     * @param fields - 필드 배열
     * @param annotationType - 찾을 어노테이션 타입
     * @returns 해당 어노테이션이 붙은 필드들
     */
    public findFieldsByAnnotation(fields: FieldInfo[], annotationType: string): FieldInfo[] {
        return fields.filter(field => 
            field.annotations.some(annotation => annotation.name === annotationType)
        );
    }

    /**
     * 필드가 특정 가시성을 가지는지 확인합니다.
     * 
     * @param field - 확인할 필드
     * @param visibility - 확인할 가시성 ('public', 'private', 'protected')
     * @returns 해당 가시성이면 true
     */
    public hasVisibility(field: FieldInfo, visibility: string): boolean {
        return field.visibility === visibility;
    }

    /**
     * 필드가 final인지 확인합니다.
     * 
     * @param field - 확인할 필드
     * @returns final이면 true
     */
    public isFinalField(field: FieldInfo): boolean {
        return field.isFinal || false;
    }

    /**
     * 필드가 static인지 확인합니다.
     * 
     * @param field - 확인할 필드
     * @returns static이면 true
     */
    public isStaticField(field: FieldInfo): boolean {
        return field.isStatic || false;
    }
} 