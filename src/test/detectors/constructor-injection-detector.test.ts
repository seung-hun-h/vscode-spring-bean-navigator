import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConstructorInjectionDetector } from '../../detectors/constructor-injection-detector';
import { 
    ConstructorInfo,
    ParameterInfo,
    AnnotationInfo,
    SpringAnnotationType,
    InjectionInfo,
    InjectionType,
    ClassInfo
} from '../../models/spring-types';
import { 
    TestUtils, 
    JavaSampleGenerator, 
} from '../helpers/test-utils';

suite('🔧 ConstructorInjectionDetector Test Suite', () => {
    let detector: ConstructorInjectionDetector;
    let mockUri: vscode.Uri;

    setup(() => {
        detector = new ConstructorInjectionDetector();
        mockUri = TestUtils.createMockUri('/test/TestService.java');
    });

    suite('detectSingleConstructorInjection', () => {
        test('should_detectInjection_when_singleConstructorExists', () => {
            // Arrange
            const userRepoParam = TestUtils.createParameterInfo('userRepository', 'UserRepository');
            const productRepoParam = TestUtils.createParameterInfo('productRepository', 'ProductRepository');
            
            const constructor: ConstructorInfo = {
                parameters: [userRepoParam, productRepoParam],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 5, 50),
                hasAutowiredAnnotation: false // Spring 5.0+ 단일 생성자는 @Autowired 생략 가능
            };

            const classInfo = TestUtils.createClassInfo('OrderService', 'com.example.service', [], []);
            classInfo.constructors = [constructor];

            // Act
            const result = detector.detectSingleConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect 2 constructor injections');
            
            const userRepoInjection = result.find((i: InjectionInfo) => i.targetType === 'UserRepository');
            assert.ok(userRepoInjection, 'Should find UserRepository injection');
            assert.strictEqual(userRepoInjection.injectionType, InjectionType.CONSTRUCTOR, 'Should be constructor injection');
            assert.strictEqual(userRepoInjection.targetName, 'userRepository', 'Should have correct parameter name');
            
            const productRepoInjection = result.find((i: InjectionInfo) => i.targetType === 'ProductRepository');
            assert.ok(productRepoInjection, 'Should find ProductRepository injection');
            assert.strictEqual(productRepoInjection.injectionType, InjectionType.CONSTRUCTOR, 'Should be constructor injection');
        });

        test('should_notDetectInjection_when_multipleConstructorsExist', () => {
            // Arrange
            const constructor1: ConstructorInfo = {
                parameters: [],
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 20),
                hasAutowiredAnnotation: false
            };

            const constructor2: ConstructorInfo = {
                parameters: [TestUtils.createParameterInfo('userService', 'UserService')],
                position: TestUtils.createPosition(6, 4),
                range: TestUtils.createRange(6, 4, 6, 40),
                hasAutowiredAnnotation: false // @Autowired 없는 다중 생성자
            };

            const classInfo = TestUtils.createClassInfo('PaymentService', 'com.example.service', [], []);
            classInfo.constructors = [constructor1, constructor2];

            // Act
            const result = detector.detectSingleConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not detect injection for multiple constructors without @Autowired');
        });

        test('should_handleEmptyParameterList_when_singleConstructorHasNoParameters', () => {
            // Arrange
            const constructor: ConstructorInfo = {
                parameters: [], // 매개변수 없는 생성자
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 20),
                hasAutowiredAnnotation: false
            };

            const classInfo = TestUtils.createClassInfo('SimpleService', 'com.example.service', [], []);
            classInfo.constructors = [constructor];

            // Act
            const result = detector.detectSingleConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not detect injection for constructor without parameters');
        });

        test('should_handleNoConstructors_when_constructorsUndefined', () => {
            // Arrange
            const classInfo = TestUtils.createClassInfo('PlainService', 'com.example.service', [], []);
            // constructors undefined (기본 생성자만 있는 경우)

            // Act
            const result = detector.detectSingleConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not detect injection when no constructors defined');
        });

        test('should_extractParameterTypes_when_constructorHasMultipleParameters', () => {
            // Arrange
            const params = [
                TestUtils.createParameterInfo('userRepo', 'Repository<User>'),
                TestUtils.createParameterInfo('messageServices', 'List<MessageService>'),
                TestUtils.createParameterInfo('configValue', 'String')
            ];

            const constructor: ConstructorInfo = {
                parameters: params,
                position: TestUtils.createPosition(8, 4),
                range: TestUtils.createRange(8, 4, 12, 5),
                hasAutowiredAnnotation: false
            };

            const classInfo = TestUtils.createClassInfo('ComplexService', 'com.example.service', [], []);
            classInfo.constructors = [constructor];

            // Act
            const result = detector.detectSingleConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 3, 'Should detect 3 constructor injections');
            
            const repoInjection = result.find((i: InjectionInfo) => i.targetName === 'userRepo');
            assert.ok(repoInjection, 'Should find Repository injection');
            assert.strictEqual(repoInjection.targetType, 'Repository<User>', 'Should preserve generic type');
            
            const listInjection = result.find((i: InjectionInfo) => i.targetName === 'messageServices');
            assert.ok(listInjection, 'Should find List injection');
            assert.strictEqual(listInjection.targetType, 'List<MessageService>', 'Should preserve generic List type');
            
            const stringInjection = result.find((i: InjectionInfo) => i.targetName === 'configValue');
            assert.ok(stringInjection, 'Should find String injection');
            assert.strictEqual(stringInjection.targetType, 'String', 'Should have String type');
        });
    });

    suite('detectAutowiredConstructorInjection', () => {
        test('should_detectAutowiredConstructor_when_multipleConstructorsWithAutowired', () => {
            // Arrange
            const defaultConstructor: ConstructorInfo = {
                parameters: [],
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 20),
                hasAutowiredAnnotation: false
            };

            const autowiredConstructor: ConstructorInfo = {
                parameters: [
                    TestUtils.createParameterInfo('userRepository', 'UserRepository'),
                    TestUtils.createParameterInfo('paymentGateway', 'PaymentGateway')
                ],
                position: TestUtils.createPosition(7, 4),
                range: TestUtils.createRange(7, 4, 9, 5),
                hasAutowiredAnnotation: true // @Autowired 생성자
            };

            const classInfo = TestUtils.createClassInfo('PaymentService', 'com.example.service', [], []);
            classInfo.constructors = [defaultConstructor, autowiredConstructor];

            // Act
            const result = detector.detectAutowiredConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect 2 injections from @Autowired constructor');
            
            const userRepoInjection = result.find((i: InjectionInfo) => i.targetType === 'UserRepository');
            assert.ok(userRepoInjection, 'Should find UserRepository injection');
            assert.strictEqual(userRepoInjection.injectionType, InjectionType.CONSTRUCTOR, 'Should be constructor injection');
            
            const paymentGatewayInjection = result.find((i: InjectionInfo) => i.targetType === 'PaymentGateway');
            assert.ok(paymentGatewayInjection, 'Should find PaymentGateway injection');
            assert.strictEqual(paymentGatewayInjection.injectionType, InjectionType.CONSTRUCTOR, 'Should be constructor injection');
        });

        test('should_returnEmpty_when_noAutowiredConstructorInMultiple', () => {
            // Arrange
            const constructor1: ConstructorInfo = {
                parameters: [],
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 20),
                hasAutowiredAnnotation: false
            };

            const constructor2: ConstructorInfo = {
                parameters: [TestUtils.createParameterInfo('service', 'SomeService')],
                position: TestUtils.createPosition(6, 4),
                range: TestUtils.createRange(6, 4, 6, 30),
                hasAutowiredAnnotation: false // @Autowired 없음
            };

            const classInfo = TestUtils.createClassInfo('AmbiguousService', 'com.example.service', [], []);
            classInfo.constructors = [constructor1, constructor2];

            // Act
            const result = detector.detectAutowiredConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not detect injection when no @Autowired constructor exists');
        });

        test('should_selectFirstAutowired_when_multipleAutowiredConstructorsExist', () => {
            // Arrange - 이론상 여러 @Autowired 생성자는 컴파일 에러지만 테스트를 위해
            const autowiredConstructor1: ConstructorInfo = {
                parameters: [TestUtils.createParameterInfo('service1', 'Service1')],
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 30),
                hasAutowiredAnnotation: true
            };

            const autowiredConstructor2: ConstructorInfo = {
                parameters: [TestUtils.createParameterInfo('service2', 'Service2')],
                position: TestUtils.createPosition(6, 4),
                range: TestUtils.createRange(6, 4, 6, 30),
                hasAutowiredAnnotation: true
            };

            const classInfo = TestUtils.createClassInfo('ErrorService', 'com.example.service', [], []);
            classInfo.constructors = [autowiredConstructor1, autowiredConstructor2];

            // Act
            const result = detector.detectAutowiredConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 1, 'Should select only first @Autowired constructor');
            assert.strictEqual(result[0].targetType, 'Service1', 'Should use first @Autowired constructor');
        });

        test('should_handleComplexAnnotations_when_autowiredConstructorHasQualifiers', () => {
            // Arrange
            const param1 = TestUtils.createParameterInfo('userRepo', 'Repository<User>');
            const param2 = TestUtils.createParameterInfo('messageServices', 'List<MessageService>');
            const param3 = TestUtils.createParameterInfo('configValue', 'String');

            const autowiredConstructor: ConstructorInfo = {
                parameters: [param1, param2, param3],
                position: TestUtils.createPosition(10, 4),
                range: TestUtils.createRange(10, 4, 15, 5),
                hasAutowiredAnnotation: true
            };

            const classInfo = TestUtils.createClassInfo('ComplexService', 'com.example.service', [], []);
            classInfo.constructors = [autowiredConstructor];

            // Act
            const result = detector.detectAutowiredConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 3, 'Should detect all complex parameters');
            
            // 제네릭 타입 처리 확인
            const repoInjection = result.find((i: InjectionInfo) => i.targetType === 'Repository<User>');
            assert.ok(repoInjection, 'Should handle generic Repository type');
            
            const listInjection = result.find((i: InjectionInfo) => i.targetType === 'List<MessageService>');
            assert.ok(listInjection, 'Should handle generic List type');
        });
    });

    suite('detectAllConstructorInjections', () => {
        test('should_combineSingleAndAutowiredDetection_when_called', () => {
            // Arrange
            const singleConstructorClass = TestUtils.createClassInfo('SingleService', 'com.example', [], []);
            singleConstructorClass.constructors = [{
                parameters: [TestUtils.createParameterInfo('userService', 'UserService')],
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 30),
                hasAutowiredAnnotation: false
            }];

            const multipleConstructorClass = TestUtils.createClassInfo('MultipleService', 'com.example', [], []);
            multipleConstructorClass.constructors = [
                {
                    parameters: [],
                    position: TestUtils.createPosition(3, 4),
                    range: TestUtils.createRange(3, 4, 3, 20),
                    hasAutowiredAnnotation: false
                },
                {
                    parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                    position: TestUtils.createPosition(6, 4),
                    range: TestUtils.createRange(6, 4, 6, 30),
                    hasAutowiredAnnotation: true
                }
            ];

            const classes = [singleConstructorClass, multipleConstructorClass];

            // Act
            const result = detector.detectAllConstructorInjections(classes);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect injections from both single and @Autowired constructors');
            
            const userServiceInjection = result.find((i: InjectionInfo) => i.targetType === 'UserService');
            assert.ok(userServiceInjection, 'Should find injection from single constructor');
            
            const emailServiceInjection = result.find((i: InjectionInfo) => i.targetType === 'EmailService');
            assert.ok(emailServiceInjection, 'Should find injection from @Autowired constructor');
        });

        test('should_returnEmptyArray_when_noConstructorInjectionsFound', () => {
            // Arrange
            const classWithoutConstructors = TestUtils.createClassInfo('PlainService', 'com.example', [], []);
            
            const classWithMultipleNonAutowired = TestUtils.createClassInfo('AmbiguousService', 'com.example', [], []);
            classWithMultipleNonAutowired.constructors = [
                {
                    parameters: [],
                    position: TestUtils.createPosition(3, 4),
                    range: TestUtils.createRange(3, 4, 3, 20),
                    hasAutowiredAnnotation: false
                },
                {
                    parameters: [TestUtils.createParameterInfo('service', 'SomeService')],
                    position: TestUtils.createPosition(6, 4),
                    range: TestUtils.createRange(6, 4, 6, 30),
                    hasAutowiredAnnotation: false
                }
            ];

            const classes = [classWithoutConstructors, classWithMultipleNonAutowired];

            // Act
            const result = detector.detectAllConstructorInjections(classes);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array when no constructor injections found');
        });

        test('should_handleEmptyClassList_when_emptyArrayProvided', () => {
            // Arrange
            const classes: ClassInfo[] = [];

            // Act
            const result = detector.detectAllConstructorInjections(classes);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array for empty class list');
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullClassInfo_when_nullProvided', () => {
            // Arrange
            const nullClass = null as any;

            // Act & Assert
            const singleResult = detector.detectSingleConstructorInjection(nullClass);
            assert.strictEqual(singleResult.length, 0, 'Should return empty array for null class');

            const autowiredResult = detector.detectAutowiredConstructorInjection(nullClass);
            assert.strictEqual(autowiredResult.length, 0, 'Should return empty array for null class');
        });

        test('should_handleUndefinedConstructors_when_constructorsUndefined', () => {
            // Arrange
            const classInfo = TestUtils.createClassInfo('TestService', 'com.example', [], []);
            // constructors는 undefined

            // Act
            const singleResult = detector.detectSingleConstructorInjection(classInfo);
            const autowiredResult = detector.detectAutowiredConstructorInjection(classInfo);

            // Assert
            assert.strictEqual(singleResult.length, 0, 'Should handle undefined constructors for single detection');
            assert.strictEqual(autowiredResult.length, 0, 'Should handle undefined constructors for autowired detection');
        });

        test('should_handleMalformedParameters_when_parameterInfoInvalid', () => {
            // Arrange
            const malformedParam = {
                name: '', // 빈 이름
                type: '', // 빈 타입
                position: TestUtils.createPosition(0, 0)
            } as ParameterInfo;

            const constructor: ConstructorInfo = {
                parameters: [malformedParam],
                position: TestUtils.createPosition(3, 4),
                range: TestUtils.createRange(3, 4, 3, 20),
                hasAutowiredAnnotation: false
            };

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example', [], []);
            classInfo.constructors = [constructor];

            // Act
            const result = detector.detectSingleConstructorInjection(classInfo);

            // Assert
            // 빈 이름/타입이어도 처리해야 함 (실제 파싱에서 발생할 수 있음)
            assert.strictEqual(result.length, 1, 'Should handle malformed parameters gracefully');
            assert.strictEqual(result[0].targetType, '', 'Should preserve empty type');
            assert.strictEqual(result[0].targetName, '', 'Should preserve empty name');
        });
    });

    suite('Integration Tests', () => {
        test('should_processRealWorldExample_when_completeSpringServiceProvided', () => {
            // Arrange - 실제 Spring 서비스와 유사한 구조
            const userRepoParam = TestUtils.createParameterInfo('userRepository', 'UserRepository');
            const emailServiceParam = TestUtils.createParameterInfo('emailService', 'EmailService');
            const configParam = TestUtils.createParameterInfo('appConfig', 'ApplicationProperties');

            const autowiredConstructor: ConstructorInfo = {
                parameters: [userRepoParam, emailServiceParam, configParam],
                position: TestUtils.createPosition(12, 4),
                range: TestUtils.createRange(12, 4, 16, 5),
                hasAutowiredAnnotation: true
            };

            const userServiceClass = TestUtils.createClassInfo('UserService', 'com.example.service', [], []);
            userServiceClass.constructors = [autowiredConstructor];

            // Act
            const result = detector.detectAutowiredConstructorInjection(userServiceClass);

            // Assert
            assert.strictEqual(result.length, 3, 'Should detect all 3 injections');
            
            // 각 주입 정보 상세 검증
            result.forEach((injection: InjectionInfo) => {
                assert.strictEqual(injection.injectionType, InjectionType.CONSTRUCTOR, 'All should be constructor injections');
                assert.ok(injection.targetType, 'Should have valid target type');
                assert.ok(injection.targetName, 'Should have valid target name');
                assert.ok(injection.position, 'Should have valid position');
                assert.ok(injection.range, 'Should have valid range');
            });

            // 특정 타입 존재 확인
            const typeNames = result.map((i: InjectionInfo) => i.targetType);
            assert.ok(typeNames.includes('UserRepository'), 'Should include UserRepository');
            assert.ok(typeNames.includes('EmailService'), 'Should include EmailService');
            assert.ok(typeNames.includes('ApplicationProperties'), 'Should include ApplicationProperties');
        });
    });
}); 