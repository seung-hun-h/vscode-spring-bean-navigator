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