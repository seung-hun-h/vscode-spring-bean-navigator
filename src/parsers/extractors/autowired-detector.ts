import * as vscode from 'vscode';
import { ClassInfo, FieldInfo, SpringAnnotationType, InjectionInfo, InjectionType } from '../../models/spring-types';
import { PositionCalculator } from '../core/position-calculator';
import { IAutowiredDetector } from '../interfaces/parser-interfaces';

/**
 * @Autowired 어노테이션 관련 탐지 및 처리를 담당하는 클래스
 */
export class AutowiredDetector implements IAutowiredDetector {
    private readonly positionCalculator: PositionCalculator;

    constructor(positionCalculator: PositionCalculator) {
        this.positionCalculator = positionCalculator;
    }

    /**
     * 클래스들에서 @Autowired 어노테이션이 붙은 필드들을 추출하여 주입 정보를 생성합니다.
     * 
     * @param classes - 파싱된 클래스 정보들
     * @returns @Autowired 필드들의 주입 정보
     */
    public extractAutowiredFields(classes: ClassInfo[]): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        if (!classes || !Array.isArray(classes)) {
            return injections;
        }

        for (const classInfo of classes) {
            // null 체크 및 fields 배열 체크
            if (!classInfo || !classInfo.fields || !Array.isArray(classInfo.fields)) {
                continue;
            }

            for (const field of classInfo.fields) {
                if (!field || !field.annotations || !Array.isArray(field.annotations)) {
                    continue;
                }

                // @Autowired 어노테이션이 있는 필드인지 확인
                const autowiredAnnotation = field.annotations.find(
                    annotation => annotation && annotation.type === SpringAnnotationType.AUTOWIRED
                );

                if (autowiredAnnotation) {
                    // 실제 위치 찾기 (fallback)
                    const actualPosition = this.findFieldPositionInContent(classInfo, field.name, field.type);

                    const injection: InjectionInfo = {
                        targetType: field.type,
                        injectionType: InjectionType.FIELD,
                        position: actualPosition || field.position,
                        range: new vscode.Range(
                            actualPosition || field.position,
                            new vscode.Position(
                                (actualPosition || field.position).line,
                                (actualPosition || field.position).character + field.name.length
                            )
                        ),
                        targetName: field.name,
                        // resolvedBean과 candidateBeans는 나중에 BeanResolver에서 설정
                        resolvedBean: undefined,
                        candidateBeans: undefined
                    };

                    injections.push(injection);
                }
            }
        }

        return injections;
    }

    /**
     * 파일 내용에서 실제 필드 위치를 찾습니다.
     * 
     * @param classInfo - 클래스 정보
     * @param fieldName - 필드 이름
     * @param fieldType - 필드 타입
     * @returns 필드 위치 (찾지 못한 경우 undefined)
     */
    private findFieldPositionInContent(classInfo: ClassInfo, fieldName: string, fieldType: string): vscode.Position | undefined {
        try {
            // 파일 내용 가져오기
            const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === classInfo.fileUri.toString());
            if (!document) {
                return undefined;
            }

            const content = document.getText();
            const lines = content.split('\n');

            // Position Calculator를 사용하여 필드 위치 찾기
            return this.positionCalculator.findFieldPosition(fieldName, fieldType, lines);

        } catch (error) {
            console.warn('필드 위치 찾기 실패:', error);
        }

        return undefined;
    }

    /**
     * @Autowired 어노테이션이 붙은 필드가 있는지 확인합니다.
     * 
     * @param classInfo - 확인할 클래스 정보
     * @returns @Autowired 필드가 있으면 true
     */
    public hasAutowiredFields(classInfo: ClassInfo): boolean {
        if (!classInfo || !classInfo.fields || !Array.isArray(classInfo.fields)) {
            return false;
        }

        return classInfo.fields.some(field => {
            if (!field || !field.annotations || !Array.isArray(field.annotations)) {
                return false;
            }
            return field.annotations.some(annotation =>
                annotation && annotation.type === SpringAnnotationType.AUTOWIRED
            );
        });
    }

    /**
     * 특정 타입에 대한 @Autowired 필드들을 찾습니다.
     * 
     * @param classInfo - 검색할 클래스 정보
     * @param targetType - 찾을 타입
     * @returns 해당 타입의 @Autowired 필드들
     */
    public findAutowiredFieldsByType(classInfo: ClassInfo, targetType: string): FieldInfo[] {
        if (!classInfo || !classInfo.fields || !Array.isArray(classInfo.fields)) {
            return [];
        }

        return classInfo.fields.filter(field => {
            if (!field || !field.annotations || !Array.isArray(field.annotations)) {
                return false;
            }

            const hasAutowired = field.annotations.some(annotation =>
                annotation && annotation.type === SpringAnnotationType.AUTOWIRED
            );
            const isTargetType = field.type === targetType;

            return hasAutowired && isTargetType;
        });
    }

    /**
     * Java 파일 내용에서 직접 @Autowired 패턴을 찾는 간단한 방법
     * (CST 파싱이 실패할 경우의 fallback)
     * 
     * @param content - Java 파일 내용
     * @param fileUri - 파일 URI
     * @returns 발견된 @Autowired 위치들
     */
    public findAutowiredPatterns(content: string, fileUri: vscode.Uri): InjectionInfo[] {
        const injections: InjectionInfo[] = [];
        
        if (!content || typeof content !== 'string') {
            return injections;
        }

        const lines = content.split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            // @Autowired 어노테이션 찾기
            if (line.trim().includes('@Autowired')) {
                // 다음 라인에서 필드 선언 찾기
                const nextLineIndex = lineIndex + 1;
                if (nextLineIndex < lines.length) {
                    const nextLine = lines[nextLineIndex];
                    const fieldMatch = nextLine.match(/^\s*(private|protected|public)?\s+(\w+)\s+(\w+)\s*;/);

                    if (fieldMatch) {
                        const [, visibility, type, name] = fieldMatch;

                        // 필드 이름의 실제 시작 위치 찾기
                        const fieldNameStart = nextLine.indexOf(name);
                        const position = new vscode.Position(nextLineIndex, fieldNameStart);
                        const range = new vscode.Range(
                            position,
                            new vscode.Position(nextLineIndex, fieldNameStart + name.length)
                        );

                        const injection: InjectionInfo = {
                            targetType: type,
                            injectionType: InjectionType.FIELD,
                            position,
                            range,
                            targetName: name
                        };

                        injections.push(injection);
                    }
                }
            }
        }

        return injections;
    }
} 