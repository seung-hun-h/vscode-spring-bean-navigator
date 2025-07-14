import * as vscode from 'vscode';
import {
    JavaFileParseResult,
    CompilationUnitNode
} from '../models/spring-types';
import { ErrorHandler } from './core/parser-errors';
import { CSTNavigator } from './core/cst-navigator';
import { PositionCalculator } from './core/position-calculator';
import { AnnotationParser } from './extractors/annotation-parser';
import { FieldExtractor } from './extractors/field-extractor';
import { ClassExtractor } from './extractors/class-extractor';
import { ConstructorExtractor } from './extractors/constructor-extractor';
import { MethodExtractor } from './extractors/method-extractor';
import { SpringBeanDetector } from '../detectors/spring-bean-detector';

/**
 * Java 파일을 파싱하여 Spring 관련 정보를 추출하는 클래스
 */
export class JavaFileParser {
    private readonly cstNavigator: CSTNavigator;
    private readonly positionCalculator: PositionCalculator;
    private readonly annotationParser: AnnotationParser;
    private readonly fieldExtractor: FieldExtractor;
    private readonly classExtractor: ClassExtractor;
    private readonly constructorExtractor: ConstructorExtractor;
    private readonly methodExtractor: MethodExtractor;
    private readonly springBeanDetector: SpringBeanDetector;

    constructor() {
        this.cstNavigator = new CSTNavigator();
        this.positionCalculator = new PositionCalculator();
        this.annotationParser = new AnnotationParser(this.positionCalculator);
        this.fieldExtractor = new FieldExtractor(this.positionCalculator, this.annotationParser, this.cstNavigator);
        this.classExtractor = new ClassExtractor(this.cstNavigator, this.positionCalculator, this.annotationParser, this.fieldExtractor);
        this.constructorExtractor = new ConstructorExtractor();
        this.methodExtractor = new MethodExtractor(this.annotationParser);
        this.springBeanDetector = new SpringBeanDetector();
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
            const classes = this.classExtractor.extractClasses(cst as CompilationUnitNode, fileUri, content);

            // Phase 2: 생성자 주입 및 Setter 주입 정보 추가
            for (const classInfo of classes) {
                // 생성자 정보 추출
                const constructors = this.constructorExtractor.extractConstructors(content, fileUri);
                if (constructors.length > 0) {
                    classInfo.constructors = constructors;
                }

                // 모든 메서드 정보 추가 (Setter, @Bean 메서드 포함)
                const allMethods = this.methodExtractor.extractAllMethods(content, fileUri);
                if (allMethods.length > 0) {
                    classInfo.methods = allMethods;
                }
            }

            result.classes = classes;

            // Phase 1 & 2: 모든 주입 타입 탐지 (필드, 생성자, setter)
            const allInjections = this.springBeanDetector.detectAllInjectionsInClasses(classes);
            
            result.injections = allInjections;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Java 파일 파싱');
            result.errors.push(ErrorHandler.createUserFriendlyMessage(parsingError));
            ErrorHandler.logError(parsingError, { fileUri: fileUri.toString() });
        }

        return result;
    }
} 