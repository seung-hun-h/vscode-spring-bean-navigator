import * as assert from 'assert';
import * as vscode from 'vscode';
import { AutowiredDetector } from '../../../parsers/extractors/autowired-detector';
import { PositionCalculator } from '../../../parsers/core/position-calculator';
import { ClassInfo, FieldInfo, SpringAnnotationType, InjectionType } from '../../../models/spring-types';

/**
 * AutowiredDetector 테스트 스위트
 */
suite('AutowiredDetector', () => {
    let autowiredDetector: AutowiredDetector;
    let positionCalculator: PositionCalculator;

    setup(() => {
        positionCalculator = new PositionCalculator();
        autowiredDetector = new AutowiredDetector(positionCalculator);
    });

    suite('extractAutowiredFields', () => {
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
            const result = autowiredDetector.extractAutowiredFields([classInfo]);

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
            const result = autowiredDetector.extractAutowiredFields([classInfo]);

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
            const result = autowiredDetector.extractAutowiredFields([classInfo]);

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].targetType, 'UserRepository');
            assert.strictEqual(result[1].targetType, 'OrderService');
        });

        test('should_handleEmptyClassList_when_emptyArrayProvided', () => {
            // Act
            const result = autowiredDetector.extractAutowiredFields([]);

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
            const result = autowiredDetector.extractAutowiredFields([classInfo]);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].targetName, 'autowiredField');
        });
    });

    suite('hasAutowiredFields', () => {
        test('should_returnTrue_when_autowiredFieldExists', () => {
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
            const result = autowiredDetector.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, true);
        });

        test('should_returnFalse_when_noAutowiredFields', () => {
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
            const result = autowiredDetector.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, false);
        });

        test('should_returnFalse_when_noFields', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(5, 1))
            };

            // Act
            const result = autowiredDetector.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, false);
        });

        test('should_returnTrue_when_multipleAutowiredFieldsExist', () => {
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
            const result = autowiredDetector.hasAutowiredFields(classInfo);

            // Assert
            assert.strictEqual(result, true);
        });
    });

    suite('findAutowiredFieldsByType', () => {
        test('should_returnMatchingAutowiredFields_when_typeMatches', () => {
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
                    },
                    {
                        name: 'anotherUserRepository',
                        type: 'UserRepository',
                        annotations: [
                            {
                                name: 'Autowired',
                                type: SpringAnnotationType.AUTOWIRED,
                                line: 11,
                                column: 4,
                                parameters: new Map()
                            }
                        ],
                        visibility: 'private',
                        position: new vscode.Position(12, 4),
                        range: new vscode.Range(new vscode.Position(12, 4), new vscode.Position(12, 25))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(20, 1))
            };

            // Act
            const result = autowiredDetector.findAutowiredFieldsByType(classInfo, 'UserRepository');

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, 'userRepository');
            assert.strictEqual(result[1].name, 'anotherUserRepository');
            assert.ok(result.every(field => field.type === 'UserRepository'));
        });

        test('should_returnEmptyArray_when_typeNotFound', () => {
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
            const result = autowiredDetector.findAutowiredFieldsByType(classInfo, 'NonExistentType');

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_excludeNonAutowiredFields_when_typeExistsButNotAutowired', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [
                    {
                        name: 'autowiredRepo',
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
                        name: 'nonAutowiredRepo',
                        type: 'UserRepository',
                        annotations: [],
                        visibility: 'private',
                        position: new vscode.Position(8, 4),
                        range: new vscode.Range(new vscode.Position(8, 4), new vscode.Position(8, 25))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(15, 1))
            };

            // Act
            const result = autowiredDetector.findAutowiredFieldsByType(classInfo, 'UserRepository');

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'autowiredRepo');
        });

        test('should_returnSingleField_when_onlyOneMatch', () => {
            // Arrange
            const classInfo: ClassInfo = {
                name: 'TestService',
                packageName: 'com.example',
                fullyQualifiedName: 'com.example.TestService',
                imports: [],
                annotations: [],
                fields: [
                    {
                        name: 'orderService',
                        type: 'OrderService',
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
                        range: new vscode.Range(new vscode.Position(6, 4), new vscode.Position(6, 18))
                    }
                ],
                fileUri: vscode.Uri.file('/test/TestService.java'),
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(10, 1))
            };

            // Act
            const result = autowiredDetector.findAutowiredFieldsByType(classInfo, 'OrderService');

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'orderService');
            assert.strictEqual(result[0].type, 'OrderService');
        });
    });

    suite('findAutowiredPatterns', () => {
        test('should_findAutowiredPattern_when_simpleAutowiredFieldExists', () => {
            // Arrange
            const content = `package com.example;

import org.springframework.beans.factory.annotation.Autowired;

public class TestService {
    @Autowired
    private UserRepository userRepository;
    
    public void doSomething() {
        // method body
    }
}`;
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].targetType, 'UserRepository');
            assert.strictEqual(result[0].injectionType, InjectionType.FIELD);
            assert.strictEqual(result[0].targetName, 'userRepository');
            assert.strictEqual(result[0].position.line, 6);
        });

        test('should_findMultipleAutowiredPatterns_when_multipleFieldsExist', () => {
            // Arrange
            const content = `package com.example;

public class TestService {
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    protected OrderService orderService;
    
    @Autowired
    public ProductService productService;
}`;
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].targetName, 'userRepository');
            assert.strictEqual(result[1].targetName, 'orderService');
            assert.strictEqual(result[2].targetName, 'productService');
        });

        test('should_handleVisibilityModifiers_correctly', () => {
            // Arrange
            const content = `public class TestService {
    @Autowired
    private UserRepository privateRepo;
    
    @Autowired
    protected UserService protectedService;
    
    @Autowired
    public OrderService publicService;
    
    @Autowired
    UserRepository packageRepo;
}`;
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 4);
            const targetNames = result.map(r => r.targetName);
            assert.deepStrictEqual(targetNames, [
                'privateRepo',
                'protectedService', 
                'publicService',
                'packageRepo'
            ]);
        });

        test('should_returnEmptyArray_when_noAutowiredAnnotations', () => {
            // Arrange
            const content = `package com.example;

public class TestService {
    private UserRepository userRepository;
    protected OrderService orderService;
    
    public void doSomething() {
        // method body
    }
}`;
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_skipInvalidFieldDeclarations_when_malformedFields', () => {
            // Arrange
            const content = `public class TestService {
    @Autowired
    // 잘못된 필드 선언 (주석)
    
    @Autowired
    private UserRepository validRepo;
    
    @Autowired
    invalidFieldDeclaration
}`;
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].targetName, 'validRepo');
        });

        test('should_handleEmptyContent_when_emptyStringProvided', () => {
            // Arrange
            const content = '';
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_calculateCorrectPositions_when_validFieldExists', () => {
            // Arrange
            const content = `package com.example;

public class TestService {
    @Autowired
    private UserRepository userRepository;
}`;
            const fileUri = vscode.Uri.file('/test/TestService.java');

            // Act
            const result = autowiredDetector.findAutowiredPatterns(content, fileUri);

            // Assert
            assert.strictEqual(result.length, 1);
            const injection = result[0];
            assert.strictEqual(injection.position.line, 4);
            assert.strictEqual(injection.position.character, 27);
            assert.deepStrictEqual(injection.range.start, injection.position);
            assert.strictEqual(injection.range.end.line, 4);
            assert.strictEqual(injection.range.end.character, 41);
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullClassInfo_when_nullProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const result = autowiredDetector.extractAutowiredFields([null as any]);
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
                const result = autowiredDetector.extractAutowiredFields([classInfo]);
                assert.strictEqual(result.length, 0);
            });
        });
    });
}); 