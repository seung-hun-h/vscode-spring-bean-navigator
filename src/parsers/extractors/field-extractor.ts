import { FieldInfo, AnnotationInfo } from '../../models/spring-types';
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

    constructor(
        positionCalculator: PositionCalculator,
        annotationParser: AnnotationParser
    ) {
        this.positionCalculator = positionCalculator;
        this.annotationParser = annotationParser;
    }

    /**
     * 클래스의 필드들을 추출합니다.
     * 
     * @param classDecl - 클래스 선언 CST 노드
     * @param lines - 파일 내용의 라인들
     * @returns 추출된 필드 정보 배열
     */
    public extractFields(classDecl: any, lines: string[]): FieldInfo[] {
        const fields: FieldInfo[] = [];
        
        try {
            const classBody = classDecl.children?.normalClassDeclaration?.[0]?.children?.classBody?.[0];
            const classMemberDeclarations = classBody?.children?.classBodyDeclaration;
            
            if (classMemberDeclarations) {
                for (const memberDecl of classMemberDeclarations) {
                    // 기본 필드 선언 구조
                    if (memberDecl.children?.classMemberDeclaration?.[0]?.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.classMemberDeclaration[0].children.fieldDeclaration[0];
                        const fieldInfo = this.parseFieldDeclaration(fieldDecl, lines);
                        
                        if (fieldInfo) {
                            fields.push(fieldInfo);
                        }
                    }
                    
                    // 직접 fieldDeclaration이 있는 경우 (구조 변형)
                    else if (memberDecl.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.fieldDeclaration[0];
                        const fieldInfo = this.parseFieldDeclaration(fieldDecl, lines);
                        
                        if (fieldInfo) {
                            fields.push(fieldInfo);
                        }
                    }
                }
            }
            
            // 대안적인 방법: 전체 클래스에서 필드 선언을 재귀적으로 찾기
            const additionalFields = this.findFieldsRecursively(classDecl, lines);
            for (const field of additionalFields) {
                // 중복 제거 (이름이 같은 필드가 이미 있으면 추가하지 않음)
                if (!fields.some(existingField => existingField.name === field.name)) {
                    fields.push(field);
                }
            }
            
        } catch (error) {
            const fieldError = new FieldExtractionError(
                '필드 추출 실패',
                undefined,
                'Field extraction context',
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(fieldError);
        }
        
        return fields;
    }

    /**
     * 클래스에서 재귀적으로 필드 선언을 찾습니다.
     * 
     * @param node - 탐색할 CST 노드
     * @param lines - 파일 내용의 라인들
     * @returns 발견된 필드 정보 배열
     */
    private findFieldsRecursively(node: any, lines: string[]): FieldInfo[] {
        const fields: FieldInfo[] = [];
        
        if (!node) {
            return fields;
        }
        
        try {
            // fieldDeclaration 노드를 직접 찾은 경우
            if (node.name === 'fieldDeclaration' || (node.children && this.isFieldDeclarationNode(node))) {
                const fieldInfo = this.parseFieldDeclaration(node, lines);
                if (fieldInfo) {
                    fields.push(fieldInfo);
                }
            }
            
            // 자식 노드들을 재귀적으로 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            const childFields = this.findFieldsRecursively(child, lines);
                            fields.push(...childFields);
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
        
        return fields;
    }

    /**
     * 노드가 fieldDeclaration 노드인지 확인합니다.
     * 
     * @param node - 확인할 노드
     * @returns fieldDeclaration 노드이면 true
     */
    private isFieldDeclarationNode(node: any): boolean {
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
    public parseFieldDeclaration(fieldDecl: any, lines: string[]): FieldInfo | undefined {
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
    public extractFieldType(fieldDecl: any): string | undefined {
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
            const typeFromRecursive = this.findTypeRecursively(unannType);
            if (typeFromRecursive) {
                return typeFromRecursive;
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
    private findTypeRecursively(node: any): string | undefined {
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
            // 재귀 탐색 중 에러는 무시하고 계속 진행
        }
        
        return undefined;
    }

    /**
     * 필드 이름을 추출합니다.
     * 
     * @param fieldDecl - 필드 선언 CST 노드
     * @returns 필드 이름 문자열 또는 undefined
     */
    public extractFieldName(fieldDecl: any): string | undefined {
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
    public extractFieldAnnotations(fieldDecl: any, lines: string[]): AnnotationInfo[] {
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
    public extractFieldModifiers(fieldDecl: any): { visibility?: string; isFinal: boolean; isStatic: boolean } {
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