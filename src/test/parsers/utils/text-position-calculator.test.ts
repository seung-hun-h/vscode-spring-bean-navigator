import * as assert from 'assert';
import * as vscode from 'vscode';
import { TextPositionCalculator } from '../../../parsers/utils/text-position-calculator';
import { ParameterInfo } from '../../../models/spring-types';

suite('TextPositionCalculator Test Suite', () => {
    
    suite('findParameterPosition', () => {
        test('should_findParameterPosition_when_singleLineMethod', () => {
            // Arrange
            const lines = [
                'public class Test {',
                '    public void setName(String name) {',
                '        this.name = name;',
                '    }',
                '}'
            ];
            const parameterName = 'name';
            const startIndex = 1;
            const endIndex = 1;
            
            // Act
            const result = TextPositionCalculator.findParameterPosition(
                parameterName, 
                lines, 
                startIndex, 
                endIndex
            );
            
            // Assert
            assert.ok(result.position);
            assert.ok(result.range);
            assert.strictEqual(result.position.line, 1);
            assert.strictEqual(result.position.character, 31); // Position of 'name' parameter
        });
        
        test('should_findParameterPosition_when_multiLineMethod', () => {
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
            const parameterName = 'count';
            const startIndex = 1;
            const endIndex = 3;
            
            // Act
            const result = TextPositionCalculator.findParameterPosition(
                parameterName, 
                lines, 
                startIndex, 
                endIndex
            );
            
            // Assert
            assert.ok(result.position);
            assert.ok(result.range);
            assert.strictEqual(result.position.line, 3);
            assert.strictEqual(result.position.character, 16); // Position of 'count' parameter
            assert.strictEqual(result.range.start.line, 3);
            assert.strictEqual(result.range.end.line, 3);
            assert.strictEqual(result.range.end.character, 21); // End of 'count'
        });
    });
    
    suite('calculateParameterPositions', () => {
        test('should_calculatePositions_when_multipleParameters', () => {
            // Arrange
            const parameters: ParameterInfo[] = [
                { name: 'input', type: 'String' },
                { name: 'count', type: 'int' }
            ];
            const lines = [
                'public class Test {',
                '    public void processData(',
                '            String input,',
                '            int count) {',
                '        // method body',
                '    }',
                '}'
            ];
            const methodStartIndex = 1;
            const methodEndIndex = 3;
            
            // Act
            const result = TextPositionCalculator.calculateParameterPositions(
                parameters,
                lines,
                methodStartIndex,
                methodEndIndex
            );
            
            // Assert
            assert.strictEqual(result.length, 2);
            
            // Check first parameter
            assert.strictEqual(result[0].name, 'input');
            assert.ok(result[0].position);
            assert.strictEqual(result[0].position.line, 2);
            assert.strictEqual(result[0].position.character, 19);
            
            // Check second parameter  
            assert.strictEqual(result[1].name, 'count');
            assert.ok(result[1].position);
            assert.strictEqual(result[1].position.line, 3);
            assert.strictEqual(result[1].position.character, 16);
        });
    });
}); 