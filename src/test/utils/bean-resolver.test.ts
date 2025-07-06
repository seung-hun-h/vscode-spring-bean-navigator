import * as assert from 'assert';
import * as vscode from 'vscode';
import { BeanResolver } from '../../utils/bean-resolver';
import { BeanDefinition, ParameterInfo, MethodInfo, ConstructorInfo } from '../../models/spring-types';
import { TestUtils } from '../helpers/core-test-utils';

suite('BeanResolver', () => {
    let resolver: BeanResolver;
    let sampleBeans: BeanDefinition[];
    
    setup(() => {
        resolver = new BeanResolver();
        sampleBeans = createSampleBeans();
    });

    suite('addBeanDefinition', () => {
        test('should_storeBeanDefinition_when_validBeanProvided', () => {
            // Arrange
            const bean = TestUtils.createBeanDefinition('userService', 'UserService', 'com.example.service.UserService');
            
            // Act
            resolver.addBeanDefinition(bean);
            
            // Assert
            const found = resolver.findBeanByName('userService');
            assert.ok(found);
            assert.strictEqual(found.name, 'userService');
            assert.strictEqual(found.type, 'UserService');
        });

        test('should_overwriteExistingBean_when_duplicateBeanNameProvided', () => {
            // Arrange
            const bean1 = TestUtils.createBeanDefinition('service', 'Service1', 'com.example.Service1');
            const bean2 = TestUtils.createBeanDefinition('service', 'Service2', 'com.example.Service2');
            
            // Act
            resolver.addBeanDefinition(bean1);
            resolver.addBeanDefinition(bean2);
            
            // Assert
            const found = resolver.findBeanByName('service');
            assert.ok(found);
            assert.strictEqual(found.type, 'Service2');
        });
    });

    suite('findBeanByName', () => {
        test('should_returnBean_when_exactNameMatches', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const result = resolver.findBeanByName('userService');
            
            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'userService');
            assert.strictEqual(result.type, 'UserService');
        });

        test('should_returnUndefined_when_beanNotFound', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const result = resolver.findBeanByName('nonExistentBean');
            
            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleEmptyBeanName_when_emptyStringProvided', () => {
            // Act
            const result = resolver.findBeanByName('');
            
            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('findBeansByType', () => {
        test('should_returnMatchingBeans_when_exactTypeMatches', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const results = resolver.findBeansByType('UserService');
            
            // Assert
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].type, 'UserService');
        });

        test('should_returnMultipleBeans_when_multipleImplementationsExist', () => {
            // Arrange
            const notification1 = createNotificationBean('emailNotification', 'EmailNotificationService');
            const notification2 = createNotificationBean('smsNotification', 'SmsNotificationService');
            
            resolver.addBeanDefinition(notification1);
            resolver.addBeanDefinition(notification2);
            
            // Act
            const results = resolver.findBeansByType('NotificationService');
            
            // Assert
            assert.strictEqual(results.length, 2);
            const tipos = results.map(r => r.type);
            assert.ok(tipos.includes('EmailNotificationService'));
            assert.ok(tipos.includes('SmsNotificationService'));
        });

        test('should_returnEmptyArray_when_typeNotFound', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const results = resolver.findBeansByType('NonExistentType');
            
            // Assert
            assert.strictEqual(results.length, 0);
        });
    });

    suite('findBeansByInterface', () => {
        test('should_findImplementations_when_interfaceProvided', () => {
            // Arrange
            const serviceImpl1 = createServiceBean('service1', 'Service1Impl', 'PaymentService');
            const serviceImpl2 = createServiceBean('service2', 'Service2Impl', 'PaymentService');
            
            resolver.addBeanDefinition(serviceImpl1);
            resolver.addBeanDefinition(serviceImpl2);
            
            // Act
            const results = resolver.findBeansByInterface('PaymentService');
            
            // Assert
            assert.strictEqual(results.length, 2);
            const names = results.map(r => r.name);
            assert.ok(names.includes('service1'));
            assert.ok(names.includes('service2'));
        });

        test('should_returnEmptyArray_when_noImplementationsFound', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const results = resolver.findBeansByInterface('UnknownInterface');
            
            // Assert
            assert.strictEqual(results.length, 0);
        });
    });

    suite('resolveBeanForInjection', () => {
        test('should_returnExactMatch_when_singleBeanFound', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const result = resolver.resolveBeanForInjection('UserService');
            
            // Assert
            assert.ok(result.resolved);
            assert.strictEqual(result.resolved.type, 'UserService');
            assert.strictEqual(result.candidates.length, 1);
        });

        test('should_returnCandidates_when_multipleBeansFound', () => {
            // Arrange
            const repo1 = createRepositoryBean('repo1', 'UserRepositoryImpl');
            const repo2 = createRepositoryBean('repo2', 'UserRepositoryJpa');
            
            resolver.addBeanDefinition(repo1);
            resolver.addBeanDefinition(repo2);
            
            // Act
            const result = resolver.resolveBeanForInjection('UserRepository');
            
            // Assert
            assert.strictEqual(result.resolved, undefined, 'Should not auto-resolve when multiple candidates');
            assert.strictEqual(result.candidates.length, 2);
            assert.ok(result.candidates.some(c => c.name === 'repo1'));
            assert.ok(result.candidates.some(c => c.name === 'repo2'));
        });

        test('should_returnEmpty_when_noBeanFound', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const result = resolver.resolveBeanForInjection('UnknownService');
            
            // Assert
            assert.strictEqual(result.resolved, undefined);
            assert.strictEqual(result.candidates.length, 0);
        });
    });

    suite('clearCache', () => {
        test('should_removeAllBeans_when_cacheCleared', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            resolver.clearCache();
            
            // Assert
            const result = resolver.findBeanByName('userService');
            assert.strictEqual(result, undefined);
        });
    });

    suite('getAllBeans', () => {
        test('should_returnAllStoredBeans_when_called', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const results = resolver.getAllBeans();
            
            // Assert
            assert.strictEqual(results.length, sampleBeans.length);
            const names = results.map(r => r.name);
            assert.ok(names.includes('userService'));
            assert.ok(names.includes('userRepository'));
        });

        test('should_returnEmptyArray_when_noBeansStored', () => {
            // Act
            const results = resolver.getAllBeans();
            
            // Assert
            assert.strictEqual(results.length, 0);
        });
    });

    suite('getBeanCount', () => {
        test('should_returnCorrectCount_when_beansAdded', () => {
            // Arrange
            sampleBeans.forEach(bean => resolver.addBeanDefinition(bean));
            
            // Act
            const count = resolver.getBeanCount();
            
            // Assert
            assert.strictEqual(count, sampleBeans.length);
        });

        test('should_returnZero_when_noBeansAdded', () => {
            // Act
            const count = resolver.getBeanCount();
            
            // Assert
            assert.strictEqual(count, 0);
        });
    });

    suite('Interface Implementation Mapping Issues', () => {
        test('should_findImplementationByInterfaceType_when_serviceImplementsInterface', () => {
            // Arrange: MessageServiceImpl implements MessageService
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            
            resolver.addBeanDefinition(messageServiceImpl);
            
            // Act: Search bean by interface type
            const result = resolver.resolveBeanForInjection('MessageService');
            
            // Assert: Should find implementation
            assert.ok(result.resolved, 'Should find implementation when searching by interface type');
            assert.strictEqual(result.resolved.type, 'MessageServiceImpl');
            assert.strictEqual(result.resolved.name, 'messageService');
            assert.strictEqual(result.candidates.length, 1);
        });

        test('should_findImplementationByInterfaceType_when_multipleImplementationsExist', () => {
            // Arrange: Two different interface implementations
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            
            const notificationServiceImpl = createImplementationBean(
                'notificationService', 
                'NotificationServiceImpl', 
                'com.example.service.NotificationServiceImpl',
                ['NotificationService']
            );
            
            resolver.addBeanDefinition(messageServiceImpl);
            resolver.addBeanDefinition(notificationServiceImpl);
            
            // Act: Search by each interface type
            const messageResult = resolver.resolveBeanForInjection('MessageService');
            const notificationResult = resolver.resolveBeanForInjection('NotificationService');
            
            // Assert: Should find correct implementation for each
            assert.ok(messageResult.resolved, 'Should find MessageService implementation');
            assert.strictEqual(messageResult.resolved.type, 'MessageServiceImpl');
            
            assert.ok(notificationResult.resolved, 'Should find NotificationService implementation');
            assert.strictEqual(notificationResult.resolved.type, 'NotificationServiceImpl');
        });

        test('should_handleMultipleImplementationsOfSameInterface_when_ambiguousInjection', () => {
            // Arrange: Multiple implementations of same interface
            const impl1 = createImplementationBean(
                'messageServiceImpl1', 
                'MessageServiceImpl1', 
                'com.example.service.MessageServiceImpl1',
                ['MessageService']
            );
            
            const impl2 = createImplementationBean(
                'messageServiceImpl2', 
                'MessageServiceImpl2', 
                'com.example.service.MessageServiceImpl2',
                ['MessageService']
            );
            
            resolver.addBeanDefinition(impl1);
            resolver.addBeanDefinition(impl2);
            
            // Act: Search by interface type
            const result = resolver.resolveBeanForInjection('MessageService');
            
            // Assert: Should have multiple candidates and not auto-resolve
            assert.strictEqual(result.resolved, undefined, 'Should not auto-resolve when multiple implementations exist');
            assert.strictEqual(result.candidates.length, 2, 'Should return both candidates');
            
            const candidateTypes = result.candidates.map((c: BeanDefinition) => c.type);
            assert.ok(candidateTypes.includes('MessageServiceImpl1'));
            assert.ok(candidateTypes.includes('MessageServiceImpl2'));
        });

        test('should_findImplementationByDirectType_when_usingImplementationClassName', () => {
            // Arrange: Register implementation bean
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            
            resolver.addBeanDefinition(messageServiceImpl);
            
            // Act: Search directly by implementation class name
            const result = resolver.resolveBeanForInjection('MessageServiceImpl');
            
            // Assert: Should find implementation directly
            assert.ok(result.resolved, 'Should find implementation by direct class name');
            assert.strictEqual(result.resolved.type, 'MessageServiceImpl');
        });

        test('should_notFindBean_when_interfaceHasNoImplementation', () => {
            // Arrange: Interface with no implementation
            resolver.addBeanDefinition(createSampleBeans()[0]); // UserService (not an interface)
            
            // Act: Search by non-existent interface
            const result = resolver.resolveBeanForInjection('NonExistentInterface');
            
            // Assert: Should not find any bean
            assert.strictEqual(result.resolved, undefined);
            assert.strictEqual(result.candidates.length, 0);
        });

        test('should_findByTypeAndInterface_when_typeMatchingEnabled', () => {
            // Arrange: Interface and implementation
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            
            resolver.addBeanDefinition(messageServiceImpl);
            
            // Act: Search interface type using findBeansByType method
            const results = resolver.findBeansByType('MessageService');
            
            // Assert: Should find implementation by interface type
            assert.strictEqual(results.length, 1, 'Should find implementation by interface type');
            assert.strictEqual(results[0].type, 'MessageServiceImpl');
        });
    });
});

