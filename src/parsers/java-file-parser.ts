import * as vscode from 'vscode';
import {
    ClassInfo,
    FieldInfo,
    SpringAnnotationType,
    JavaFileParseResult,
    InjectionInfo,
    InjectionType
} from '../models/spring-types';
import { ErrorHandler } from './core/parser-errors';
import { CSTNavigator } from './core/cst-navigator';
import { PositionCalculator } from './core/position-calculator';
import { AnnotationParser } from './extractors/annotation-parser';
import { FieldExtractor } from './extractors/field-extractor';
import { ClassExtractor } from './extractors/class-extractor';

/**
 * Java 파일을 파싱하여 Spring 관련 정보를 추출하는 클래스
 */
export class JavaFileParser {
    private readonly cstNavigator: CSTNavigator;
    private readonly positionCalculator: PositionCalculator;
    private readonly annotationParser: AnnotationParser;
    private readonly fieldExtractor: FieldExtractor;
    private readonly classExtractor: ClassExtractor;

    constructor() {
        this.cstNavigator = new CSTNavigator();
        this.positionCalculator = new PositionCalculator();
        this.annotationParser = new AnnotationParser(this.positionCalculator);
        this.fieldExtractor = new FieldExtractor(this.positionCalculator, this.annotationParser);
        this.classExtractor = new ClassExtractor(this.cstNavigator, this.positionCalculator, this.annotationParser, this.fieldExtractor);
    }

    /**
 * Java 파일을 파싱하여 클래스 정보를 추출합니다.
 * 
 * @param fileUri - 파싱할 Java 파일 URI
 * @param content - 파일 내용
 * @returns 파싱 결과
 */
    public async parseJavaFile(fileUri: vscode.Uri, content: string): Promise<JavaFileParseResult> {
        const result: JavaFileParseResult = {
            classes: [],
            beanDefinitions: [],
            injections: [],
            errors: []
        };

        try {
            // Dynamic import for java-parser
            const { parse } = await import('java-parser');

            const cst = parse(content);
            const classes = this.classExtractor.extractClasses(cst, fileUri, content);

            result.classes = classes;

            // @Autowired 필드 탐지
            const injections = this.extractAutowiredFields(classes);
            result.injections = injections;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Java 파일 파싱');
            result.errors.push(ErrorHandler.createUserFriendlyMessage(parsingError));
            ErrorHandler.logError(parsingError, { fileUri: fileUri.toString() });
        }

        return result;
    }

    /**
     * 클래스들에서 @Autowired 어노테이션이 붙은 필드들을 추출하여 주입 정보를 생성합니다.
     * 
     * @param classes - 파싱된 클래스 정보들
     * @returns @Autowired 필드들의 주입 정보
     */
    private extractAutowiredFields(classes: ClassInfo[]): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        for (const classInfo of classes) {
            for (const field of classInfo.fields) {
                // @Autowired 어노테이션이 있는 필드인지 확인
                const autowiredAnnotation = field.annotations.find(
                    annotation => annotation.type === SpringAnnotationType.AUTOWIRED
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
        return classInfo.fields.some(field =>
            field.annotations.some(annotation =>
                annotation.type === SpringAnnotationType.AUTOWIRED
            )
        );
    }

    /**
     * 특정 타입에 대한 @Autowired 필드들을 찾습니다.
     * 
     * @param classInfo - 검색할 클래스 정보
     * @param targetType - 찾을 타입
     * @returns 해당 타입의 @Autowired 필드들
     */
    public findAutowiredFieldsByType(classInfo: ClassInfo, targetType: string): FieldInfo[] {
        return classInfo.fields.filter(field => {
            const hasAutowired = field.annotations.some(annotation =>
                annotation.type === SpringAnnotationType.AUTOWIRED
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

                        const position = new vscode.Position(nextLineIndex, nextLine.indexOf(name));
                        const range = new vscode.Range(
                            position,
                            new vscode.Position(nextLineIndex, nextLine.indexOf(name) + name.length)
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