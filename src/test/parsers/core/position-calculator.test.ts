import * as assert from 'assert';
import * as vscode from 'vscode';
import { PositionCalculator } from '../../../parsers/core/position-calculator';

suite('PositionCalculator', () => {
    let calculator: PositionCalculator;

    setup(() => {
        calculator = new PositionCalculator();
    });

    suite('calculatePosition', () => {
        test('should_returnCorrectPosition_when_nodeHasLocationInfo', () => {
            // Arrange
            const mockNode = {
                location: {
                    startLine: 5,    // 1-based
                    startColumn: 10  // 1-based
                }
            };
            const lines = ['line1', 'line2', 'line3', 'line4', 'line5'];

            // Act
            const result = calculator.calculatePosition(mockNode, lines);

            // Assert
            assert.strictEqual(result.line, 4);        // 0-based
            assert.strictEqual(result.character, 9);   // 0-based
        });

        test('should_findPositionByImage_when_nodeHasImageButNoLocation', () => {
            // Arrange
            const mockNode = {
                image: 'testText'
            };
            const lines = [
                'first line',
                'second line with testText here',
                'third line'
            ];

            // Act
            const result = calculator.calculatePosition(mockNode, lines);

            // Assert
            assert.strictEqual(result.line, 1);
            assert.strictEqual(result.character, 17);
        });

        test('should_findPositionInChildren_when_nodeHasChildrenWithImage', () => {
            // Arrange
            const mockNode = {
                children: {
                    someKey: [
                        { image: 'childText' },
                        { other: 'data' }
                    ]
                }
            };
            const lines = [
                'first line',
                'line with childText in it',
                'third line'
            ];

            // Act
            const result = calculator.calculatePosition(mockNode, lines);

            // Assert
            assert.strictEqual(result.line, 1);
            assert.strictEqual(result.character, 10);
        });

        test('should_returnFallbackPosition_when_noPositionInfoFound', () => {
            // Arrange
            const mockNode = {
                someProperty: 'value'
            };
            const lines = ['line1', 'line2'];

            // Act
            const result = calculator.calculatePosition(mockNode, lines);

            // Assert
            assert.strictEqual(result.line, 0);
            assert.strictEqual(result.character, 0);
        });

        test('should_handleNullNode_when_nullProvided', () => {
            // Arrange
            const lines = ['line1', 'line2'];

            // Act
            const result = calculator.calculatePosition(null, lines);

            // Assert
            assert.strictEqual(result.line, 0);
            assert.strictEqual(result.character, 0);
        });

        test('should_findFirstOccurrence_when_textAppearsMultipleTimes', () => {
            // Arrange
            const mockNode = {
                image: 'test'
            };
            const lines = [
                'no match here',
                'first test occurrence',
                'second test occurrence'
            ];

            // Act
            const result = calculator.calculatePosition(mockNode, lines);

            // Assert
            assert.strictEqual(result.line, 1);
            assert.strictEqual(result.character, 6);
        });
    });

    suite('calculateRange', () => {
        test('should_returnCorrectRange_when_nodeHasCompleteLocationInfo', () => {
            // Arrange
            const mockNode = {
                location: {
                    startLine: 2,
                    startColumn: 5,
                    endLine: 3,
                    endColumn: 10
                }
            };
            const lines = ['line1', 'line2', 'line3'];

            // Act
            const result = calculator.calculateRange(mockNode, lines);

            // Assert
            assert.strictEqual(result.start.line, 1);
            assert.strictEqual(result.start.character, 4);
            assert.strictEqual(result.end.line, 2);
            assert.strictEqual(result.end.character, 9);
        });

        test('should_calculateRangeFromImage_when_nodeHasImageButNoLocation', () => {
            // Arrange
            const mockNode = {
                image: 'testWord'
            };
            const lines = [
                'first line',
                'line with testWord here',
                'third line'
            ];

            // Act
            const result = calculator.calculateRange(mockNode, lines);

            // Assert
            assert.strictEqual(result.start.line, 1);
            assert.strictEqual(result.start.character, 10);
            assert.strictEqual(result.end.line, 1);
            assert.strictEqual(result.end.character, 18); // 10 + 8 (length of 'testWord')
        });

        test('should_returnFallbackRange_when_noRangeInfoFound', () => {
            // Arrange
            const mockNode = {
                someProperty: 'value'
            };
            const lines = ['test line'];

            // Act
            const result = calculator.calculateRange(mockNode, lines);

            // Assert
            assert.strictEqual(result.start.line, 0);
            assert.strictEqual(result.start.character, 0);
            assert.strictEqual(result.end.line, 0);
            assert.strictEqual(result.end.character, 9); // length of 'test line'
        });

        test('should_handleEmptyLines_when_emptyArrayProvided', () => {
            // Arrange
            const mockNode = {
                image: 'test'
            };
            const lines: string[] = [];

            // Act
            const result = calculator.calculateRange(mockNode, lines);

            // Assert
            assert.strictEqual(result.start.line, 0);
            assert.strictEqual(result.start.character, 0);
            assert.strictEqual(result.end.line, 0);
            assert.strictEqual(result.end.character, 0);
        });

        test('should_calculateRangeFromChildren_when_nodeHasMultipleChildren', () => {
            // Arrange
            const mockNode = {
                children: {
                    firstGroup: [
                        { image: 'first' },
                        { image: 'middle' }
                    ],
                    secondGroup: [
                        { image: 'last' }
                    ]
                }
            };
            const lines = [
                'first word in line',
                'middle word here',
                'last word at end'
            ];

            // Act
            const result = calculator.calculateRange(mockNode, lines);

            // Assert
            // Should span from first occurrence to last occurrence
            assert.strictEqual(result.start.line, 0);
            assert.strictEqual(result.start.character, 0);
            assert.strictEqual(result.end.line, 2);
            assert.strictEqual(result.end.character, 4); // position + length of 'last'
        });
    });

    suite('findFieldPosition', () => {
        test('should_findFieldPosition_when_autowiredFieldExists', () => {
            // Arrange
            const fieldName = 'userService';
            const fieldType = 'UserService';
            const lines = [
                'public class TestController {',
                '    @Autowired',
                '    private UserService userService;',
                '    ',
                '    public void method() {',
                '    }',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.line, 2);
            assert.strictEqual(result.character, 24); // position of 'userService' in the line
        });

        test('should_findFieldPosition_when_fieldIsOnNextLine', () => {
            // Arrange
            const fieldName = 'emailService';
            const fieldType = 'EmailService';
            const lines = [
                'public class TestService {',
                '    @Autowired',
                '    @Qualifier("emailService")',
                '    private EmailService emailService;',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.line, 3);
            assert.strictEqual(result.character, 25);
        });

        test('should_returnUndefined_when_noAutowiredFieldFound', () => {
            // Arrange
            const fieldName = 'regularField';
            const fieldType = 'String';
            const lines = [
                'public class TestClass {',
                '    private String regularField;',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_autowiredButDifferentField', () => {
            // Arrange
            const fieldName = 'userService';
            const fieldType = 'UserService';
            const lines = [
                'public class TestClass {',
                '    @Autowired',
                '    private EmailService emailService;',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_findCorrectField_when_multipleAutowiredFields', () => {
            // Arrange
            const fieldName = 'emailService';
            const fieldType = 'EmailService';
            const lines = [
                'public class TestService {',
                '    @Autowired',
                '    private UserService userService;',
                '    ',
                '    @Autowired',
                '    private EmailService emailService;',
                '    ',
                '    @Autowired',
                '    private DataService dataService;',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.line, 5);
            assert.strictEqual(result.character, 25);
        });

        test('should_handleFieldWithDifferentVisibility_when_publicField', () => {
            // Arrange
            const fieldName = 'publicService';
            const fieldType = 'PublicService';
            const lines = [
                'public class TestClass {',
                '    @Autowired',
                '    public PublicService publicService;',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.line, 2);
            assert.strictEqual(result.character, 25);
        });

        test('should_handleFieldWithoutVisibilityModifier_when_packagePrivateField', () => {
            // Arrange
            const fieldName = 'packageService';
            const fieldType = 'PackageService';
            const lines = [
                'public class TestClass {',
                '    @Autowired',
                '    PackageService packageService;',
                '}'
            ];

            // Act
            const result = calculator.findFieldPosition(fieldName, fieldType, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.line, 2);
            assert.strictEqual(result.character, 19);
        });
    });

    suite('Error Handling', () => {
        test('should_logErrorButNotThrow_when_invalidNodeStructure', () => {
            // Arrange
            const malformedNode = {
                children: {
                    malformed: {
                        // This should be an array but isn't
                        badStructure: 'should be array'
                    }
                }
            };
            const lines = ['test line'];

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = calculator.calculatePosition(malformedNode, lines);
                assert.strictEqual(result.line, 0);
                assert.strictEqual(result.character, 0);
            });
        });

        test('should_handleCircularReferences_when_nodeReferencesItself', () => {
            // Arrange
            const circularNode: any = {
                image: 'test'
            };
            circularNode.children = {
                self: [circularNode]
            };
            const lines = ['test content'];

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = calculator.calculatePosition(circularNode, lines);
                assert.ok(result instanceof vscode.Position);
            });
        });

        test('should_handleUndefinedLines_when_linesIsUndefined', () => {
            // Arrange
            const mockNode = {
                image: 'test'
            };

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = calculator.calculatePosition(mockNode, undefined as any);
                assert.strictEqual(result.line, 0);
                assert.strictEqual(result.character, 0);
            });
        });

        test('should_handleInvalidRegexInFieldSearch_when_specialCharsInFieldName', () => {
            // Arrange
            const fieldName = 'field[with]special*chars';
            const fieldType = 'SpecialType';
            const lines = [
                '@Autowired',
                'private SpecialType field[with]special*chars;'
            ];

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = calculator.findFieldPosition(fieldName, fieldType, lines);
                // Should handle regex escape properly or return undefined safely
                assert.ok(result === undefined || result instanceof vscode.Position);
            });
        });
    });
}); 