import * as assert from 'assert';
import { SpringNavigationProvider } from '../../providers/navigation-provider';
import { BeanDefinition } from '../../models/spring-types';
import { TestUtils } from '../helpers/test-utils';

suite('SpringNavigationProvider', () => {
    let provider: SpringNavigationProvider;
    
    setup(() => {
        provider = new SpringNavigationProvider();
    });

    suite('createQuickPickItem', () => {
        test('should_createFormattedItem_when_beanDefinitionProvided', () => {
            // Arrange
            const bean = TestUtils.createBeanDefinition('userService', 'UserService', 'com.example.service.UserService');
            
            // Act
            const item = provider.createQuickPickItem(bean);
            
            // Assert
            assert.ok(item.label, 'Should have label');
            assert.ok(item.description, 'Should have description');
            assert.ok(item.detail, 'Should have detail');
            assert.strictEqual(item.bean, bean, 'Should store bean reference');
            
            // Check formatting
            assert.ok(item.label.includes('UserService'), 'Label should include class name');
            assert.ok(item.description.includes('userService'), 'Description should include bean name');
            assert.ok(item.detail.includes('com.example.service'), 'Detail should include package');
        });

        test('should_handleMissingPackage_when_simpleClassNameProvided', () => {
            // Arrange
            const bean = TestUtils.createBeanDefinition('service', 'SimpleService', 'SimpleService');
            
            // Act
            const item = provider.createQuickPickItem(bean);
            
            // Assert
            assert.ok(item.label, 'Should have label');
            assert.ok(item.description, 'Should have description');
            assert.ok(item.detail, 'Should have detail');
        });
    });

    suite('getBeanDisplayInfo', () => {
        test('should_extractCorrectInfo_when_fullyQualifiedNameProvided', () => {
            // Arrange
            const fullyQualifiedName = 'com.example.service.UserService';
            
            // Act
            const info = provider.getBeanDisplayInfo(fullyQualifiedName);
            
            // Assert
            assert.strictEqual(info.className, 'UserService', 'Should extract class name');
            assert.strictEqual(info.packageName, 'com.example.service', 'Should extract package name');
        });

        test('should_handleSimpleName_when_noPackageProvided', () => {
            // Arrange
            const simpleName = 'UserService';
            
            // Act
            const info = provider.getBeanDisplayInfo(simpleName);
            
            // Assert
            assert.strictEqual(info.className, 'UserService', 'Should use as class name');
            assert.strictEqual(info.packageName, '', 'Should have empty package name');
        });
    });

    suite('selectBean - Basic', () => {
        test('should_returnEarly_when_emptyCandidatesProvided', async () => {
            // Arrange
            const candidates: BeanDefinition[] = [];
            
            // Act & Assert - should not throw
            await provider.selectBean(candidates);
            
            // No assertion needed, just verify it doesn't throw
            assert.ok(true, 'Should handle empty candidates gracefully');
        });
    });


}); 