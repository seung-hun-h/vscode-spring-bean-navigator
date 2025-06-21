import * as assert from 'assert';
import { BeanResolver } from '../../utils/bean-resolver';
import { BeanDefinition } from '../../models/spring-types';
import { TestUtils } from '../helpers/test-utils';

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
            
            // Act: 인터페이스 타입으로 Bean 검색
            const result = resolver.resolveBeanForInjection('MessageService');
            
            // Assert: 구현체를 찾아야 함
            assert.ok(result.resolved, 'Should find implementation when searching by interface type');
            assert.strictEqual(result.resolved.type, 'MessageServiceImpl');
            assert.strictEqual(result.resolved.name, 'messageService');
            assert.strictEqual(result.candidates.length, 1);
        });

        test('should_findImplementationByInterfaceType_when_multipleImplementationsExist', () => {
            // Arrange: 두 개의 서로 다른 인터페이스 구현체
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
            
            // Act: 각각의 인터페이스 타입으로 검색
            const messageResult = resolver.resolveBeanForInjection('MessageService');
            const notificationResult = resolver.resolveBeanForInjection('NotificationService');
            
            // Assert: 각각 올바른 구현체를 찾아야 함
            assert.ok(messageResult.resolved, 'Should find MessageService implementation');
            assert.strictEqual(messageResult.resolved.type, 'MessageServiceImpl');
            
            assert.ok(notificationResult.resolved, 'Should find NotificationService implementation');
            assert.strictEqual(notificationResult.resolved.type, 'NotificationServiceImpl');
        });

        test('should_handleMultipleImplementationsOfSameInterface_when_ambiguousInjection', () => {
            // Arrange: 같은 인터페이스의 여러 구현체
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
            
            // Act: 인터페이스 타입으로 검색
            const result = resolver.resolveBeanForInjection('MessageService');
            
            // Assert: 다중 후보가 있어야 하고 자동 해결되지 않아야 함
            assert.strictEqual(result.resolved, undefined, 'Should not auto-resolve when multiple implementations exist');
            assert.strictEqual(result.candidates.length, 2, 'Should return both candidates');
            
            const candidateTypes = result.candidates.map(c => c.type);
            assert.ok(candidateTypes.includes('MessageServiceImpl1'));
            assert.ok(candidateTypes.includes('MessageServiceImpl2'));
        });

        test('should_findImplementationByDirectType_when_usingImplementationClassName', () => {
            // Arrange: 구현체 Bean 등록
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            
            resolver.addBeanDefinition(messageServiceImpl);
            
            // Act: 구현체 클래스명으로 직접 검색
            const result = resolver.resolveBeanForInjection('MessageServiceImpl');
            
            // Assert: 구현체를 직접 찾을 수 있어야 함
            assert.ok(result.resolved, 'Should find implementation by direct class name');
            assert.strictEqual(result.resolved.type, 'MessageServiceImpl');
        });

        test('should_notFindBean_when_interfaceHasNoImplementation', () => {
            // Arrange: 구현체가 없는 인터페이스
            resolver.addBeanDefinition(createSampleBeans()[0]); // UserService (인터페이스가 아님)
            
            // Act: 존재하지 않는 인터페이스로 검색
            const result = resolver.resolveBeanForInjection('NonExistentInterface');
            
            // Assert: 찾을 수 없어야 함
            assert.strictEqual(result.resolved, undefined);
            assert.strictEqual(result.candidates.length, 0);
        });

        test('should_findByTypeAndInterface_when_typeMatchingEnabled', () => {
            // Arrange: 인터페이스와 구현체
            const messageServiceImpl = createImplementationBean(
                'messageService', 
                'MessageServiceImpl', 
                'com.example.service.MessageServiceImpl',
                ['MessageService']
            );
            
            resolver.addBeanDefinition(messageServiceImpl);
            
            // Act: findBeansByType 메소드로 인터페이스 타입 검색
            const results = resolver.findBeansByType('MessageService');
            
            // Assert: 인터페이스 타입으로도 구현체를 찾을 수 있어야 함
            assert.strictEqual(results.length, 1, 'Should find implementation by interface type');
            assert.strictEqual(results[0].type, 'MessageServiceImpl');
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
    // 인터페이스 정보 추가를 위해 커스텀 필드 사용
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
 * 인터페이스를 구현하는 Bean 정의를 생성합니다.
 * 
 * @param name Bean 이름
 * @param type Bean 타입 (구현체 클래스명)
 * @param fullyQualifiedName 완전한 클래스명
 * @param interfaces 구현하는 인터페이스들
 * @returns Bean 정의
 */
function createImplementationBean(name: string, type: string, fullyQualifiedName: string, interfaces: string[]): BeanDefinition {
    const bean = TestUtils.createBeanDefinition(name, type, fullyQualifiedName);
    (bean as any).interfaces = interfaces;
    return bean;
} 