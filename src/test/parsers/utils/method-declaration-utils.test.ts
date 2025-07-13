import * as assert from 'assert';
import { MethodDeclareUtils } from '../../../parsers/utils/method-declare-utils';

suite('MethodDeclareUtils Test Suite', () => {
    
    test('should_extractSingleLineMethodDeclaration_when_methodIsOnOneLine', () => {
        // Arrange
        const lines = [
            'public class Test {',
            '    public void doSomething() {',
            '        // method body',
            '    }',
            '}'
        ];
        const startIndex = 1;
        
        // Act
        const result = MethodDeclareUtils.extractMethodDeclaration(lines, startIndex);
        
        // Assert
        assert.strictEqual(result.methodDeclaration, 'public void doSomething() {');
        assert.strictEqual(result.endIndex, 1);
    });
    
    test('should_extractMultiLineMethodDeclaration_when_parametersSpanMultipleLines', () => {
        // Arrange
        const lines = [
            'public class Test {',
            '    public void processData(',
            '            String input,',
            '            int count) {',
            '        // method body',
            '    }',
            '}'
        ];
        const startIndex = 1;
        
        // Act
        const result = MethodDeclareUtils.extractMethodDeclaration(lines, startIndex);
        
        // Assert
        assert.strictEqual(result.methodDeclaration, 'public void processData( String input, int count) {');
        assert.strictEqual(result.endIndex, 3);
    });
    
    test('should_extractAbstractMethodDeclaration_when_methodEndsWithSemicolon', () => {
        // Arrange
        const lines = [
            'public abstract class Test {',
            '    public abstract void doSomething();',
            '    public abstract String process(String input);',
            '}'
        ];
        const startIndex = 1;
        
        // Act
        const result = MethodDeclareUtils.extractMethodDeclaration(lines, startIndex);
        
        // Assert
        assert.strictEqual(result.methodDeclaration, 'public abstract void doSomething();');
        assert.strictEqual(result.endIndex, 1);
    });
    
    test('should_parseMethodSignature_when_validMethodDeclarationProvided', () => {
        // Arrange
        const methodDeclaration = 'public void doSomething()';
        
        // Act
        const result = MethodDeclareUtils.parseMethodSignature(methodDeclaration);
        
        // Assert
        assert.ok(result);
        assert.strictEqual(result.name, 'doSomething');
        assert.strictEqual(result.returnType, 'void');
        assert.strictEqual(result.visibility, 'public');
    });
}); 