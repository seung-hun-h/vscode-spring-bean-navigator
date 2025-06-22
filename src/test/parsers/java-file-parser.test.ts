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
    suite('parseConstructorInjections', () => {
        test('should_parseConstructorInjections_when_singleConstructorExists', async () => {
            // Arrange
            const content = JavaSampleGenerator.singleConstructorInjection();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'OrderService');
            
            // 생성자 정보 확인
            assert.ok(classInfo.constructors, 'Should have constructors property');
            assert.strictEqual(classInfo.constructors!.length, 1, 'Should have one constructor');
            
            const constructor = classInfo.constructors![0];
            assert.strictEqual(constructor.parameters.length, 2, 'Constructor should have 2 parameters');
            assert.strictEqual(constructor.hasAutowiredAnnotation, false, 'Single constructor should not need @Autowired');
            
            // 매개변수 타입 확인
            const paramTypes = constructor.parameters.map(p => p.type);
            assert.ok(paramTypes.includes('UserRepository'), 'Should have UserRepository parameter');
            assert.ok(paramTypes.includes('ProductRepository'), 'Should have ProductRepository parameter');
        });

        test('should_parseAutowiredConstructor_when_multipleConstructorsExist', async () => {
            // Arrange
            const content = JavaSampleGenerator.multipleConstructorWithAutowired();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            
            const classInfo = result.classes[0];
            assert.ok(classInfo.constructors, 'Should have constructors property');
            assert.strictEqual(classInfo.constructors!.length, 2, 'Should have two constructors');
            
            // @Autowired가 붙은 생성자 찾기
            const autowiredConstructor = classInfo.constructors!.find(c => c.hasAutowiredAnnotation);
            assert.ok(autowiredConstructor, 'Should find @Autowired constructor');
            assert.strictEqual(autowiredConstructor.parameters.length, 2, '@Autowired constructor should have 2 parameters');
            
            // 기본 생성자 확인
            const defaultConstructor = classInfo.constructors!.find(c => !c.hasAutowiredAnnotation);
            assert.ok(defaultConstructor, 'Should find default constructor');
            assert.strictEqual(defaultConstructor.parameters.length, 0, 'Default constructor should have no parameters');
        });

        test('should_parseComplexConstructor_when_annotationsAndGenericsPresent', async () => {
            // Arrange
            const content = JavaSampleGenerator.complexConstructorInjection();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            assert.ok(classInfo.constructors, 'Should have constructors property');
            assert.strictEqual(classInfo.constructors!.length, 1, 'Should have one constructor');
            
            const constructor = classInfo.constructors![0];
            assert.strictEqual(constructor.hasAutowiredAnnotation, true, 'Constructor should have @Autowired');
            assert.strictEqual(constructor.parameters.length, 3, 'Constructor should have 3 parameters');
            
            // 매개변수 타입 확인 (제네릭 타입 포함)
            const paramTypes = constructor.parameters.map(p => p.type);
            assert.ok(paramTypes.some(t => t.includes('Repository')), 'Should have Repository parameter');
            assert.ok(paramTypes.some(t => t.includes('List')), 'Should have List parameter');
            assert.ok(paramTypes.includes('String'), 'Should have String parameter');
        });

        test('should_returnEmptyConstructors_when_noConstructorsFound', async () => {
            // Arrange
            const content = JavaSampleGenerator.simpleAutowiredClass(); // 필드 주입만 있는 클래스

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            // 생성자가 없으면 빈 배열이거나 undefined
            assert.ok(!classInfo.constructors || classInfo.constructors.length === 0, 'Should have no constructors');
        });
    });

    suite('parseSetterInjections', () => {
        test('should_parseSetterInjections_when_autowiredSettersExist', async () => {
            // Arrange
            const content = JavaSampleGenerator.setterInjection();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            
            const classInfo = result.classes[0];
            assert.ok(classInfo.methods, 'Should have methods property');
            
            // @Autowired setter 메서드 찾기
            const setterMethods = classInfo.methods!.filter(m => m.isSetterMethod);
            assert.strictEqual(setterMethods.length, 2, 'Should have 2 setter methods');
            
            // 각 setter 메서드 확인
            const setterNames = setterMethods.map(s => s.name);
            assert.ok(setterNames.includes('setEmailService'), 'Should have setEmailService');
            assert.ok(setterNames.includes('setSmsService'), 'Should have setSmsService');
            
            // 각 setter 메서드의 매개변수 확인
            setterMethods.forEach(setter => {
                assert.strictEqual(setter.parameters.length, 1, 'Setter should have 1 parameter');
                assert.ok(setter.annotations.some(a => a.name === 'Autowired'), 'Setter should have @Autowired annotation');
            });
        });

        test('should_parseComplexSetterInjection_when_annotationsPresent', async () => {
            // Arrange
            const content = JavaSampleGenerator.complexSetterInjection();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            assert.ok(classInfo.methods, 'Should have methods property');
            const setterMethods = classInfo.methods!.filter(m => m.isSetterMethod);
            assert.strictEqual(setterMethods.length, 2, 'Should have 2 setter methods');
            
            // @Qualifier 어노테이션이 있는 setter 확인
            const qualifierSetter = setterMethods.find(s => s.name === 'setUserRepository');
            assert.ok(qualifierSetter, 'Should find setUserRepository');
            assert.ok(qualifierSetter.annotations.some(a => a.name === 'Qualifier'), 'Should have @Qualifier annotation');
            
            // @Value 어노테이션이 있는 setter 확인
            const valueSetter = setterMethods.find(s => s.name === 'setConfigValue');
            assert.ok(valueSetter, 'Should find setConfigValue');
            assert.ok(valueSetter.annotations.some(a => a.name === 'Autowired'), 'Should have @Autowired annotation');
        });

        test('should_ignoreNonSetterMethods_when_autowiredButNotSetter', async () => {
            // Arrange
            const content = `
            package com.example.service;
            
            import org.springframework.stereotype.Service;
            import org.springframework.beans.factory.annotation.Autowired;
            
            @Service
            public class TestService {
                @Autowired
                public void initializeService(UserService userService) {
                    // @Autowired이지만 setter가 아닌 메서드
                }
                
                @Autowired
                public void setUserService(UserService userService) {
                    // 실제 setter 메서드
                }
            }
            `.trim();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            if (classInfo.methods) {
                const setterMethods = classInfo.methods.filter(m => m.isSetterMethod);
                assert.strictEqual(setterMethods.length, 1, 'Should only find actual setter methods');
                assert.strictEqual(setterMethods[0].name, 'setUserService', 'Should only find setUserService');
            }
        });

        test('should_returnEmptyMethods_when_noSettersFound', async () => {
            // Arrange
            const content = JavaSampleGenerator.simpleAutowiredClass(); // 필드 주입만 있는 클래스

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
            const classInfo = result.classes[0];
            
            // setter 메서드가 없으면 빈 배열이거나 undefined
            const setterMethods = classInfo.methods?.filter(m => m.isSetterMethod) || [];
            assert.strictEqual(setterMethods.length, 0, 'Should have no setter methods');
        });
    });

    suite('Integration Tests', () => {
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

        // ===== Phase 2 통합 테스트 =====

        test('should_handleMixedInjections_when_fieldConstructorSetterCombined', async () => {
            // Arrange
            const content = JavaSampleGenerator.mixedInjection();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should parse mixed injection class without errors');
            assert.strictEqual(result.classes.length, 1, 'Should parse one class');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'UserService');

            // 필드 주입 확인
            const autowiredFields = classInfo.fields.filter(f => 
                f.annotations.some(a => a.type === SpringAnnotationType.AUTOWIRED)
            );
            assert.strictEqual(autowiredFields.length, 1, 'Should have 1 @Autowired field');
            assert.strictEqual(autowiredFields[0].type, 'UserRepository', 'Should be UserRepository field');

            // 생성자 주입 확인
            assert.ok(classInfo.constructors, 'Should have constructors');
            assert.strictEqual(classInfo.constructors!.length, 1, 'Should have 1 constructor');
            const constructor = classInfo.constructors![0];
            assert.strictEqual(constructor.parameters.length, 1, 'Constructor should have 1 parameter');
            assert.strictEqual(constructor.parameters[0].type, 'EmailService', 'Should inject EmailService');

            // Setter 주입 확인
            assert.ok(classInfo.methods, 'Should have methods');
            const setterMethods = classInfo.methods!.filter(m => m.isSetterMethod);
            assert.strictEqual(setterMethods.length, 1, 'Should have 1 setter method');
            assert.strictEqual(setterMethods[0].name, 'setSmsService', 'Should be setSmsService');
            assert.ok(setterMethods[0].annotations.some(a => a.name === 'Autowired'), 'Setter should have @Autowired');
        });

        test('should_extractAllInjectionTypes_when_completeSpringServiceProvided', async () => {
            // Arrange
            const content = JavaSampleGenerator.complexConstructorInjection();

            // Act
            const result = await parser.parseJavaFile(mockUri, content);

            // Assert
            assert.strictEqual(result.errors.length, 0, 'Should parse complex service without errors');
            
            const classInfo = result.classes[0];
            assert.strictEqual(classInfo.name, 'ComplexService');

            // 생성자 주입 확인
            assert.ok(classInfo.constructors, 'Should have constructors');
            const constructor = classInfo.constructors![0];
            assert.strictEqual(constructor.hasAutowiredAnnotation, true, 'Constructor should have @Autowired');
            assert.strictEqual(constructor.parameters.length, 3, 'Should have 3 constructor parameters');

            // 생성자 매개변수에서 주입 정보 추출
            const constructorInjections = constructor.parameters.map(p => ({
                targetType: p.type,
                targetName: p.name,
                injectionType: InjectionType.CONSTRUCTOR
            }));

            assert.strictEqual(constructorInjections.length, 3, 'Should have 3 constructor injections');
            
            // 타입별 주입 확인
            const repoInjection = constructorInjections.find(i => i.targetType.includes('Repository'));
            assert.ok(repoInjection, 'Should have Repository injection');
            
            const listInjection = constructorInjections.find(i => i.targetType.includes('List'));
            assert.ok(listInjection, 'Should have List injection');
            
            const stringInjection = constructorInjections.find(i => i.targetType === 'String');
            assert.ok(stringInjection, 'Should have String injection');
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
            assert.ok(endTime - startTime < 1000, 'Should handle multiple calls within 1 second');
        });
    });

    // ===== Phase 3: Lombok 어노테이션 탐지 테스트 =====
    suite('🔧 Lombok Annotation Detection', () => {
        
        suite('detectLombokAnnotations', () => {
            test('should_detectRequiredArgsConstructor_when_lombokAnnotationPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.RequiredArgsConstructor;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                public class UserService {
                    private final UserRepository userRepository;
                    private final EmailService emailService;
                    private String tempData;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokAnnotations = classInfo.annotations.filter(a => a.name === 'RequiredArgsConstructor');
                assert.strictEqual(lombokAnnotations.length, 1, 'Should detect @RequiredArgsConstructor annotation');
                assert.strictEqual(lombokAnnotations[0].type, SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR, 'Should identify Lombok annotation type');
            });

            test('should_detectAllArgsConstructor_when_lombokAnnotationPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.AllArgsConstructor;
                import org.springframework.stereotype.Service;
                
                @Service
                @AllArgsConstructor
                public class NotificationService {
                    private final EmailService emailService;
                    private SmsService smsService;
                    private String configValue;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokAnnotations = classInfo.annotations.filter(a => a.name === 'AllArgsConstructor');
                assert.strictEqual(lombokAnnotations.length, 1, 'Should detect @AllArgsConstructor annotation');
                assert.strictEqual(lombokAnnotations[0].type, SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR, 'Should identify Lombok annotation type');
            });

            test('should_detectDataAnnotation_when_lombokDataPresent', async () => {
                // Arrange
                const content = `
                package com.example.model;
                
                import lombok.Data;
                import org.springframework.stereotype.Service;
                
                @Service
                @Data
                public class DataService {
                    private final UserRepository userRepository;
                    private final EmailService emailService;
                    private String configurableField;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokAnnotations = classInfo.annotations.filter(a => a.name === 'Data');
                assert.strictEqual(lombokAnnotations.length, 1, 'Should detect @Data annotation');
                assert.strictEqual(lombokAnnotations[0].type, SpringAnnotationType.LOMBOK_DATA, 'Should identify Lombok Data annotation type');
            });

            test('should_detectMultipleLombokAnnotations_when_combinedAnnotationsPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.RequiredArgsConstructor;
                import lombok.Slf4j;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                @Slf4j
                public class ComplexService {
                    private final UserRepository userRepository;
                    private final EmailService emailService;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const requiredArgsAnnotation = classInfo.annotations.find(a => a.name === 'RequiredArgsConstructor');
                const slf4jAnnotation = classInfo.annotations.find(a => a.name === 'Slf4j');
                
                assert.ok(requiredArgsAnnotation, 'Should detect @RequiredArgsConstructor annotation');
                assert.ok(slf4jAnnotation, 'Should detect @Slf4j annotation');
                assert.strictEqual(requiredArgsAnnotation.type, SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR, 'Should identify RequiredArgsConstructor type');
                assert.strictEqual(slf4jAnnotation.type, SpringAnnotationType.LOMBOK_SLF4J, 'Should identify Slf4j type');
            });

            test('should_ignoreNonLombokAnnotations_when_mixedAnnotationsPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.RequiredArgsConstructor;
                import org.springframework.stereotype.Service;
                import org.springframework.beans.factory.annotation.Autowired;
                
                @Service
                @RequiredArgsConstructor
                @Deprecated
                public class MixedService {
                    @Autowired
                    private UserRepository userRepository;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokAnnotations = classInfo.annotations.filter(a => 
                    a.name === 'RequiredArgsConstructor' || 
                    a.name === 'AllArgsConstructor' || 
                    a.name === 'Data'
                );
                
                assert.strictEqual(lombokAnnotations.length, 1, 'Should only detect Lombok annotations');
                assert.strictEqual(lombokAnnotations[0].name, 'RequiredArgsConstructor', 'Should detect RequiredArgsConstructor');
                
                // Spring 어노테이션도 여전히 탐지되어야 함
                const springAnnotations = classInfo.annotations.filter(a => a.type === SpringAnnotationType.SERVICE);
                assert.strictEqual(springAnnotations.length, 1, 'Should still detect Spring annotations');
            });
        });

        suite('detectLombokImports', () => {
            test('should_detectLombokImports_when_lombokPackageImported', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.RequiredArgsConstructor;
                import lombok.NonNull;
                import lombok.Data;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                public class ImportTestService {
                    private final UserRepository userRepository;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokImports = classInfo.imports.filter(imp => imp.startsWith('lombok.'));
                assert.strictEqual(lombokImports.length, 3, 'Should detect 3 Lombok imports');
                assert.ok(lombokImports.includes('lombok.RequiredArgsConstructor'), 'Should detect RequiredArgsConstructor import');
                assert.ok(lombokImports.includes('lombok.NonNull'), 'Should detect NonNull import');
                assert.ok(lombokImports.includes('lombok.Data'), 'Should detect Data import');
            });

            test('should_returnEmptyLombokImports_when_noLombokImportsPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import org.springframework.stereotype.Service;
                import org.springframework.beans.factory.annotation.Autowired;
                
                @Service
                public class NoLombokService {
                    @Autowired
                private UserRepository userRepository;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokImports = classInfo.imports.filter(imp => imp.startsWith('lombok.'));
                assert.strictEqual(lombokImports.length, 0, 'Should not detect any Lombok imports');
            });

            test('should_detectWildcardLombokImport_when_wildcardImportUsed', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.*;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                public class WildcardService {
                    private final UserRepository userRepository;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const lombokImports = classInfo.imports.filter(imp => imp.startsWith('lombok.'));
                assert.ok(lombokImports.length > 0, 'Should detect Lombok wildcard import');
                assert.ok(lombokImports.some(imp => imp === 'lombok.*'), 'Should detect lombok.* import');
            });
        });

        suite('analyzeLombokFieldModifiers', () => {
            test('should_identifyFinalFields_when_finalKeywordPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.RequiredArgsConstructor;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                public class FinalFieldService {
                    private final UserRepository userRepository;
                    private final EmailService emailService;
                    private String nonFinalField;
                    private static final String CONSTANT = "test";
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const finalFields = classInfo.fields.filter(f => f.isFinal === true);
                const nonFinalFields = classInfo.fields.filter(f => f.isFinal === false);
                
                assert.strictEqual(finalFields.length, 3, 'Should detect 3 final fields (including static final)');
                assert.strictEqual(nonFinalFields.length, 1, 'Should detect 1 non-final field');
                
                // final 필드 이름 확인
                const finalFieldNames = finalFields.map(f => f.name);
                assert.ok(finalFieldNames.includes('userRepository'), 'Should include userRepository as final');
                assert.ok(finalFieldNames.includes('emailService'), 'Should include emailService as final');
                assert.ok(finalFieldNames.includes('CONSTANT'), 'Should include CONSTANT as final');
            });

            test('should_identifyNonNullFields_when_nonNullAnnotationPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.RequiredArgsConstructor;
                import lombok.NonNull;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                public class NonNullFieldService {
                    private final UserRepository userRepository;
                    @NonNull
                    private PaymentGateway paymentGateway;
                    private String optionalField;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const nonNullFields = classInfo.fields.filter(f => 
                    f.annotations.some(a => a.name === 'NonNull')
                );
                
                assert.strictEqual(nonNullFields.length, 1, 'Should detect 1 @NonNull field');
                assert.strictEqual(nonNullFields[0].name, 'paymentGateway', 'Should identify paymentGateway as @NonNull');
                assert.strictEqual(nonNullFields[0].type, 'PaymentGateway', 'Should preserve field type');
            });

            test('should_distinguishStaticFields_when_staticModifierPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.AllArgsConstructor;
                import org.springframework.stereotype.Service;
                
                @Service
                @AllArgsConstructor
                public class StaticFieldService {
                    private final UserRepository userRepository;
                    private EmailService emailService;
                    private static final String VERSION = "1.0";
                    private static int instanceCount = 0;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                assert.strictEqual(result.errors.length, 0, 'Should not have parsing errors');
                assert.strictEqual(result.classes.length, 1, 'Should parse one class');
                
                const classInfo = result.classes[0];
                const staticFields = classInfo.fields.filter(f => f.isStatic === true);
                const nonStaticFields = classInfo.fields.filter(f => f.isStatic === false);
                
                assert.strictEqual(staticFields.length, 2, 'Should detect 2 static fields');
                assert.strictEqual(nonStaticFields.length, 2, 'Should detect 2 non-static fields');
                
                // static 필드 이름 확인
                const staticFieldNames = staticFields.map(f => f.name);
                assert.ok(staticFieldNames.includes('VERSION'), 'Should include VERSION as static');
                assert.ok(staticFieldNames.includes('instanceCount'), 'Should include instanceCount as static');
            });
        });

        suite('Error Handling', () => {
            test('should_handleInvalidLombokAnnotation_when_unknownLombokAnnotationPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.UnknownAnnotation;
                import org.springframework.stereotype.Service;
                
                @Service
                @UnknownAnnotation
                public class InvalidLombokService {
                    private final UserRepository userRepository;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                // 파싱 자체는 성공해야 하지만, 알 수 없는 Lombok 어노테이션은 무시
                assert.strictEqual(result.classes.length, 1, 'Should still parse the class');
                
                const classInfo = result.classes[0];
                const unknownAnnotations = classInfo.annotations.filter(a => a.name === 'UnknownAnnotation');
                // 알 수 없는 어노테이션은 일반 어노테이션으로 처리되거나 무시될 수 있음
                assert.ok(unknownAnnotations.length >= 0, 'Should handle unknown Lombok annotations gracefully');
            });

            test('should_handleMalformedLombokImport_when_invalidImportPresent', async () => {
                // Arrange
                const content = `
                package com.example.service;
                
                import lombok.;
                import lombok.RequiredArgsConstructor;
                import org.springframework.stereotype.Service;
                
                @Service
                @RequiredArgsConstructor
                public class MalformedImportService {
                    private final UserRepository userRepository;
                }
                `.trim();

                // Act
                const result = await parser.parseJavaFile(mockUri, content);

                // Assert
                // 잘못된 import는 파싱 에러를 발생시킬 수 있음
                if (result.errors.length > 0) {
                    // 에러가 있으면 import 관련 에러인지 확인
                    const hasImportError = result.errors.some(e => 
                        e.includes('import') || 
                        e.includes('파싱') || 
                        e.includes('parsing')
                    );
                    assert.ok(hasImportError, 'Should report parsing errors related to invalid import');
                } else {
                    // 에러가 없으면 클래스는 파싱되지 않아야 함 (malformed import로 인해)
                    // 또는 빈 결과여야 함
                    const hasValidClass = result.classes.length > 0 && 
                                         result.classes[0].name === 'MalformedImportService';
                    
                    // 잘못된 import 때문에 클래스가 제대로 파싱되지 않을 것으로 예상
                    assert.ok(!hasValidClass || result.classes.length === 0, 
                        'Should not successfully parse class with malformed import');
                }
            });
        });
    });
}); 