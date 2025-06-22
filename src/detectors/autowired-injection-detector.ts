import * as vscode from 'vscode';
import { ClassInfo, SpringAnnotationType, InjectionInfo, InjectionType } from '../models/spring-types';
import { PositionCalculator } from '../parsers/core/position-calculator';
import { AbstractInjectionDetector } from './abstract-injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * @Autowired 어노테이션 관련 탐지 및 처리를 담당하는 클래스
 */
export class AutowiredInjectionDetector extends AbstractInjectionDetector {
    private readonly positionCalculator: PositionCalculator;

    constructor(positionCalculator: PositionCalculator) {
        super();
        this.positionCalculator = positionCalculator;
    }

    /**
     * Detector 이름을 반환합니다.
     */
    protected getDetectorName(): string {
        return 'AutowiredInjectionDetector';
    }

    /**
     * 단일 클래스에서 @Autowired 어노테이션이 붙은 필드들을 추출하여 주입 정보를 생성합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns @Autowired 필드들의 주입 정보
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        // fields 배열 체크
        if (!classInfo.fields || !Array.isArray(classInfo.fields)) {
            return injections;
        }

        for (const field of classInfo.fields) {
            if (!field || !field.annotations || !Array.isArray(field.annotations)) {
                continue;
            }

            // @Autowired 어노테이션이 있는 필드인지 확인
            const autowiredAnnotation = this.findAnnotation(
                field.annotations,
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
            const parsingError = ErrorHandler.handleParsingError(error, '필드 위치 찾기');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                fieldName: fieldName || 'Unknown',
                fieldType: fieldType || 'Unknown'
            });
        }

        return undefined;
    }
} 