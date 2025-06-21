import * as vscode from 'vscode';
import { FieldInfo, AnnotationInfo } from '../../models/spring-types';
import { JAVA_PARSER_CONFIG } from '../config/java-parser-config';
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
                    if (memberDecl.children?.classMemberDeclaration?.[0]?.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.classMemberDeclaration[0].children.fieldDeclaration[0];
                        const fieldInfo = this.parseFieldDeclaration(fieldDecl, lines);
                        
                        if (fieldInfo) {
                            fields.push(fieldInfo);
                        }
                    }
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
            // 실제 구조: unannType → unannReferenceType → unannClassOrInterfaceType → unannClassType → Identifier
            if (unannType?.children?.unannReferenceType?.[0]?.children?.unannClassOrInterfaceType?.[0]?.children?.unannClassType?.[0]?.children?.Identifier?.[0]?.image) {
                const typeName = unannType.children.unannReferenceType[0].children.unannClassOrInterfaceType[0].children.unannClassType[0].children.Identifier[0].image;
                return typeName;
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