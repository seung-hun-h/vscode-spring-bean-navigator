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
import { AutowiredDetector } from './extractors/autowired-detector';

/**
 * Java 파일을 파싱하여 Spring 관련 정보를 추출하는 클래스
 */
export class JavaFileParser {
    private readonly cstNavigator: CSTNavigator;
    private readonly positionCalculator: PositionCalculator;
    private readonly annotationParser: AnnotationParser;
    private readonly fieldExtractor: FieldExtractor;
    private readonly classExtractor: ClassExtractor;
    private readonly autowiredDetector: AutowiredDetector;

    constructor() {
        this.cstNavigator = new CSTNavigator();
        this.positionCalculator = new PositionCalculator();
        this.annotationParser = new AnnotationParser(this.positionCalculator);
        this.fieldExtractor = new FieldExtractor(this.positionCalculator, this.annotationParser);
        this.classExtractor = new ClassExtractor(this.cstNavigator, this.positionCalculator, this.annotationParser, this.fieldExtractor);
        this.autowiredDetector = new AutowiredDetector(this.positionCalculator);
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
            const injections = this.autowiredDetector.extractAutowiredFields(classes);
            result.injections = injections;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Java 파일 파싱');
            result.errors.push(ErrorHandler.createUserFriendlyMessage(parsingError));
            ErrorHandler.logError(parsingError, { fileUri: fileUri.toString() });
        }

        return result;
    }

    /**
     * @Autowired 어노테이션이 붙은 필드가 있는지 확인합니다.
     * 
     * @param classInfo - 확인할 클래스 정보
     * @returns @Autowired 필드가 있으면 true
     */
    public hasAutowiredFields(classInfo: ClassInfo): boolean {
        return this.autowiredDetector.hasAutowiredFields(classInfo);
    }

    /**
     * 특정 타입에 대한 @Autowired 필드들을 찾습니다.
     * 
     * @param classInfo - 검색할 클래스 정보
     * @param targetType - 찾을 타입
     * @returns 해당 타입의 @Autowired 필드들
     */
    public findAutowiredFieldsByType(classInfo: ClassInfo, targetType: string): FieldInfo[] {
        return this.autowiredDetector.findAutowiredFieldsByType(classInfo, targetType);
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
        return this.autowiredDetector.findAutowiredPatterns(content, fileUri);
    }
} 