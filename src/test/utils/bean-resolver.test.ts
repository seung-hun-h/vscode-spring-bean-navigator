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