// Parameter type based Bean search tests
suite('Parameter-based Bean Resolution', () => {
    let resolver: BeanResolver;
    
    setup(() => {
        resolver = new BeanResolver();
                    // Add test Beans
        const userRepository = TestUtils.createBeanDefinition('userRepository', 'UserRepository', 'com.example.repository.UserRepository');
        const emailService = TestUtils.createBeanDefinition('emailService', 'EmailService', 'com.example.service.EmailService');
        const paymentGateway = TestUtils.createBeanDefinition('paymentGateway', 'PaymentGateway', 'com.example.gateway.PaymentGateway');
        
        resolver.addBeanDefinition(userRepository);
        resolver.addBeanDefinition(emailService);
        resolver.addBeanDefinition(paymentGateway);
    });

    suite('resolveBeanForParameter', () => {
        test('should_resolveBean_when_parameterTypeMatchesBeanType', () => {
            // Arrange
            const parameter = createParameterInfo('userRepository', 'UserRepository', 0);
            
            // Act
            const result = resolver.resolveBeanForParameter(parameter);
            
            // Assert
            assert.ok(result.resolved, 'Should resolve bean for matching parameter type');
            assert.strictEqual(result.resolved.type, 'UserRepository');
            assert.strictEqual(result.resolved.name, 'userRepository');
            assert.strictEqual(result.candidates.length, 1);
        });

        test('should_resolveInterfaceImplementation_when_parameterIsInterface', () => {
            // Arrange: Register bean implementing interface
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            resolver.addBeanDefinition(messageServiceImpl);
            
            const parameter = createParameterInfo('messageService', 'MessageService', 0);
            
            // Act
            const result = resolver.resolveBeanForParameter(parameter);
            
            // Assert
            assert.ok(result.resolved, 'Should resolve implementation for interface parameter');
            assert.strictEqual(result.resolved.type, 'MessageServiceImpl');
            assert.strictEqual(result.candidates.length, 1);
        });

        test('should_returnCandidates_when_multipleImplementationsExist', () => {
            // Arrange: Multiple implementations of same interface
            const impl1 = createImplementationBean(
                'notificationService1', 
                'EmailNotificationService', 
                'com.example.service.EmailNotificationService',
                ['NotificationService']
            );
            const impl2 = createImplementationBean(
                'notificationService2', 
                'SmsNotificationService', 
                'com.example.service.SmsNotificationService',
                ['NotificationService']
            );
            
            resolver.addBeanDefinition(impl1);
            resolver.addBeanDefinition(impl2);
            
            const parameter = createParameterInfo('notificationService', 'NotificationService', 0);
            
            // Act
            const result = resolver.resolveBeanForParameter(parameter);
            
            // Assert
            assert.strictEqual(result.resolved, undefined, 'Should not auto-resolve when multiple candidates');
            assert.strictEqual(result.candidates.length, 2, 'Should return both candidates');
            const candidateTypes = result.candidates.map(c => c.type);
            assert.ok(candidateTypes.includes('EmailNotificationService'));
            assert.ok(candidateTypes.includes('SmsNotificationService'));
        });

        test('should_returnEmpty_when_noBeanFoundForParameter', () => {
            // Arrange
            const parameter = createParameterInfo('unknownService', 'UnknownService', 0);
            
            // Act
            const result = resolver.resolveBeanForParameter(parameter);
            
            // Assert
            assert.strictEqual(result.resolved, undefined);
            assert.strictEqual(result.candidates.length, 0);
        });

        test('should_handleGenericTypes_when_parameterHasGenericType', () => {
            // Arrange: Bean with generic type
            const listService = TestUtils.createBeanDefinition('listService', 'List<String>', 'java.util.List');
            resolver.addBeanDefinition(listService);
            
            const parameter = createParameterInfo('items', 'List<String>', 0);
            
            // Act
            const result = resolver.resolveBeanForParameter(parameter);
            
            // Assert
            assert.ok(result.resolved, 'Should handle generic types');
            assert.strictEqual(result.resolved.type, 'List<String>');
        });
    });

    suite('resolveBeanForConstructor', () => {
        test('should_resolveAllParameters_when_constructorHasMultipleParameters', () => {
            // Arrange
            const constructor = createConstructorInfo([
                createParameterInfo('userRepository', 'UserRepository', 0),
                createParameterInfo('emailService', 'EmailService', 1)
            ]);
            
            // Act
            const results = resolver.resolveBeanForConstructor(constructor);
            
            // Assert
            assert.strictEqual(results.length, 2, 'Should resolve all parameters');
            
            assert.ok(results[0].resolved, 'First parameter should be resolved');
            assert.strictEqual(results[0].resolved.type, 'UserRepository');
            
            assert.ok(results[1].resolved, 'Second parameter should be resolved');
            assert.strictEqual(results[1].resolved.type, 'EmailService');
        });

        test('should_handleMixedResolution_when_someParametersCannotBeResolved', () => {
            // Arrange: Only some parameters can be resolved
            const constructor = createConstructorInfo([
                createParameterInfo('userRepository', 'UserRepository', 0),
                createParameterInfo('unknownService', 'UnknownService', 1)
            ]);
            
            // Act
            const results = resolver.resolveBeanForConstructor(constructor);
            
            // Assert
            assert.strictEqual(results.length, 2, 'Should return results for all parameters');
            
            assert.ok(results[0].resolved, 'First parameter should be resolved');
            assert.strictEqual(results[0].resolved.type, 'UserRepository');
            
            assert.strictEqual(results[1].resolved, undefined, 'Second parameter should not be resolved');
            assert.strictEqual(results[1].candidates.length, 0);
        });

        test('should_returnEmpty_when_constructorHasNoParameters', () => {
            // Arrange
            const constructor = createConstructorInfo([]);
            
            // Act
            const results = resolver.resolveBeanForConstructor(constructor);
            
            // Assert
            assert.strictEqual(results.length, 0, 'Should return empty array for no parameters');
        });

        test('should_maintainParameterOrder_when_resolvingConstructorParameters', () => {
            // Arrange: Constructor where parameter order is important
            const constructor = createConstructorInfo([
                createParameterInfo('emailService', 'EmailService', 0),
                createParameterInfo('userRepository', 'UserRepository', 1),
                createParameterInfo('paymentGateway', 'PaymentGateway', 2)
            ]);
            
            // Act
            const results = resolver.resolveBeanForConstructor(constructor);
            
            // Assert
            assert.strictEqual(results.length, 3, 'Should maintain parameter count');
            assert.strictEqual(results[0].resolved?.type, 'EmailService', 'First result should match first parameter');
            assert.strictEqual(results[1].resolved?.type, 'UserRepository', 'Second result should match second parameter');
            assert.strictEqual(results[2].resolved?.type, 'PaymentGateway', 'Third result should match third parameter');
        });
    });

    suite('resolveBeanForMethod', () => {
        test('should_resolveSetterParameter_when_setterHasSingleParameter', () => {
            // Arrange: Setter method (single parameter)
            const setterMethod = createMethodInfo('setEmailService', [
                createParameterInfo('emailService', 'EmailService', 0)
            ], true);
            
            // Act
            const results = resolver.resolveBeanForMethod(setterMethod);
            
            // Assert
            assert.strictEqual(results.length, 1, 'Should resolve setter parameter');
            assert.ok(results[0].resolved, 'Setter parameter should be resolved');
            assert.strictEqual(results[0].resolved.type, 'EmailService');
        });

        test('should_resolveMultipleParameters_when_methodHasMultipleParameters', () => {
            // Arrange: Method with multiple parameters
            const method = createMethodInfo('initServices', [
                createParameterInfo('userRepository', 'UserRepository', 0),
                createParameterInfo('emailService', 'EmailService', 1)
            ], false);
            
            // Act
            const results = resolver.resolveBeanForMethod(method);
            
            // Assert
            assert.strictEqual(results.length, 2, 'Should resolve all method parameters');
            assert.ok(results[0].resolved);
            assert.ok(results[1].resolved);
        });

        test('should_returnEmpty_when_methodHasNoParameters', () => {
            // Arrange: Method without parameters
            const method = createMethodInfo('initialize', [], false);
            
            // Act
            const results = resolver.resolveBeanForMethod(method);
            
            // Assert
            assert.strictEqual(results.length, 0, 'Should return empty for parameterless method');
        });
    });

    suite('Performance and Edge Cases', () => {
        test('should_handleLargeParameterList_when_constructorHasManyParameters', () => {
            // Arrange: Constructor with many parameters
            const parameters = [];
            for (let i = 0; i < 10; i++) {
                parameters.push(createParameterInfo(`service${i}`, 'EmailService', i));
            }
            const constructor = createConstructorInfo(parameters);
            
            // Act
            const results = resolver.resolveBeanForConstructor(constructor);
            
            // Assert
            assert.strictEqual(results.length, 10, 'Should handle many parameters');
            results.forEach((result, index) => {
                assert.ok(result.resolved, `Parameter ${index} should be resolved`);
                assert.strictEqual(result.resolved.type, 'EmailService');
            });
        });

        test('should_cacheResults_when_sameParameterResolvedMultipleTimes', () => {
            // Arrange
            const parameter = createParameterInfo('userRepository', 'UserRepository', 0);
            
            // Act: Resolve same parameter multiple times
            const result1 = resolver.resolveBeanForParameter(parameter);
            const result2 = resolver.resolveBeanForParameter(parameter);
            
            // Assert: Results should be consistent
            assert.deepStrictEqual(result1, result2, 'Results should be consistent');
            assert.strictEqual(result1.resolved?.name, result2.resolved?.name);
        });
    });
});

