import * as assert from 'assert';
import * as vscode from 'vscode';
import { SetterInjectionDetector } from '../../detectors/setter-injection-detector';
import { 
    MethodInfo,
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

suite('🔧 SetterInjectionDetector Test Suite', () => {
    let detector: SetterInjectionDetector;
    let mockUri: vscode.Uri;

    setup(() => {
        detector = new SetterInjectionDetector();
        mockUri = TestUtils.createMockUri('/test/TestService.java');
    });

    suite('detectSetterInjection', () => {
        test('should_detectSetterInjection_when_autowiredSetterExists', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            const emailServiceParam = TestUtils.createParameterInfo('emailService', 'EmailService');
            
            const setterMethod: MethodInfo = {
                name: 'setEmailService',
                parameters: [emailServiceParam],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true,
                visibility: 'public',
                returnType: 'void'
            };

            const classInfo = TestUtils.createClassInfo('NotificationService', 'com.example.service', [], []);
            classInfo.methods = [setterMethod];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 1, 'Should detect 1 setter injection');
            
            const injection = result[0];
            assert.strictEqual(injection.targetType, 'EmailService', 'Should have correct target type');
            assert.strictEqual(injection.targetName, 'emailService', 'Should have correct parameter name');
            assert.strictEqual(injection.injectionType, InjectionType.SETTER, 'Should be setter injection');
            assert.strictEqual(injection.position, emailServiceParam.position, 'Should have parameter position');
        });

        test('should_detectMultipleSetterInjections_when_multipleAutowiredSettersExist', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const setEmailService: MethodInfo = {
                name: 'setEmailService',
                parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const setSmsService: MethodInfo = {
                name: 'setSmsService',
                parameters: [TestUtils.createParameterInfo('smsService', 'SmsService')],
                position: TestUtils.createPosition(9, 4),
                range: TestUtils.createRange(9, 4, 11, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('NotificationService', 'com.example.service', [], []);
            classInfo.methods = [setEmailService, setSmsService];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect 2 setter injections');
            
            const emailInjection = result.find((i: InjectionInfo) => i.targetType === 'EmailService');
            assert.ok(emailInjection, 'Should find EmailService injection');
            
            const smsInjection = result.find((i: InjectionInfo) => i.targetType === 'SmsService');
            assert.ok(smsInjection, 'Should find SmsService injection');
        });

        test('should_ignoreNonAutowiredSetters_when_autowiredAnnotationMissing', () => {
            // Arrange
            const nonAutowiredSetter: MethodInfo = {
                name: 'setDataService',
                parameters: [TestUtils.createParameterInfo('dataService', 'DataService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [], // @Autowired 없음
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example.service', [], []);
            classInfo.methods = [nonAutowiredSetter];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not detect injection for non-@Autowired setter');
        });

        test('should_validateSetterNaming_when_methodFollowsSetterPattern', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const validSetter: MethodInfo = {
                name: 'setUserRepository',
                parameters: [TestUtils.createParameterInfo('userRepository', 'UserRepository')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const invalidNaming: MethodInfo = {
                name: 'configureUserService', // setXxx 패턴 아님
                parameters: [TestUtils.createParameterInfo('userService', 'UserService')],
                position: TestUtils.createPosition(9, 4),
                range: TestUtils.createRange(9, 4, 11, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: false // isSetterMethod가 false
            };

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example.service', [], []);
            classInfo.methods = [validSetter, invalidNaming];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 1, 'Should only detect valid setter methods');
            assert.strictEqual(result[0].targetType, 'UserRepository', 'Should detect the valid setter');
        });

        test('should_ignoreNonSetterMethods_when_autowiredButNotSetter', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const initMethod: MethodInfo = {
                name: 'initializeService',
                parameters: [TestUtils.createParameterInfo('userService', 'UserService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: false // @Autowired이지만 setter가 아님
            };

            const validSetter: MethodInfo = {
                name: 'setEmailService',
                parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                position: TestUtils.createPosition(9, 4),
                range: TestUtils.createRange(9, 4, 11, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example.service', [], []);
            classInfo.methods = [initMethod, validSetter];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 1, 'Should only detect actual setter methods');
            assert.strictEqual(result[0].targetType, 'EmailService', 'Should detect the valid setter only');
        });

        test('should_handleComplexSetterMethod_when_annotationsAndModifiersPresent', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            const qualifierAnnotation = TestUtils.createAnnotationInfo('Qualifier', SpringAnnotationType.AUTOWIRED); // 임시로 AUTOWIRED 사용
            
            const complexParam = TestUtils.createParameterInfo('userRepository', 'Repository<User>');
            
            const complexSetter: MethodInfo = {
                name: 'setUserRepository',
                parameters: [complexParam],
                position: TestUtils.createPosition(8, 4),
                range: TestUtils.createRange(8, 4, 12, 5),
                annotations: [autowiredAnnotation, qualifierAnnotation],
                isSetterMethod: true,
                visibility: 'public',
                returnType: 'void'
            };

            const classInfo = TestUtils.createClassInfo('ComplexService', 'com.example.service', [], []);
            classInfo.methods = [complexSetter];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 1, 'Should detect complex setter injection');
            assert.strictEqual(result[0].targetType, 'Repository<User>', 'Should preserve generic type');
            assert.strictEqual(result[0].targetName, 'userRepository', 'Should have correct parameter name');
        });

        test('should_handleSetterWithMultipleParameters_when_multipleParametersProvided', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const multiParamSetter: MethodInfo = {
                name: 'setDependencies',
                parameters: [
                    TestUtils.createParameterInfo('userService', 'UserService'),
                    TestUtils.createParameterInfo('emailService', 'EmailService')
                ],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example.service', [], []);
            classInfo.methods = [multiParamSetter];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect injections for all parameters');
            
            const userServiceInjection = result.find((i: InjectionInfo) => i.targetType === 'UserService');
            assert.ok(userServiceInjection, 'Should find UserService injection');
            
            const emailServiceInjection = result.find((i: InjectionInfo) => i.targetType === 'EmailService');
            assert.ok(emailServiceInjection, 'Should find EmailService injection');
        });
    });

    suite('detectAllSetterInjections', () => {
        test('should_detectAllSetterInjections_when_multipleClassesProvided', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            // 첫 번째 클래스
            const class1Setter: MethodInfo = {
                name: 'setUserService',
                parameters: [TestUtils.createParameterInfo('userService', 'UserService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const class1 = TestUtils.createClassInfo('NotificationService', 'com.example.service', [], []);
            class1.methods = [class1Setter];

            // 두 번째 클래스
            const class2Setter: MethodInfo = {
                name: 'setEmailService',
                parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const class2 = TestUtils.createClassInfo('UserService', 'com.example.service', [], []);
            class2.methods = [class2Setter];

            const classes = [class1, class2];

            // Act
            const result = detector.detectAllSetterInjections(classes);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect injections from all classes');
            
            const userServiceInjection = result.find((i: InjectionInfo) => i.targetType === 'UserService');
            assert.ok(userServiceInjection, 'Should find UserService injection');
            
            const emailServiceInjection = result.find((i: InjectionInfo) => i.targetType === 'EmailService');
            assert.ok(emailServiceInjection, 'Should find EmailService injection');
        });

        test('should_returnEmptyArray_when_noSetterInjectionsFound', () => {
            // Arrange
            const classWithoutSetters = TestUtils.createClassInfo('PlainService', 'com.example', [], []);
            
            const classWithNonAutowiredSetters = TestUtils.createClassInfo('ManualService', 'com.example', [], []);
            const nonAutowiredSetter: MethodInfo = {
                name: 'setUserService',
                parameters: [TestUtils.createParameterInfo('userService', 'UserService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [], // @Autowired 없음
                isSetterMethod: true
            };
            classWithNonAutowiredSetters.methods = [nonAutowiredSetter];

            const classes = [classWithoutSetters, classWithNonAutowiredSetters];

            // Act
            const result = detector.detectAllSetterInjections(classes);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array when no setter injections found');
        });

        test('should_handleEmptyClassList_when_emptyArrayProvided', () => {
            // Arrange
            const classes: ClassInfo[] = [];

            // Act
            const result = detector.detectAllSetterInjections(classes);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array for empty class list');
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullClassInfo_when_nullProvided', () => {
            // Arrange
            const nullClass = null as any;

            // Act
            const result = detector.detectSetterInjection(nullClass);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array for null class');
        });

        test('should_handleUndefinedMethods_when_methodsUndefined', () => {
            // Arrange
            const classInfo = TestUtils.createClassInfo('TestService', 'com.example', [], []);
            // methods는 undefined

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should handle undefined methods gracefully');
        });

        test('should_handleMalformedMethodInfo_when_invalidMethodProvided', () => {
            // Arrange
            const malformedMethod = {
                name: '', // 빈 이름
                parameters: [],
                position: TestUtils.createPosition(0, 0),
                range: TestUtils.createRange(0, 0, 0, 0),
                annotations: [TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED)],
                isSetterMethod: true
            } as MethodInfo;

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example', [], []);
            classInfo.methods = [malformedMethod];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            // 빈 이름이어도 처리해야 함 (실제 파싱에서 발생할 수 있음)
            assert.strictEqual(result.length, 0, 'Should handle methods without parameters gracefully');
        });

        test('should_handleSettersWithoutParameters_when_emptyParameterList', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const parameterlessSetter: MethodInfo = {
                name: 'setDefaultConfiguration',
                parameters: [], // 매개변수 없음
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('TestService', 'com.example', [], []);
            classInfo.methods = [parameterlessSetter];

            // Act
            const result = detector.detectSetterInjection(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should not detect injection for setter without parameters');
        });
    });

    suite('Integration Tests', () => {
        test('should_processRealWorldExample_when_completeSpringServiceProvided', () => {
            // Arrange - 실제 Spring 서비스와 유사한 구조
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const setUserRepository: MethodInfo = {
                name: 'setUserRepository',
                parameters: [TestUtils.createParameterInfo('userRepository', 'UserRepository')],
                position: TestUtils.createPosition(8, 4),
                range: TestUtils.createRange(8, 4, 10, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true,
                visibility: 'public',
                returnType: 'void'
            };

            const setEmailService: MethodInfo = {
                name: 'setEmailService',
                parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                position: TestUtils.createPosition(12, 4),
                range: TestUtils.createRange(12, 4, 14, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true,
                visibility: 'public',
                returnType: 'void'
            };

            const setConfigProperties: MethodInfo = {
                name: 'setConfigProperties',
                parameters: [TestUtils.createParameterInfo('configProperties', 'ApplicationProperties')],
                position: TestUtils.createPosition(16, 4),
                range: TestUtils.createRange(16, 4, 18, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true,
                visibility: 'public',
                returnType: 'void'
            };

            const userServiceClass = TestUtils.createClassInfo('UserService', 'com.example.service', [], []);
            userServiceClass.methods = [setUserRepository, setEmailService, setConfigProperties];

            // Act
            const result = detector.detectSetterInjection(userServiceClass);

            // Assert
            assert.strictEqual(result.length, 3, 'Should detect all 3 setter injections');
            
            // 각 주입 정보 상세 검증
            result.forEach((injection: InjectionInfo) => {
                assert.strictEqual(injection.injectionType, InjectionType.SETTER, 'All should be setter injections');
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