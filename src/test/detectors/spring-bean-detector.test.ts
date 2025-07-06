import * as assert from 'assert';
import * as vscode from 'vscode';
import { SpringBeanDetector } from '../../detectors/spring-bean-detector';
import { JavaFileParser } from '../../parsers/java-file-parser';
import { 
    BeanDefinition, 
    SpringAnnotationType, 
    InjectionInfo, 
    InjectionType,
    ClassInfo,
} from '../../models/spring-types';
import { TestUtils } from '../helpers/core-test-utils';
import { JavaSampleGenerator } from '../helpers/java-sample-generator';

suite('SpringBeanDetector', () => {
    let detector: SpringBeanDetector;
    let javaParser: JavaFileParser;
    
    setup(() => {
        detector = new SpringBeanDetector();
        javaParser = new JavaFileParser();
    });

    /**
     * Helper function to parse Java content and detect beans
     */
    async function detectBeansFromContent(content: string, fileUri: vscode.Uri): Promise<BeanDefinition[]> {
        const parseResult = await javaParser.parseJavaFile(fileUri, content);
        return detector.detectBeansInParseResult(parseResult, fileUri);
    }

    suite('detectBeansInWorkspace', () => {
        test('should_detectServiceBean_when_serviceClassProvided', async () => {
            // Arrange
            const serviceContent = JavaSampleGenerator.serviceClass();
            const mockUri = vscode.Uri.parse('file:///src/UserService.java');
            
            // Act
            const beans = await detectBeansFromContent(serviceContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'UserService');
            assert.strictEqual(beans[0].beanName, 'userService');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.SERVICE);
            assert.strictEqual(beans[0].fullyQualifiedName, 'com.example.service.UserService');
        });

        test('should_detectComponentBean_when_componentClassProvided', async () => {
            // Arrange
            const componentContent = JavaSampleGenerator.componentClass();
            const mockUri = vscode.Uri.parse('file:///src/EmailValidator.java');
            
            // Act
            const beans = await detectBeansFromContent(componentContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'DataProcessor');
            assert.strictEqual(beans[0].beanName, 'dataProcessor');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.COMPONENT);
        });

        test('should_detectRepositoryBean_when_repositoryClassProvided', async () => {
            // Arrange
            const repositoryContent = JavaSampleGenerator.repositoryClass();
            const mockUri = vscode.Uri.parse('file:///src/UserRepository.java');
            
            // Act
            const beans = await detectBeansFromContent(repositoryContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'UserRepository');
            assert.strictEqual(beans[0].beanName, 'userRepository');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.REPOSITORY);
        });

        test('should_detectControllerBean_when_controllerClassProvided', async () => {
            // Arrange
            const controllerContent = JavaSampleGenerator.controllerClass();
            const mockUri = vscode.Uri.parse('file:///src/UserController.java');
            
            // Act
            const beans = await detectBeansFromContent(controllerContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'UserController');
            assert.strictEqual(beans[0].beanName, 'userController');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.CONTROLLER);
        });

        test('should_detectRestControllerBean_when_restControllerClassProvided', async () => {
            // Arrange
            const restControllerContent = JavaSampleGenerator.restControllerClass();
            const mockUri = vscode.Uri.parse('file:///src/ApiController.java');
            
            // Act
            const beans = await detectBeansFromContent(restControllerContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'ApiController');
            assert.strictEqual(beans[0].beanName, 'apiController');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.REST_CONTROLLER);
        });

        test('should_detectConfigurationBean_when_configurationClassProvided', async () => {
            // Arrange
            const configContent = JavaSampleGenerator.configurationOnlyClass();
            const mockUri = vscode.Uri.parse('file:///src/AppConfig.java');
            
            // Act
            const beans = await detectBeansFromContent(configContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'AppConfig');
            assert.strictEqual(beans[0].beanName, 'appConfig');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.CONFIGURATION);
        });

        test('should_detectBeanMethods_when_configurationWithBeanMethodsProvided', async () => {
            // Arrange
            const configWithBeansContent = JavaSampleGenerator.configurationWithBeanMethods();
            const mockUri = vscode.Uri.parse('file:///src/DatabaseConfig.java');
            
            // Act
            const beans = await detectBeansFromContent(configWithBeansContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 3); // Configuration class + 2 Bean methods
            
            // Verify Configuration class
            const configBean = beans.find((b: BeanDefinition) => b.className === 'DatabaseConfig');
            assert.ok(configBean);
            assert.strictEqual(configBean.annotationType, SpringAnnotationType.CONFIGURATION);
            
            // Verify Bean methods
            const dataSourceBean = beans.find((b: BeanDefinition) => b.beanName === 'dataSource');
            assert.ok(dataSourceBean);
            assert.strictEqual(dataSourceBean.className, 'DataSource');
            assert.strictEqual(dataSourceBean.annotationType, SpringAnnotationType.BEAN);
            
            const emfBean = beans.find((b: BeanDefinition) => b.beanName === 'entityManagerFactory');
            assert.ok(emfBean);
            assert.strictEqual(emfBean.className, 'EntityManagerFactory');
            assert.strictEqual(emfBean.annotationType, SpringAnnotationType.BEAN);
        });

        test('should_detectMultipleBeans_when_multipleAnnotatedClassesProvided', async () => {
            // Arrange
            const multipleBeansContent = JavaSampleGenerator.multipleBeansClass();
            const mockUri = vscode.Uri.parse('file:///src/Mixed.java');
            
            // Act
            const beans = await detectBeansFromContent(multipleBeansContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 2);
            
            const serviceBean = beans.find((b: BeanDefinition) => b.className === 'UserService');
            assert.ok(serviceBean);
            assert.strictEqual(serviceBean.annotationType, SpringAnnotationType.SERVICE);
            
            const repoBean = beans.find((b: BeanDefinition) => b.className === 'UserRepository');
            assert.ok(repoBean);
            assert.strictEqual(repoBean.annotationType, SpringAnnotationType.REPOSITORY);
        });

        test('should_returnEmptyArray_when_noSpringAnnotationsProvided', async () => {
            // Arrange
            const plainJavaContent = JavaSampleGenerator.plainJavaClass();
            const mockUri = vscode.Uri.parse('file:///src/PlainJavaClass.java');
            
            // Act
            const beans = await detectBeansFromContent(plainJavaContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 0);
        });

        test('should_handleParsingError_when_invalidJavaFileProvided', async () => {
            // Arrange
            const invalidContent = JavaSampleGenerator.invalidJavaFile();
            const mockUri = vscode.Uri.parse('file:///src/Invalid.java');
            
            // Act & Assert - should not throw
            const beans = await detectBeansFromContent(invalidContent, mockUri);
            assert.strictEqual(beans.length, 0);
        });

        test('should_detectCustomBeanName_when_annotationHasValueAttribute', async () => {
            // Arrange
            const customBeanNameContent = JavaSampleGenerator.customBeanNameService();
            const mockUri = vscode.Uri.parse('file:///src/UserService.java');
            
            // Act
            const beans = await detectBeansFromContent(customBeanNameContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].beanName, 'customUserService');
            assert.strictEqual(beans[0].className, 'UserService');
        });
    });

    suite('generateBeanName', () => {
        test('should_generateCamelCaseBeanName_when_classNameProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.generateBeanName('UserService'), 'userService');
            assert.strictEqual(detector.generateBeanName('EmailValidator'), 'emailValidator');
            assert.strictEqual(detector.generateBeanName('XMLParser'), 'xMLParser');
            assert.strictEqual(detector.generateBeanName('SimpleClass'), 'simpleClass');
        });

        test('should_handleSingleLetter_when_singleCharacterClassProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.generateBeanName('A'), 'a');
            assert.strictEqual(detector.generateBeanName('X'), 'x');
        });
    });

    suite('isSpringBeanAnnotation', () => {
        test('should_returnTrue_when_springBeanAnnotationProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.SERVICE), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.COMPONENT), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.REPOSITORY), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.CONTROLLER), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.REST_CONTROLLER), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.CONFIGURATION), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.BEAN), true);
        });

        test('should_returnFalse_when_nonBeanAnnotationProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.AUTOWIRED), false);
        });
    });

    suite('Interface Implementation Integration', () => {
        test('should_includeInterfaceInfo_when_detectingBeansFromImplementationClass', async () => {
            // Arrange
            const content = `
                package com.example.service;
                import org.springframework.stereotype.Service;
                
                @Service
                public class MessageServiceImpl implements MessageService {
                    public void sendMessage(String message) {
                        // implementation
                    }
                }
            `.trim();
            const mockUri = vscode.Uri.parse('file:///src/MessageServiceImpl.java');

            // Act
            const beans = await detectBeansFromContent(content, mockUri);

            // Assert
            assert.strictEqual(beans.length, 1, 'Should detect one bean');
            
            const bean = beans[0];
            assert.strictEqual(bean.name, 'messageServiceImpl', 'Should generate correct bean name');
            assert.strictEqual(bean.type, 'MessageServiceImpl', 'Should have correct type');
            
            // Key: Check if interface information is included
            const interfaces = (bean as any).interfaces as string[] | undefined;
            assert.ok(interfaces, 'Bean should include interface information');
            assert.ok(interfaces.includes('MessageService'), 'Should include MessageService interface');
        });

        test('should_includeMultipleInterfaces_when_implementingMultipleInterfaces', async () => {
            // Arrange
            const content = `
                package com.example.service;
                import org.springframework.stereotype.Service;
                
                @Service
                public class MultiServiceImpl implements MessageService, NotificationService {
                    public void sendMessage(String message) { }
                    public void sendNotification(String notification) { }
                }
            `.trim();
            const mockUri = vscode.Uri.parse('file:///src/MultiServiceImpl.java');

            // Act
            const beans = await detectBeansFromContent(content, mockUri);

            // Assert
            assert.strictEqual(beans.length, 1, 'Should detect one bean');
            
            const bean = beans[0];
            const interfaces = (bean as any).interfaces as string[] | undefined;
            assert.ok(interfaces, 'Bean should include interface information');
            assert.strictEqual(interfaces.length, 2, 'Should include two interfaces');
            assert.ok(interfaces.includes('MessageService'), 'Should include MessageService');
            assert.ok(interfaces.includes('NotificationService'), 'Should include NotificationService');
        });

        test('should_notIncludeInterfaces_when_classDoesNotImplementInterfaces', async () => {
            // Arrange
            const content = `
                package com.example.service;
                import org.springframework.stereotype.Service;
                
                @Service
                public class StandaloneService {
                    public void doSomething() { }   
                }
            `.trim();
            const mockUri = vscode.Uri.parse('file:///src/StandaloneService.java');

            // Act
            const beans = await detectBeansFromContent(content, mockUri);

            // Assert
            assert.strictEqual(beans.length, 1, 'Should detect one bean');
            
            const bean = beans[0];
            const interfaces = (bean as any).interfaces as string[] | undefined;
            assert.ok(!interfaces || interfaces.length === 0, 'Should not have interfaces');
        });
    });

    // Constructor and Setter Injection Detection

    suite('detectAllInjectionTypes', () => {
        test('should_detectMixedInjections_when_fieldConstructorSetterCombined', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            // Field injection
            const autowiredField = TestUtils.createFieldInfo('userRepository', 'UserRepository', [autowiredAnnotation]);
            
            // Constructor injection
            const constructorParam = TestUtils.createParameterInfo('emailService', 'EmailService');
            const constructor = {
                parameters: [constructorParam],
                position: TestUtils.createPosition(8, 4),
                range: TestUtils.createRange(8, 4, 10, 5),
                hasAutowiredAnnotation: false // Single constructor omits @Autowired
            };

            // Setter injection
            const setterParam = TestUtils.createParameterInfo('smsService', 'SmsService');
            const setterMethod = {
                name: 'setSmsService',
                parameters: [setterParam],
                position: TestUtils.createPosition(12, 4),
                range: TestUtils.createRange(12, 4, 14, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('UserService', 'com.example.service', [autowiredField], []);
            classInfo.constructors = [constructor];
            classInfo.methods = [setterMethod];

            // Act
            const result = detector.detectAllInjectionTypes(classInfo);

            // Assert
            assert.strictEqual(result.length, 3, 'Should detect all 3 injection types');
            
            // Verify field injection
            const fieldInjection = result.find((i: InjectionInfo) => i.injectionType === InjectionType.FIELD);
            assert.ok(fieldInjection, 'Should find field injection');
            assert.strictEqual(fieldInjection.targetType, 'UserRepository', 'Should detect UserRepository field injection');
            
            // Verify constructor injection
            const constructorInjection = result.find((i: InjectionInfo) => i.injectionType === InjectionType.CONSTRUCTOR);
            assert.ok(constructorInjection, 'Should find constructor injection');
            assert.strictEqual(constructorInjection.targetType, 'EmailService', 'Should detect EmailService constructor injection');
            
            // Verify setter injection
            const setterInjection = result.find((i: InjectionInfo) => i.injectionType === InjectionType.SETTER);
            assert.ok(setterInjection, 'Should find setter injection');
            assert.strictEqual(setterInjection.targetType, 'SmsService', 'Should detect SmsService setter injection');
        });

        test('should_detectConstructorInjectionsOnly_when_onlyConstructorInjectionsExist', () => {
            // Arrange
            const param1 = TestUtils.createParameterInfo('userRepository', 'UserRepository');
            const param2 = TestUtils.createParameterInfo('emailService', 'EmailService');
            
            const constructor = {
                parameters: [param1, param2],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                hasAutowiredAnnotation: false // Single constructor
            };

            const classInfo = TestUtils.createClassInfo('OrderService', 'com.example.service', [], []);
            classInfo.constructors = [constructor];

            // Act
            const result = detector.detectAllInjectionTypes(classInfo);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect 2 constructor injections');
            result.forEach((injection: InjectionInfo) => {
                assert.strictEqual(injection.injectionType, InjectionType.CONSTRUCTOR, 'All should be constructor injections');
            });
        });

        test('should_detectSetterInjectionsOnly_when_onlySetterInjectionsExist', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            const setter1 = {
                name: 'setUserRepository',
                parameters: [TestUtils.createParameterInfo('userRepository', 'UserRepository')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const setter2 = {
                name: 'setEmailService',
                parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                position: TestUtils.createPosition(9, 4),
                range: TestUtils.createRange(9, 4, 11, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const classInfo = TestUtils.createClassInfo('NotificationService', 'com.example.service', [], []);
            classInfo.methods = [setter1, setter2];

            // Act
            const result = detector.detectAllInjectionTypes(classInfo);

            // Assert
            assert.strictEqual(result.length, 2, 'Should detect 2 setter injections');
            result.forEach((injection: InjectionInfo) => {
                assert.strictEqual(injection.injectionType, InjectionType.SETTER, 'All should be setter injections');
            });
        });

        test('should_returnEmptyArray_when_noInjectionsExist', () => {
            // Arrange
            const regularField = TestUtils.createFieldInfo('regularField', 'String', []); // No @Autowired
            const classInfo = TestUtils.createClassInfo('PlainService', 'com.example.service', [regularField], []);

            // Act
            const result = detector.detectAllInjectionTypes(classInfo);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array when no injections exist');
        });

        test('should_handleNullClassInfo_when_nullProvided', () => {
            // Arrange
            const nullClass = null as any;

            // Act
            const result = detector.detectAllInjectionTypes(nullClass);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array for null class');
        });
    });

    suite('detectAllInjectionsInClasses', () => {
        test('should_detectInjectionsFromMultipleClasses_when_multipleClassesProvided', () => {
            // Arrange
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            // First class: field injection
            const class1Field = TestUtils.createFieldInfo('userRepository', 'UserRepository', [autowiredAnnotation]);
            const class1 = TestUtils.createClassInfo('UserService', 'com.example.service', [class1Field], []);
            
            // Second class: constructor injection
            const class2Constructor = {
                parameters: [TestUtils.createParameterInfo('emailService', 'EmailService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                hasAutowiredAnnotation: false
            };
            const class2 = TestUtils.createClassInfo('NotificationService', 'com.example.service', [], []);
            class2.constructors = [class2Constructor];

            // Third class: setter injection
            const class3Setter = {
                name: 'setSmsService',
                parameters: [TestUtils.createParameterInfo('smsService', 'SmsService')],
                position: TestUtils.createPosition(5, 4),
                range: TestUtils.createRange(5, 4, 7, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };
            const class3 = TestUtils.createClassInfo('SmsService', 'com.example.service', [], []);
            class3.methods = [class3Setter];

            const classes = [class1, class2, class3];

            // Act
            const result = detector.detectAllInjectionsInClasses(classes);

            // Assert
            assert.strictEqual(result.length, 3, 'Should detect injections from all classes');
            
            const fieldInjection = result.find((i: InjectionInfo) => i.injectionType === InjectionType.FIELD);
            assert.ok(fieldInjection, 'Should find field injection');
            
            const constructorInjection = result.find((i: InjectionInfo) => i.injectionType === InjectionType.CONSTRUCTOR);
            assert.ok(constructorInjection, 'Should find constructor injection');
            
            const setterInjection = result.find((i: InjectionInfo) => i.injectionType === InjectionType.SETTER);
            assert.ok(setterInjection, 'Should find setter injection');
        });

        test('should_returnEmptyArray_when_emptyClassListProvided', () => {
            // Arrange
            const classes: ClassInfo[] = [];

            // Act
            const result = detector.detectAllInjectionsInClasses(classes);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array for empty class list');
        });

        test('should_handleClassesWithoutInjections_when_noInjectionsExist', () => {
            // Arrange
            const class1 = TestUtils.createClassInfo('PlainService1', 'com.example', [], []);
            const class2 = TestUtils.createClassInfo('PlainService2', 'com.example', [], []);
            const classes = [class1, class2];

            // Act
            const result = detector.detectAllInjectionsInClasses(classes);

            // Assert
            assert.strictEqual(result.length, 0, 'Should return empty array when no injections exist');
        });
    });

    suite('Integration Tests', () => {
        test('should_processRealWorldMixedInjectionScenario_when_completeSpringServiceProvided', () => {
            // Arrange - Complex structure similar to real Spring service
            const autowiredAnnotation = TestUtils.createAnnotationInfo('Autowired', SpringAnnotationType.AUTOWIRED);
            
            // Field injection: Repository
            const repositoryField = TestUtils.createFieldInfo('userRepository', 'UserRepository', [autowiredAnnotation]);
            
            // Constructor injection: required dependencies
            const emailServiceParam = TestUtils.createParameterInfo('emailService', 'EmailService');
            const configParam = TestUtils.createParameterInfo('appConfig', 'ApplicationProperties');
            const constructor = {
                parameters: [emailServiceParam, configParam],
                position: TestUtils.createPosition(12, 4),
                range: TestUtils.createRange(12, 4, 15, 5),
                hasAutowiredAnnotation: false // Single constructor
            };

            // Setter injection: optional dependencies
            const smsServiceSetter = {
                name: 'setSmsService',
                parameters: [TestUtils.createParameterInfo('smsService', 'SmsService')],
                position: TestUtils.createPosition(17, 4),
                range: TestUtils.createRange(17, 4, 19, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const auditServiceSetter = {
                name: 'setAuditService',
                parameters: [TestUtils.createParameterInfo('auditService', 'AuditService')],
                position: TestUtils.createPosition(21, 4),
                range: TestUtils.createRange(21, 4, 23, 5),
                annotations: [autowiredAnnotation],
                isSetterMethod: true
            };

            const userServiceClass = TestUtils.createClassInfo('UserService', 'com.example.service', [repositoryField], []);
            userServiceClass.constructors = [constructor];
            userServiceClass.methods = [smsServiceSetter, auditServiceSetter];

            // Act
            const result = detector.detectAllInjectionTypes(userServiceClass);

            // Assert
            assert.strictEqual(result.length, 5, 'Should detect all 5 injections');
            
            // Verify by injection type
            const fieldInjections = result.filter((i: InjectionInfo) => i.injectionType === InjectionType.FIELD);
            assert.strictEqual(fieldInjections.length, 1, 'Should have 1 field injection');
            
            const constructorInjections = result.filter((i: InjectionInfo) => i.injectionType === InjectionType.CONSTRUCTOR);
            assert.strictEqual(constructorInjections.length, 2, 'Should have 2 constructor injections');
            
            const setterInjections = result.filter((i: InjectionInfo) => i.injectionType === InjectionType.SETTER);
            assert.strictEqual(setterInjections.length, 2, 'Should have 2 setter injections');

            // Verify specific types exist
            const typeNames = result.map((i: InjectionInfo) => i.targetType);
            assert.ok(typeNames.includes('UserRepository'), 'Should include UserRepository');
            assert.ok(typeNames.includes('EmailService'), 'Should include EmailService');
            assert.ok(typeNames.includes('ApplicationProperties'), 'Should include ApplicationProperties');
            assert.ok(typeNames.includes('SmsService'), 'Should include SmsService');
            assert.ok(typeNames.includes('AuditService'), 'Should include AuditService');
        });
    });
}); 