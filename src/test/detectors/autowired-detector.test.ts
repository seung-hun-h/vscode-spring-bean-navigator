import * as assert from 'assert';
import * as vscode from 'vscode';
import { AutowiredInjectionDetector } from '../../detectors/autowired-injection-detector';
import { PositionCalculator } from '../../parsers/core/position-calculator';
import { ClassInfo, SpringAnnotationType, InjectionType } from '../../models/spring-types';

suite('AutowiredDetector', () => {
    let autowiredDetector: AutowiredInjectionDetector;
    let positionCalculator: PositionCalculator;

    setup(() => {
        positionCalculator = new PositionCalculator();
        autowiredDetector = new AutowiredInjectionDetector(positionCalculator);
    });

    suite('detectAllInjections', () => {
        test('should_extractInjectionInfo_when_autowiredFieldExists', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [
                    {
                        name: 'userRepository',
                        type: 'UserRepository',
                        annotations: [
                            {
                                name: 'Autowired',
                                type: SpringAnnotationType.AUTOWIRED,
                                line: 5,
                                column: 4,
                                parameters: new Map()
                            }
                        ],
                        visibility: 'private',
                        position: new vscode.Position(6, 4),
                        range: new vscode.Range(new vscode.Position(6, 4), new vscode.Position(6, 20))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(10, 1))
            };

            // Act
            const result = autowiredDetector.detectAllInjections([classInfo]);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].targetType, 'UserRepository');
            assert.strictEqual(result[0].injectionType, InjectionType.FIELD);
            assert.strictEqual(result[0].targetName, 'userRepository');
            assert.ok(result[0].position);
            assert.ok(result[0].range);
        });

        test('should_returnEmptyArray_when_noAutowiredFields', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [
                    {
                        name: 'regularField',
                        type: 'String',
                        annotations: [],
                        visibility: 'private',
                        position: new vscode.Position(5, 4),
                        range: new vscode.Range(new vscode.Position(5, 4), new vscode.Position(5, 15))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(10, 1))
            };

            // Act
            const result = autowiredDetector.detectAllInjections([classInfo]);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_extractMultipleInjections_when_multipleAutowiredFields', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [
                    {
                        name: 'userRepository',
                        type: 'UserRepository',
                        annotations: [
                            {
                                name: 'Autowired',
                                type: SpringAnnotationType.AUTOWIRED,
                                line: 5,
                                column: 4,
                                parameters: new Map()
                            }
                        ],
                        visibility: 'private',
                        position: new vscode.Position(6, 4),
                        range: new vscode.Range(new vscode.Position(6, 4), new vscode.Position(6, 20))
                    },
                    {
                        name: 'orderService',
                        type: 'OrderService',
                        annotations: [
                            {
                                name: 'Autowired',
                                type: SpringAnnotationType.AUTOWIRED,
                                line: 8,
                                column: 4,
                                parameters: new Map()
                            }
                        ],
                        visibility: 'private',
                        position: new vscode.Position(9, 4),
                        range: new vscode.Range(new vscode.Position(9, 4), new vscode.Position(9, 16))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(15, 1))
            };

            // Act
            const result = autowiredDetector.detectAllInjections([classInfo]);

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].targetType, 'UserRepository');
            assert.strictEqual(result[1].targetType, 'OrderService');
        });

        test('should_handleEmptyClassList_when_emptyArrayProvided', () => {
            // Act
            const result = autowiredDetector.detectAllInjections([]);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_skipFieldsWithoutAutowiredAnnotation_when_mixedFields', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [
                    {
                        name: 'autowiredField',
                        type: 'UserRepository',
                        annotations: [
                            {
                                name: 'Autowired',
                                type: SpringAnnotationType.AUTOWIRED,
                                line: 5,
                                column: 4,
                                parameters: new Map()
                            }
                        ],
                        visibility: 'private',
                        position: new vscode.Position(6, 4),
                        range: new vscode.Range(new vscode.Position(6, 4), new vscode.Position(6, 20))
                    },
                    {
                        name: 'regularField',
                        type: 'String',
                        annotations: [],
                        visibility: 'private',
                        position: new vscode.Position(8, 4),
                        range: new vscode.Range(new vscode.Position(8, 4), new vscode.Position(8, 15))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(15, 1))
            };

            // Act
            const result = autowiredDetector.detectAllInjections([classInfo]);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].targetName, 'autowiredField');
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullClassInfo_when_nullProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const result = autowiredDetector.detectAllInjections([null as any]);
                assert.strictEqual(result.length, 0);
            });
        });

        test('should_handleClassWithoutFields_when_fieldsUndefined', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: undefined as any,
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(5, 1))
            };

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = autowiredDetector.detectAllInjections([classInfo]);
                assert.strictEqual(result.length, 0);
            });
        });
    });
}); 