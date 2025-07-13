import * as assert from 'assert';
import { MethodClassifyUtils } from '../../../parsers/utils/method-classify-utils';
import { AnnotationInfo, SpringAnnotationType } from '../../../models/spring-types';

suite('MethodClassifyUtils Test Suite', () => {
    
    suite('isSetterMethod', () => {
        test('should_returnTrue_when_standardSetterPattern', () => {
            // Arrange
            const methodName = 'setName';
            const parameterCount = 1;
            
            // Act
            const result = MethodClassifyUtils.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, true);
        });
        
        test('should_returnFalse_when_notStartingWithSet', () => {
            // Arrange
            const methodName = 'getName';
            const parameterCount = 1;
            
            // Act
            const result = MethodClassifyUtils.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false);
        });
        
        test('should_returnFalse_when_justSet', () => {
            // Arrange
            const methodName = 'set';
            const parameterCount = 1;
            
            // Act
            const result = MethodClassifyUtils.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false);
        });
        
        test('should_returnFalse_when_setFollowedByLowercase', () => {
            // Arrange
            const methodName = 'setup';
            const parameterCount = 1;
            
            // Act
            const result = MethodClassifyUtils.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false);
        });
        
        test('should_returnFalse_when_noParameters', () => {
            // Arrange
            const methodName = 'setName';
            const parameterCount = 0;
            
            // Act
            const result = MethodClassifyUtils.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false);
        });
        
        test('should_returnTrue_when_multipleParameters', () => {
            // Arrange
            const methodName = 'setValue';
            const parameterCount = 2;
            
            // Act
            const result = MethodClassifyUtils.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, true);
        });
    });
    
    suite('isBeanMethod', () => {
        test('should_returnTrue_when_beanAnnotationPresent', () => {
            // Arrange
            const annotations: AnnotationInfo[] = [{
                name: 'Bean',
                type: SpringAnnotationType.BEAN,
                line: 0,
                column: 0
            }];
            
            // Act
            const result = MethodClassifyUtils.isBeanMethod(annotations);
            
            // Assert
            assert.strictEqual(result, true);
        });
        
        test('should_returnFalse_when_noBeanAnnotation', () => {
            // Arrange
            const annotations: AnnotationInfo[] = [{
                name: 'Override',
                type: SpringAnnotationType.AUTOWIRED,
                line: 0,
                column: 0
            }];
            
            // Act
            const result = MethodClassifyUtils.isBeanMethod(annotations);
            
            // Assert
            assert.strictEqual(result, false);
        });
        
        test('should_returnFalse_when_emptyAnnotations', () => {
            // Arrange
            const annotations: AnnotationInfo[] = [];
            
            // Act
            const result = MethodClassifyUtils.isBeanMethod(annotations);
            
            // Assert
            assert.strictEqual(result, false);
        });
    });
}); 