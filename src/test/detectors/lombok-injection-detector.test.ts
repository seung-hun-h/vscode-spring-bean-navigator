import * as assert from 'assert';
import * as vscode from 'vscode';
import { LombokInjectionDetector } from '../../detectors/lombok-injection-detector';
import { 
    ClassInfo,
    FieldInfo,
    SpringAnnotationType,
    VirtualConstructorInfo,
    LombokAnnotationInfo,
    LombokSimulationResult,
    InjectionType
} from '../../models/spring-types';
import { 
    TestUtils, 
    LombokJavaSampleGenerator,
    LombokMockHelper,
    LombokExpectedResultHelper
} from '../helpers/test-utils';

suite('🔧 LombokInjectionDetector Test Suite', () => {
    let detector: LombokInjectionDetector;
    let mockUri: vscode.Uri;

    setup(() => {
        detector = new LombokInjectionDetector();
        mockUri = TestUtils.createMockUri('/test/LombokService.java');
    });

    suite('detectAllInjections (IInjectionDetector 인터페이스)', () => {
        test('should_detectLombokInjections_when_requiredArgsConstructorPresent', () => {
            // Arrange
            const finalField1 = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const finalField2 = LombokMockHelper.createFinalFieldInfo('emailService', 'EmailService', 6);
            
            const classInfo = TestUtils.createClassInfo('UserService', 'com.example.service',
                [finalField1, finalField2],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectAllInjections([classInfo]);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect 2 Lombok injections');
            assert.strictEqual(result[0].targetType, 'UserRepository');
            assert.strictEqual(result[0].targetName, 'userRepository');
            assert.strictEqual(result[0].injectionType, InjectionType.CONSTRUCTOR_LOMBOK);
            assert.strictEqual(result[1].targetType, 'EmailService');
            assert.strictEqual(result[1].targetName, 'emailService');
            assert.strictEqual(result[1].injectionType, InjectionType.CONSTRUCTOR_LOMBOK);
        });

        test('should_handleMultipleClasses_when_lombokAnnotationsPresent', () => {
            // Arrange
            const class1 = TestUtils.createClassInfo('Service1', 'com.example',
                [LombokMockHelper.createFinalFieldInfo('repo1', 'Repository1', 5)],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            const class2 = TestUtils.createClassInfo('Service2', 'com.example',
                [LombokMockHelper.createFinalFieldInfo('repo2', 'Repository2', 5)],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectAllInjections([class1, class2]);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect injections from both classes');
            
            const repo1Injection = result.find(inj => inj.targetName === 'repo1');
            const repo2Injection = result.find(inj => inj.targetName === 'repo2');
            
            assert.ok(repo1Injection, 'Should find injection from Service1');
            assert.ok(repo2Injection, 'Should find injection from Service2');
        });

        test('should_returnEmpty_when_noLombokAnnotations', () => {
            // Arrange
            const classInfo = TestUtils.createClassInfo('PlainService', 'com.example.service',
                [TestUtils.createFieldInfo('someField', 'SomeType', [], 5)],
                [] // Lombok 어노테이션 없음
            );

            // Act
            const result = detector.detectAllInjections([classInfo]);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array when no Lombok annotations');
        });
    });

    suite('detectRequiredArgsConstructor', () => {
        test('should_generateVirtualConstructor_when_requiredArgsConstructorWithFinalFields', () => {
            // Arrange
            const finalField1 = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const finalField2 = LombokMockHelper.createFinalFieldInfo('emailService', 'EmailService', 6);
            const nonFinalField = TestUtils.createFieldInfo('tempData', 'String', [], 7);
            
            const classInfo = TestUtils.createClassInfo('UserService', 'com.example.service', 
                [finalField1, finalField2, nonFinalField], 
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectRequiredArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters.length, 2, 'Should include only final fields');
            assert.strictEqual(result.parameters[0].name, 'userRepository');
            assert.strictEqual(result.parameters[1].name, 'emailService');
            assert.strictEqual(result.lombokAnnotationType, SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR);
            assert.strictEqual(result.isVirtual, true);
        });
        
        test('should_includeNonNullFields_when_requiredArgsConstructorWithNonNull', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const nonNullField = LombokMockHelper.createNonNullFieldInfo('productService', 'ProductService', 6);
            const regularField = TestUtils.createFieldInfo('optionalService', 'OptionalService', [], 7);
            
            const classInfo = TestUtils.createClassInfo('OrderService', 'com.example.service',
                [finalField, nonNullField, regularField],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectRequiredArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters.length, 2, 'Should include final and @NonNull fields');
            
            const paramNames = result.parameters.map(p => p.name);
            assert.ok(paramNames.includes('userRepository'), 'Should include final field');
            assert.ok(paramNames.includes('productService'), 'Should include @NonNull field');
            assert.ok(!paramNames.includes('optionalService'), 'Should not include regular field');
        });
        
        test('should_maintainFieldOrder_when_generatingConstructorParameters', () => {
            // Arrange
            const field1 = LombokMockHelper.createFinalFieldInfo('firstService', 'FirstService', 5);
            const field2 = LombokMockHelper.createFinalFieldInfo('secondService', 'SecondService', 6);
            const field3 = LombokMockHelper.createFinalFieldInfo('thirdService', 'ThirdService', 7);
            
            const classInfo = TestUtils.createClassInfo('OrderedService', 'com.example.service',
                [field1, field2, field3],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectRequiredArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters.length, 3, 'Should include all final fields');
            
            // 필드 순서 확인
            assert.strictEqual(result.parameters[0].name, 'firstService', 'First parameter order');
            assert.strictEqual(result.parameters[1].name, 'secondService', 'Second parameter order');
            assert.strictEqual(result.parameters[2].name, 'thirdService', 'Third parameter order');
        });

        test('should_returnUndefined_when_noRequiredArgsAnnotation', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            
            const classInfo = TestUtils.createClassInfo('PlainService', 'com.example.service',
                [finalField],
                [] // Lombok 어노테이션 없음
            );

            // Act
            const result = detector.detectRequiredArgsConstructor(classInfo);

            // Assert
            assert.strictEqual(result, undefined, 'Should return undefined when no @RequiredArgsConstructor');
        });

        test('should_handleStaticFinalFields_when_excludingFromConstructor', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const staticFinalField = LombokMockHelper.createStaticFinalFieldInfo('VERSION', 'String', 6);
            
            const classInfo = TestUtils.createClassInfo('ServiceWithStatic', 'com.example.service',
                [finalField, staticFinalField],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectRequiredArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters.length, 1, 'Should exclude static final fields');
            assert.strictEqual(result.parameters[0].name, 'userRepository', 'Should include only non-static final field');
        });
    });

    suite('detectAllArgsConstructor', () => {
        test('should_includeAllFields_when_allArgsConstructorDetected', () => {
            // Arrange
            const field1 = TestUtils.createFieldInfo('userRepository', 'UserRepository', [], 5);
            const field2 = TestUtils.createFieldInfo('emailService', 'EmailService', [], 6);
            const field3 = TestUtils.createFieldInfo('configService', 'ConfigService', [], 7);
            
            const classInfo = TestUtils.createClassInfo('ReportService', 'com.example.service',
                [field1, field2, field3],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectAllArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters.length, 3, 'Should include all fields');
            assert.strictEqual(result.lombokAnnotationType, SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR);
            
            const paramNames = result.parameters.map(p => p.name);
            assert.ok(paramNames.includes('userRepository'));
            assert.ok(paramNames.includes('emailService'));
            assert.ok(paramNames.includes('configService'));
        });
        
        test('should_excludeStaticFields_when_generatingAllArgsConstructor', () => {
            // Arrange
            const normalField = TestUtils.createFieldInfo('userRepository', 'UserRepository', [], 5);
            const staticField = LombokMockHelper.createStaticFinalFieldInfo('VERSION', 'String', 6);
            
            const classInfo = TestUtils.createClassInfo('ServiceWithStatic', 'com.example.service',
                [normalField, staticField],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectAllArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters.length, 1, 'Should exclude static fields');
            assert.strictEqual(result.parameters[0].name, 'userRepository', 'Should include only non-static field');
        });

        test('should_maintainFieldOrder_when_allArgsConstructorGenerated', () => {
            // Arrange
            const field1 = TestUtils.createFieldInfo('alpha', 'AlphaService', [], 5);
            const field2 = TestUtils.createFieldInfo('beta', 'BetaService', [], 6);
            const field3 = TestUtils.createFieldInfo('gamma', 'GammaService', [], 7);
            
            const classInfo = TestUtils.createClassInfo('OrderedService', 'com.example.service',
                [field1, field2, field3],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectAllArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should generate virtual constructor');
            assert.strictEqual(result.parameters[0].name, 'alpha', 'First field order');
            assert.strictEqual(result.parameters[1].name, 'beta', 'Second field order');
            assert.strictEqual(result.parameters[2].name, 'gamma', 'Third field order');
        });
    });

    suite('simulateLombokGeneration', () => {
        test('should_matchActualLombokOutput_when_simulatingConstructor', () => {
            // Arrange
            const finalField1 = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const finalField2 = LombokMockHelper.createFinalFieldInfo('emailService', 'EmailService', 6);
            
            const classInfo = TestUtils.createClassInfo('UserService', 'com.example.service',
                [finalField1, finalField2],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.simulateLombokGeneration(classInfo);

            // Assert
            assert.ok(result.isSuccess, 'Simulation should succeed');
            assert.strictEqual(result.virtualConstructors.length, 1, 'Should generate one virtual constructor');
            assert.strictEqual(result.lombokAnnotations.length, 1, 'Should detect one Lombok annotation');
            
            const constructor = result.virtualConstructors[0];
            assert.strictEqual(constructor.parameters.length, 2, 'Constructor should have 2 parameters');
            assert.strictEqual(constructor.annotationSource, 'RequiredArgsConstructor');
        });
        
        test('should_handleComplexAnnotations_when_multipleAnnotationsPresent', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const classInfo = TestUtils.createClassInfo('ComplexService', 'com.example.service',
                [finalField],
                [
                    LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR),
                    LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_SLF4J),
                    LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.SERVICE)
                ]
            );

            // Act
            const result = detector.simulateLombokGeneration(classInfo);

            // Assert
            assert.ok(result.isSuccess, 'Should handle complex annotations');
            assert.strictEqual(result.virtualConstructors.length, 1, 'Should generate constructor from @RequiredArgsConstructor');
            assert.ok(result.lombokAnnotations.length >= 1, 'Should detect Lombok annotations');
        });

        test('should_respectLombokConfiguration_when_customParametersPresent', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const lombokAnnotationWithConfig = LombokMockHelper.createLombokAnnotationInfo(
                SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR,
                new Map([['access', 'protected']])
            );
            
            const classInfo = TestUtils.createClassInfo('ConfiguredService', 'com.example.service',
                [finalField],
                [lombokAnnotationWithConfig]
            );

            // Act
            const result = detector.simulateLombokGeneration(classInfo);

            // Assert
            assert.ok(result.isSuccess, 'Should respect Lombok configuration');
            const constructor = result.virtualConstructors[0];
            assert.strictEqual(constructor.visibility, 'protected', 'Should use configured access level');
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullClassInfo_when_nullProvided', () => {
            // Act & Assert
            assert.throws(() => {
                detector.detectRequiredArgsConstructor(null as any);
            }, 'Should throw error for null classInfo');
            
            assert.throws(() => {
                detector.detectAllArgsConstructor(null as any);
            }, 'Should throw error for null classInfo');
        });

        test('should_handleEmptyFields_when_noFieldsInClass', () => {
            // Arrange
            const classInfo = TestUtils.createClassInfo('EmptyService', 'com.example.service',
                [], // 필드 없음
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.detectRequiredArgsConstructor(classInfo);

            // Assert
            assert.ok(result, 'Should handle empty fields gracefully');
            assert.strictEqual(result.parameters.length, 0, 'Should generate empty constructor');
        });

        test('should_handleMalformedAnnotations_when_invalidLombokAnnotations', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const malformedAnnotation = {
                name: 'InvalidLombok',
                type: 'INVALID' as any,
                line: 3,
                column: 0
            };
            
            const classInfo = TestUtils.createClassInfo('InvalidService', 'com.example.service',
                [finalField],
                [malformedAnnotation as any]
            );

            // Act
            const result = detector.simulateLombokGeneration(classInfo);

            // Assert
            assert.strictEqual(result.isSuccess, false, 'Should fail with malformed annotations');
            assert.ok(result.errors && result.errors.length > 0, 'Should contain error messages');
        });
    });

    suite('Integration Tests', () => {
        test('should_processRealWorldExample_when_complexLombokServiceProvided', () => {
            // Arrange
            const finalField1 = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const finalField2 = LombokMockHelper.createFinalFieldInfo('emailService', 'EmailService', 6);
            const nonNullField = LombokMockHelper.createNonNullFieldInfo('configService', 'ConfigService', 7);
            const regularField = TestUtils.createFieldInfo('tempData', 'String', [], 8);
            
            const classInfo = TestUtils.createClassInfo('RealWorldService', 'com.example.service',
                [finalField1, finalField2, nonNullField, regularField],
                [
                    LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR),
                    TestUtils.createAnnotationInfo('Service', SpringAnnotationType.SERVICE)
                ]
            );

            // Act
            const result = detector.simulateLombokGeneration(classInfo);

            // Assert
            assert.ok(result.isSuccess, 'Should process real-world example successfully');
            assert.strictEqual(result.virtualConstructors.length, 1, 'Should generate one constructor');
            
            const constructor = result.virtualConstructors[0];
            assert.strictEqual(constructor.parameters.length, 3, 'Should include final + @NonNull fields');
            
            const paramNames = constructor.parameters.map(p => p.name);
            assert.ok(paramNames.includes('userRepository'));
            assert.ok(paramNames.includes('emailService'));
            assert.ok(paramNames.includes('configService'));
            assert.ok(!paramNames.includes('tempData'), 'Should exclude regular field');
        });

        test('should_integratePreviousPhases_when_mixedInjectionTypesPresent', () => {
            // Arrange
            const finalField = LombokMockHelper.createFinalFieldInfo('userRepository', 'UserRepository', 5);
            const autowiredField = TestUtils.createFieldInfo('emailService', 'EmailService', 
                [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)], 6);
            
            const classInfo = TestUtils.createClassInfo('MixedService', 'com.example.service',
                [finalField, autowiredField],
                [LombokMockHelper.createLombokAnnotationInfo(SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR)]
            );

            // Act
            const result = detector.simulateLombokGeneration(classInfo);

            // Assert
            assert.ok(result.isSuccess, 'Should integrate with previous phases');
            
            // Lombok 생성자는 final 필드만 포함
            const constructor = result.virtualConstructors[0];
            assert.strictEqual(constructor.parameters.length, 1, 'Lombok constructor should include only final field');
            assert.strictEqual(constructor.parameters[0].name, 'userRepository');
            
            // @Autowired 필드는 별도 처리됨 (Phase 1 기능)
            const fieldAnalysis = result.fieldAnalysis;
            assert.ok(fieldAnalysis.requiredArgsFields.some(f => f.name === 'userRepository'), 'Should identify Lombok fields');
        });
    });
}); 