import * as assert from 'assert';
import * as vscode from 'vscode';
import { JavaFileParser } from '../../parsers/java-file-parser';
import { 
    SpringAnnotationType, 
    InjectionType,
} from '../../models/spring-types';
import { 
    TestUtils, 
    JavaSampleGenerator, 
} from '../helpers/test-utils';

suite('JavaFileParser', () => {
    let parser: JavaFileParser;
    let mockUri: vscode.Uri;

    setup(() => {
        parser = new JavaFileParser();
        mockUri = TestUtils.createMockUri('/test/UserService.java');
    });

    suite('parseJavaFile', () => {
        test('should_parseValidJavaFile_when_simpleAutowiredClassProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.simpleAutowiredClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            assert.strictEqual(result.injections.length, 1, 'Should find one @Autowired injection');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'UserService');
            assert.strictEqual(classInfo.packageName, 'com.example.service');
            assert.strictEqual(classInfo.fullyQualifiedName, 'com.example.service.UserService');
        });

        test('should_extractMultipleAutowiredFields_when_multipleFieldsProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.multipleAutowiredFields();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.injections.length, 2, 'Should find two @Autowired injections');
            
            const injections = result.injections;
            const targetTypes = injections.map(injection => injection.targetType);
            assert.ok(targetTypes.includes('UserRepository'), 'Should include UserRepository injection');
            assert.ok(targetTypes.includes('EmailService'), 'Should include EmailService injection');
        });

        test('should_returnEmptyInjections_when_noAutowiredFields', async () => {
            // Arrange
            const content = JavaSampleGenerator.noAutowiredClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.injections.length, 0, 'Should not find any @Autowired injections');
            assert.strictEqual(result.classes.length, 1, 'Should still parse the class');
        });

        test('should_handleParsingError_when_invalidJavaFileProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.invalidJavaFile();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.ok(result.errors.length > 0, 'Should have parsing errors');
            assert.ok(result.errors[0].includes('파싱 실패'), 'Error message should be in Korean');
        });

        test('should_handleEmptyFile_when_emptyContentProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.emptyJavaFile();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.classes.length, 0, 'Should not parse any classes');
            assert.strictEqual(result.injections.length, 0, 'Should not find any injections');
            // 빈 파일은 에러가 아닐 수 있음
        });

        test('should_extractPackageAndImports_when_validJavaClassProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.simpleAutowiredClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.packageName, 'com.example.service');
            assert.ok(classInfo.imports.length > 0, 'Should extract import statements');
        });

        test('should_extractSpringAnnotations_when_componentClassProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.componentClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            const classInfo = result.classes[0];
            assert.ok(classInfo.annotations.length > 0, 'Should extract class annotations');
            
            const hasComponentAnnotation = classInfo.annotations.some(
                annotation => annotation.type === SpringAnnotationType.COMPONENT
            );
            assert.ok(hasComponentAnnotation, 'Should find @Component annotation');
        });
    });

    suite('hasAutowiredFields', () => {
        test('should_returnTrue_when_classHasAutowiredFields', async () => {
            // Arrange
            const autowiredField = TestUtils.createFieldInfo(
                'userService', 
                'UserService', 
                [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)]
            );
            const classInfo = TestUtils.createClassInfo(
                'TestController', 
                'com.example.controller',
                [autowiredField]
            );

            // Act
            const result = parser.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, true, 'Should return true for class with @Autowired fields');
        });

        test('should_returnFalse_when_classHasNoAutowiredFields', async () => {
            // Arrange
            const regularField = TestUtils.createFieldInfo('regularField', 'String', []);
            const classInfo = TestUtils.createClassInfo(
                'TestModel', 
                'com.example.model',
                [regularField]
            );

            // Act
            const result = parser.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, false, 'Should return false for class without @Autowired fields');
        });

        test('should_returnFalse_when_classHasNoFields', async () => {
            // Arrange
            const classInfo = TestUtils.createClassInfo('EmptyClass', 'com.example', []);

            // Act
            const result = parser.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, false, 'Should return false for class with no fields');
        });
    });

    suite('findAutowiredFieldsByType', () => {
        test('should_findMatchingFields_when_targetTypeExists', async () => {
            // Arrange
            const autowiredUserService = TestUtils.createFieldInfo(
                'userService', 
                'UserService', 
                [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)]
            );
            const autowiredEmailService = TestUtils.createFieldInfo(
                'emailService', 
                'EmailService', 
                [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)]
            );
            const regularField = TestUtils.createFieldInfo('data', 'String', []);
            
            const classInfo = TestUtils.createClassInfo(
                'TestService',
                'com.example.service',
                [autowiredUserService, autowiredEmailService, regularField]
            );

            // Act
            const result = parser.findAutowiredFieldsByType(classInfo, 'UserService');

            // Assert
            assert.strictEqual(result.length, 1, 'Should find one matching field');
            assert.strictEqual(result[0].name, 'userService', 'Should find the correct field');
            assert.strictEqual(result[0].type, 'UserService', 'Should match the target type');
        });

        test('should_returnEmptyArray_when_targetTypeNotFound', async () => {
            // Arrange
            const autowiredField = TestUtils.createFieldInfo(
                'emailService', 
                'EmailService', 
                [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)]
            );
            const classInfo = TestUtils.createClassInfo(
                'TestService',
                'com.example.service',
                [autowiredField]
            );

            // Act
            const result = parser.findAutowiredFieldsByType(classInfo, 'UserService');

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array when type not found');
        });

        test('should_ignoreNonAutowiredFields_when_typeMatches', async () => {
            // Arrange
            const autowiredField = TestUtils.createFieldInfo(
                'autowiredService', 
                'TestService', 
                [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)]
            );
            const regularField = TestUtils.createFieldInfo('regularService', 'TestService', []);
            
            const classInfo = TestUtils.createClassInfo(
                'TestController',
                'com.example.controller',
                [autowiredField, regularField]
            );

            // Act
            const result = parser.findAutowiredFieldsByType(classInfo, 'TestService');

            // Assert
            assert.strictEqual(result.length, 1, 'Should only find @Autowired fields');
            assert.strictEqual(result[0].name, 'autowiredService', 'Should find only the @Autowired field');
        });
    });

    suite('findAutowiredPatterns', () => {
        test('should_findAutowiredPattern_when_simplePatternExists', async () => {
            // Arrange
            const content = `
                @Autowired
                private UserService userService;
            `.trim();

            // Act
            const result = parser.findAutowiredPatterns(content, mockUri);

            // Assert
            assert.ok(result.length > 0, 'Should find @Autowired pattern');
            const injection = result[0];
            assert.strictEqual(injection.targetType, 'UserService', 'Should extract correct type');
            assert.strictEqual(injection.targetName, 'userService', 'Should extract correct field name');
            assert.strictEqual(injection.injectionType, InjectionType.FIELD, 'Should be field injection');
        });

        test('should_findMultiplePatterns_when_multipleAutowiredFields', async () => {
            // Arrange
            const content = `
                @Autowired
                private UserService userService;

                @Autowired
                private EmailService emailService;
            `.trim();

            // Act
            const result = parser.findAutowiredPatterns(content, mockUri);

            // Assert
            assert.strictEqual(result.length, 2, 'Should find two @Autowired patterns');
            
            const types = result.map(injection => injection.targetType);
            assert.ok(types.includes('UserService'), 'Should find UserService');
            assert.ok(types.includes('EmailService'), 'Should find EmailService');
        });

        test('should_returnEmptyArray_when_noAutowiredPatterns', async () => {
            // Arrange
            const content = `
                private UserService userService;
                private EmailService emailService;
            `.trim();

            // Act
            const result = parser.findAutowiredPatterns(content, mockUri);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not find any patterns without @Autowired');
        });

        test('should_handleDifferentVisibilityModifiers_when_autowiredFieldsPresent', async () => {
            // Arrange
            const content = `
                @Autowired
                public UserService publicService;

                @Autowired
                protected EmailService protectedService;

                @Autowired
                private DataService privateService;
            `.trim();

            // Act
            const result = parser.findAutowiredPatterns(content, mockUri);

            // Assert
            assert.strictEqual(result.length, 3, 'Should find all visibility modifiers');
            
            const names = result.map(injection => injection.targetName);
            assert.ok(names.includes('publicService'), 'Should find public field');
            assert.ok(names.includes('protectedService'), 'Should find protected field');
            assert.ok(names.includes('privateService'), 'Should find private field');
        });

        test('should_calculateCorrectPositions_when_autowiredFieldsFound', async () => {
            // Arrange
            const content = `
                @Autowired
                private UserService userService;
            `.trim();

            // Act
            const result = parser.findAutowiredPatterns(content, mockUri);

            // Assert
            assert.ok(result.length > 0, 'Should find pattern');
            const injection = result[0];
            assert.ok(injection.position.line >= 0, 'Should have valid line position');
            assert.ok(injection.position.character >= 0, 'Should have valid character position');
            assert.ok(injection.range.start.line >= 0, 'Should have valid range start');
            assert.ok(injection.range.end.line >= 0, 'Should have valid range end');
        });
    });

    suite('Integration Tests', () => {
        test('should_processCompleteWorkflow_when_validSpringClassProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.simpleAutowiredClass();

            // Act
            const parseResult = await parser.parseJavaFile(mockUri, content);
            const classInfo = parseResult.classes[0];
            const hasAutowired = parser.hasAutowiredFields(classInfo);
            const autowiredFields = parser.findAutowiredFieldsByType(classInfo, 'UserRepository');
            const fallbackPatterns = parser.findAutowiredPatterns(content, mockUri);

            // Assert
            assert.strictEqual(parseResult.errors.length, 0, 'Should parse without errors');
            assert.strictEqual(hasAutowired, true, 'Should detect @Autowired fields');
            assert.ok(autowiredFields.length > 0 || fallbackPatterns.length > 0, 'Should find autowired patterns through either method');
        });

        test('should_handleComplexSpringConfiguration_when_configurationClassProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.configurationClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should parse configuration class without errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse configuration class');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'AppConfig');
            
            // Configuration 클래스는 일반적으로 @Autowired 필드가 아닌 @Bean 메소드를 가짐
            const hasConfigAnnotation = classInfo.annotations.some(
                annotation => annotation.type === SpringAnnotationType.CONFIGURATION
            );
            assert.ok(hasConfigAnnotation, 'Should detect @Configuration annotation');
        });
    });

    suite('Error Handling', () => {
        test('should_gracefullyHandleNullContent_when_nullProvided', async () => {
            // Arrange
            const content = null as any;

            // Act & Assert
            try {
                await parser.parseJavaFile(mockUri, content);
                assert.fail('Should throw error for null content');
            } catch (error) {
                assert.ok(error instanceof Error, 'Should throw proper error');
            }
        });

        test('should_gracefullyHandleUndefinedContent_when_undefinedProvided', async () => {
            // Arrange
            const content = undefined as any;

            // Act & Assert
            try {
                await parser.parseJavaFile(mockUri, content);
                assert.fail('Should throw error for undefined content');
            } catch (error) {
                assert.ok(error instanceof Error, 'Should throw proper error');
            }
        });

        test('should_returnErrorInResult_when_parsingFails', async () => {
            // Arrange
            const content = 'completely invalid java content {{{';

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.ok(result.errors.length > 0, 'Should report parsing errors');
            assert.strictEqual(result.classes.length, 0, 'Should not parse any classes on error');
            assert.strictEqual(result.injections.length, 0, 'Should not find any injections on error');
        });
    });

    suite('Performance Tests', () => {
        test('should_handleLargeFile_when_manyFieldsProvided', async () => {
            // Arrange
            const largeContent = JavaSampleGenerator.simpleAutowiredClass() + '\n'.repeat(1000);

            // Act
            const startTime = Date.now();
            const result = await parser.parseJavaFile(mockUri, largeContent);
            const endTime = Date.now();

            // Assert
            assert.ok(endTime - startTime < 5000, 'Should parse large file within 5 seconds');
            assert.strictEqual(result.errors.length, 0, 'Should parse large file without errors');
        });

        test('should_handleMultipleParsingCalls_when_calledRepeatedl', async () => {
            // Arrange
            const content = JavaSampleGenerator.simpleAutowiredClass();
            const iterations = 10;

            // Act
            const startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                await parser.parseJavaFile(mockUri, content);
            }
            const endTime = Date.now();

            // Assert
            assert.ok(endTime - startTime < 10000, 'Should handle multiple parsing calls efficiently');
        });
    });

    suite('Interface Implementation Parsing', () => {
        test('should_extractImplementedInterfaces_when_classImplementsInterface', async () => {
            // Arrange
            const content = JavaSampleGenerator.interfaceImplementationClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'MessageServiceImpl');
            
            // 인터페이스 정보가 추출되었는지 확인
            const interfaces = (classInfo as any).interfaces as string[] | undefined;
            assert.ok(interfaces, 'Should extract implemented interfaces');
            assert.ok(interfaces.includes('MessageService'), 'Should include MessageService interface');
        });

        test('should_extractMultipleInterfaces_when_classImplementsMultiple', async () => {
            // Arrange
            const content = JavaSampleGenerator.multipleInterfaceImplementationClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            const interfaces = (classInfo as any).interfaces as string[] | undefined;
            assert.ok(interfaces, 'Should extract implemented interfaces');
            assert.strictEqual(interfaces.length, 2, 'Should extract two interfaces');
            assert.ok(interfaces.includes('MessageService'), 'Should include MessageService');
            assert.ok(interfaces.includes('NotificationService'), 'Should include NotificationService');
        });

        test('should_notExtractInterfaces_when_classExtendsButNoImplements', async () => {
            // Arrange
            const content = JavaSampleGenerator.extendsOnlyClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            const interfaces = (classInfo as any).interfaces as string[] | undefined;
            assert.ok(!interfaces || interfaces.length === 0, 'Should not have interfaces when only extending');
        });

        test('should_extractInterfacesAndAutowired_when_implementationClassHasInjection', async () => {
            // Arrange: MessageServiceImpl implements MessageService and has @Autowired field
            const content = JavaSampleGenerator.autowiredImplementationClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            assert.strictEqual(result.injections.length, 1, 'Should find one @Autowired injection');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'MessageServiceImpl');
            
            // 인터페이스 정보 확인
            const interfaces = (classInfo as any).interfaces as string[] | undefined;
            assert.ok(interfaces && interfaces.includes('MessageService'), 'Should implement MessageService');
            
            // 주입 정보 확인  
            const injection = result.injections[0];
            assert.strictEqual(injection.targetType, 'NotificationService', 'Should inject NotificationService');
        });

        test('should_handleGenericInterfaces_when_interfaceHasTypeParameters', async () => {
            // Arrange
            const content = JavaSampleGenerator.genericInterfaceImplementationClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            const interfaces = (classInfo as any).interfaces as string[] | undefined;
            assert.ok(interfaces, 'Should extract implemented interfaces');
            // 제네릭 인터페이스도 기본 이름으로 추출되어야 함
            assert.ok(interfaces.some(i => i.includes('Repository')), 'Should extract Repository interface');
        });

        test('should_returnEmptyInterfaces_when_classImplementsNothing', async () => {
            // Arrange
            const content = JavaSampleGenerator.noInterfaceClass();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            const interfaces = (classInfo as any).interfaces as string[] | undefined;
            assert.ok(!interfaces || interfaces.length === 0, 'Should have no interfaces');
        });
    });
}); 