import * as assert from 'assert';
import { BeanResolver } from '../../utils/bean-resolver';
import { TestUtils } from '../helpers/test-utils';

/**
 * Bean 이름 기반 매칭 테스트
 * 같은 타입의 Bean이 여러 개 있을 때 매개변수 이름으로 매칭하는 기능 테스트
 */
suite('🔧 Bean Name Matching', () => {
    let resolver: BeanResolver;
    
    setup(() => {
        resolver = new BeanResolver();
        
        // 같은 타입의 Bean들을 여러 개 추가
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
        // Act - 이름 없이 타입만으로 검색
        const result = resolver.resolveBeanForInjection('Step<AddUgcContext>');

        // Assert
        assert.ok(!result.resolved, 'Should not auto-resolve when multiple candidates');
        assert.strictEqual(result.candidates.length, 3, 'Should return all candidates');
    });

    test('should_handleCamelCaseMatching', () => {
        // 다른 케이스의 Bean 추가
        const camelCaseBean = TestUtils.createBeanDefinition(
            'MySpecialStep', 
            'Step<AddUgcContext>', 
            'com.example.step.MySpecialStep'
        );
        resolver.addBeanDefinition(camelCaseBean);

        // Act - camelCase로 매칭 시도
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
        
        // 모두 3개의 후보를 가져야 함
        assert.strictEqual(result1.candidates.length, 3);
        assert.strictEqual(result2.candidates.length, 3);
        assert.strictEqual(result3.candidates.length, 3);
    });
}); 