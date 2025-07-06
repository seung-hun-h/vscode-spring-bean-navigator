import * as assert from 'assert';
import { TestUtils } from '../helpers/core-test-utils';
import { BeanResolver } from '../../utils/bean-resolver';
import { BeanDefinition, SpringAnnotationType } from '../../models/spring-types';

/**
 * Bean name-based matching tests
 * Tests the functionality of matching by parameter name when multiple beans of the same type exist
 */
suite('Bean Name Matching', () => {
    let resolver: BeanResolver;
    
    setup(() => {
        resolver = new BeanResolver();
        
        // Add multiple beans of the same type
        const stepBean1 = TestUtils.createBeanDefinition(
            'saveContentMasterByAddUgcStep', 
            'Step<AddUgcContext>', 
            'com.example.step.SaveContentMasterByAddUgcStep'
        );
        
        const stepBean2 = TestUtils.createBeanDefinition(
            'saveContentMasterAddInformationMapByAddUgcStep', 
            'Step<AddUgcContext>', 
            'com.example.step.SaveContentMasterAddInformationMapByAddUgcStep'
        );

        const stepBean3 = TestUtils.createBeanDefinition(
            'addContentMasterBodyByAddUgcStep', 
            'Step<AddUgcContext>', 
            'com.example.step.AddContentMasterBodyByAddUgcStep'
        );

        resolver.addBeanDefinition(stepBean1);
        resolver.addBeanDefinition(stepBean2);
        resolver.addBeanDefinition(stepBean3);
    });

    test('should_resolveBeanByName_when_multipleBeansOfSameType', () => {
        // Act
        const result1 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', 'saveContentMasterByAddUgcStep');
        const result2 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', 'addContentMasterBodyByAddUgcStep');
        const result3 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', 'nonExistentStep');

        // Assert
        assert.ok(result1.resolved, 'Should resolve first bean by name');
        assert.strictEqual(result1.resolved?.name, 'saveContentMasterByAddUgcStep');
        assert.strictEqual(result1.candidates.length, 3, 'Should have 3 candidates');

        assert.ok(result2.resolved, 'Should resolve second bean by name');
        assert.strictEqual(result2.resolved?.name, 'addContentMasterBodyByAddUgcStep');

        assert.ok(!result3.resolved, 'Should not resolve non-existent bean');
        assert.strictEqual(result3.candidates.length, 3, 'Should still have 3 candidates');
    });

    test('should_returnAllCandidates_when_typeOnlyMatching', () => {
        // Act - Search by type only without name
        const result = resolver.resolveBeanForInjection('Step<AddUgcContext>');

        // Assert
        assert.ok(!result.resolved, 'Should not auto-resolve when multiple candidates');
        assert.strictEqual(result.candidates.length, 3, 'Should return all candidates');
    });

    test('should_handleCamelCaseMatching', () => {
        // Add bean with different casing
        const camelCaseBean = TestUtils.createBeanDefinition(
            'MySpecialStep', 
            'Step<AddUgcContext>', 
            'com.example.step.MySpecialStep'
        );
        resolver.addBeanDefinition(camelCaseBean);

        // Act - Try matching with camelCase
        const result1 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', 'mySpecialStep');
        const result2 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', 'MySpecialStep');

        // Assert
        assert.ok(result1.resolved, 'Should resolve with camelCase matching');
        assert.strictEqual(result1.resolved?.name, 'MySpecialStep');
        
        assert.ok(result2.resolved, 'Should resolve with exact matching');
        assert.strictEqual(result2.resolved?.name, 'MySpecialStep');
    });

    test('should_handleEmptyOrInvalidNames', () => {
        // Act
        const result1 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', '');
        const result2 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', undefined);
        const result3 = resolver.resolveBeanForInjectionWithName('Step<AddUgcContext>', '   ');

        // Assert
        assert.ok(!result1.resolved, 'Should not resolve with empty name');
        assert.ok(!result2.resolved, 'Should not resolve with undefined name');
        assert.ok(!result3.resolved, 'Should not resolve with whitespace name');
        
        // All should have 3 candidates
        assert.strictEqual(result1.candidates.length, 3);
        assert.strictEqual(result2.candidates.length, 3);
        assert.strictEqual(result3.candidates.length, 3);
    });
}); 