// Helper functions for creating test beans
function createSampleBeans(): BeanDefinition[] {
    return [
        TestUtils.createBeanDefinition('userService', 'UserService', 'com.example.service.UserService'),
        TestUtils.createBeanDefinition('userRepository', 'UserRepository', 'com.example.repository.UserRepository'),
        TestUtils.createBeanDefinition('emailService', 'EmailService', 'com.example.service.EmailService'),
    ];
}

function createNotificationBean(name: string, type: string): BeanDefinition {
    const bean = TestUtils.createBeanDefinition(name, type, `com.example.service.${type}`);
    // Use custom field to add interface information
    (bean as any).interfaces = ['NotificationService'];
    return bean;
}

function createServiceBean(name: string, type: string, interfaceName: string): BeanDefinition {
    const bean = TestUtils.createBeanDefinition(name, type, `com.example.service.${type}`);
    (bean as any).interfaces = [interfaceName];
    return bean;
}

function createRepositoryBean(name: string, type: string): BeanDefinition {
    const bean = TestUtils.createBeanDefinition(name, type, `com.example.repository.${type}`);
    (bean as any).interfaces = ['UserRepository'];
    return bean;
}

/**
 * Creates a Bean definition that implements interfaces.
 * 
 * @param name Bean name
 * @param type Bean type (implementation class name)
 * @param fullyQualifiedName Fully qualified class name
 * @param interfaces Interfaces being implemented
 * @returns Bean definition
 */
function createImplementationBean(name: string, type: string, fullyQualifiedName: string, interfaces: string[]): BeanDefinition {
    const bean = TestUtils.createBeanDefinition(name, type, fullyQualifiedName);
    (bean as any).interfaces = interfaces;
    return bean;
}

// Helper functions for parameter testing
function createParameterInfo(name: string, type: string, index: number): ParameterInfo {
    return {
        name,
        type,
        index,
        position: new vscode.Position(10 + index, 20),
        range: new vscode.Range(10 + index, 20, 10 + index, 20 + name.length)
    };
}

function createConstructorInfo(parameters: ParameterInfo[]): ConstructorInfo {
    return {
        parameters,
        position: new vscode.Position(5, 4),
        range: new vscode.Range(5, 4, 8, 5),
        hasAutowiredAnnotation: false,
        visibility: 'public'
    };
}

function createMethodInfo(name: string, parameters: ParameterInfo[], isSetterMethod: boolean): MethodInfo {
    return {
        name,
        parameters,
        position: new vscode.Position(15, 4),
        range: new vscode.Range(15, 4, 18, 5),
        annotations: [],
        isSetterMethod,
        visibility: 'public',
        returnType: 'void'
    };
} 