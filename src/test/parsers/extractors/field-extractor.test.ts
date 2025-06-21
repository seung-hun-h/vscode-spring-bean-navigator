import * as assert from 'assert';
import * as vscode from 'vscode';
import { FieldExtractor } from '../../../parsers/extractors/field-extractor';
import { PositionCalculator } from '../../../parsers/core/position-calculator';
import { AnnotationParser } from '../../../parsers/extractors/annotation-parser';
import { SpringAnnotationType } from '../../../models/spring-types';

/**
 * FieldExtractor 테스트 스위트
 */
suite('FieldExtractor', () => {
    let fieldExtractor: FieldExtractor;
    let positionCalculator: PositionCalculator;
    let annotationParser: AnnotationParser;

    setup(() => {
        positionCalculator = new PositionCalculator();
        annotationParser = new AnnotationParser(positionCalculator);
        fieldExtractor = new FieldExtractor(positionCalculator, annotationParser);
    });

    suite('extractFields', () => {
        test('should_extractSingleField_when_classHasOneField', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    normalClassDeclaration: [{
                        children: {
                            classBody: [{
                                children: {
                                    classBodyDeclaration: [{
                                        children: {
                                            classMemberDeclaration: [{
                                                children: {
                                                    fieldDeclaration: [{
                                                        children: {
                                                            unannType: [{
                                                                children: {
                                                                    unannReferenceType: [{
                                                                        children: {
                                                                            unannClassOrInterfaceType: [{
                                                                                children: {
                                                                                    unannClassType: [{
                                                                                        children: {
                                                                                            Identifier: [{
                                                                                                image: 'String'
                                                                                            }]
                                                                                        }
                                                                                    }]
                                                                                }
                                                                            }]
                                                                        }
                                                                    }]
                                                                }
                                                            }],
                                                            variableDeclaratorList: [{
                                                                children: {
                                                                    variableDeclarator: [{
                                                                        children: {
                                                                            variableDeclaratorId: [{
                                                                                children: {
                                                                                    Identifier: [{
                                                                                        image: 'name'
                                                                                    }]
                                                                                }
                                                                            }]
                                                                        }
                                                                    }]
                                                                }
                                                            }],
                                                            fieldModifier: []
                                                        }
                                                    }]
                                                }
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }]
                }
            };
            const lines = ['class TestClass {', '    private String name;', '}'];

            // Act
            const result = fieldExtractor.extractFields(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'name');
            assert.strictEqual(result[0].type, 'String');
        });

        test('should_extractMultipleFields_when_classHasMultipleFields', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    normalClassDeclaration: [{
                        children: {
                            classBody: [{
                                children: {
                                    classBodyDeclaration: [
                                        {
                                            children: {
                                                classMemberDeclaration: [{
                                                    children: {
                                                        fieldDeclaration: [{
                                                            children: {
                                                                unannType: [{
                                                                    children: {
                                                                        unannReferenceType: [{
                                                                            children: {
                                                                                unannClassOrInterfaceType: [{
                                                                                    children: {
                                                                                        unannClassType: [{
                                                                                            children: {
                                                                                                Identifier: [{
                                                                                                    image: 'String'
                                                                                                }]
                                                                                            }
                                                                                        }]
                                                                                    }
                                                                                }]
                                                                            }
                                                                        }]
                                                                    }
                                                                }],
                                                                variableDeclaratorList: [{
                                                                    children: {
                                                                        variableDeclarator: [{
                                                                            children: {
                                                                                variableDeclaratorId: [{
                                                                                    children: {
                                                                                        Identifier: [{
                                                                                            image: 'name'
                                                                                        }]
                                                                                    }
                                                                                }]
                                                                            }
                                                                        }]
                                                                    }
                                                                }],
                                                                fieldModifier: []
                                                            }
                                                        }]
                                                    }
                                                }]
                                            }
                                        },
                                        {
                                            children: {
                                                classMemberDeclaration: [{
                                                    children: {
                                                        fieldDeclaration: [{
                                                            children: {
                                                                unannType: [{
                                                                    children: {
                                                                        unannReferenceType: [{
                                                                            children: {
                                                                                unannClassOrInterfaceType: [{
                                                                                    children: {
                                                                                        unannClassType: [{
                                                                                            children: {
                                                                                                Identifier: [{
                                                                                                    image: 'Integer'
                                                                                                }]
                                                                                            }
                                                                                        }]
                                                                                    }
                                                                                }]
                                                                            }
                                                                        }]
                                                                    }
                                                                }],
                                                                variableDeclaratorList: [{
                                                                    children: {
                                                                        variableDeclarator: [{
                                                                            children: {
                                                                                variableDeclaratorId: [{
                                                                                    children: {
                                                                                        Identifier: [{
                                                                                            image: 'age'
                                                                                        }]
                                                                                    }
                                                                                }]
                                                                            }
                                                                        }]
                                                                    }
                                                                }],
                                                                fieldModifier: []
                                                            }
                                                        }]
                                                    }
                                                }]
                                            }
                                        }
                                    ]
                                }
                            }]
                        }
                    }]
                }
            };
            const lines = ['class TestClass {', '    private String name;', '    private Integer age;', '}'];

            // Act
            const result = fieldExtractor.extractFields(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, 'name');
            assert.strictEqual(result[0].type, 'String');
            assert.strictEqual(result[1].name, 'age');
            assert.strictEqual(result[1].type, 'Integer');
        });

        test('should_returnEmptyArray_when_classHasNoFields', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    normalClassDeclaration: [{
                        children: {
                            classBody: [{
                                children: {
                                    classBodyDeclaration: []
                                }
                            }]
                        }
                    }]
                }
            };
            const lines = ['class TestClass {', '}'];

            // Act
            const result = fieldExtractor.extractFields(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('parseFieldDeclaration', () => {
        test('should_parseFieldDeclaration_when_validFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    unannType: [{
                        children: {
                            unannReferenceType: [{
                                children: {
                                    unannClassOrInterfaceType: [{
                                        children: {
                                            unannClassType: [{
                                                children: {
                                                    Identifier: [{
                                                        image: 'UserService'
                                                    }]
                                                }
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }],
                    variableDeclaratorList: [{
                        children: {
                            variableDeclarator: [{
                                children: {
                                    variableDeclaratorId: [{
                                        children: {
                                            Identifier: [{
                                                image: 'userService'
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }],
                    fieldModifier: [{
                        children: {
                            Private: [{ image: 'private' }]
                        }
                    }]
                }
            };
            const lines = ['class TestClass {', '    private UserService userService;', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'userService');
            assert.strictEqual(result.type, 'UserService');
            assert.strictEqual(result.visibility, 'private');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_returnUndefined_when_fieldTypeNotFound', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    variableDeclaratorList: [{
                        children: {
                            variableDeclarator: [{
                                children: {
                                    variableDeclaratorId: [{
                                        children: {
                                            Identifier: [{
                                                image: 'userService'
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }],
                    fieldModifier: []
                }
            };
            const lines = ['class TestClass {', '    userService;', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_fieldNameNotFound', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    unannType: [{
                        children: {
                            unannReferenceType: [{
                                children: {
                                    unannClassOrInterfaceType: [{
                                        children: {
                                            unannClassType: [{
                                                children: {
                                                    Identifier: [{
                                                        image: 'UserService'
                                                    }]
                                                }
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }],
                    fieldModifier: []
                }
            };
            const lines = ['class TestClass {', '    UserService;', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('extractFieldType', () => {
        test('should_extractFieldType_when_validFieldProvided', () => {
            // Arrange
            const mockField = {
                children: {
                    unannType: [{
                        children: {
                            unannReferenceType: [{
                                children: {
                                    unannClassOrInterfaceType: [{
                                        children: {
                                            unannClassType: [{
                                                children: {
                                                    Identifier: [{
                                                        image: 'String'
                                                    }]
                                                }
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldType(mockField);

            // Assert
            assert.strictEqual(result, 'String');
        });

        test('should_returnUndefined_when_invalidTypeStructure', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    invalidType: [{}]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldType(mockFieldDecl);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('extractFieldName', () => {
        test('should_extractFieldName_when_validFieldProvided', () => {
            // Arrange
            const mockField = {
                children: {
                    variableDeclaratorList: [{
                        children: {
                            variableDeclarator: [{
                                children: {
                                    variableDeclaratorId: [{
                                        children: {
                                            Identifier: [{
                                                image: 'userName'
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldName(mockField);

            // Assert
            assert.strictEqual(result, 'userName');
        });

        test('should_returnUndefined_when_invalidNameStructure', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    invalidName: [{}]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldName(mockFieldDecl);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('extractFieldModifiers', () => {
        test('should_extractPrivateModifier_when_privateFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [{
                        children: {
                            Private: [{ image: 'private' }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'private');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractPublicModifier_when_publicFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [{
                        children: {
                            Public: [{ image: 'public' }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'public');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractProtectedModifier_when_protectedFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [{
                        children: {
                            Protected: [{ image: 'protected' }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'protected');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractFinalModifier_when_finalFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [{
                        children: {
                            Final: [{ image: 'final' }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, undefined);
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractStaticModifier_when_staticFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [{
                        children: {
                            Static: [{ image: 'static' }]
                        }
                    }]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, undefined);
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, true);
        });

        test('should_extractMultipleModifiers_when_multipleModifiersProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [
                        {
                            children: {
                                Private: [{ image: 'private' }]
                            }
                        },
                        {
                            children: {
                                Final: [{ image: 'final' }]
                            }
                        },
                        {
                            children: {
                                Static: [{ image: 'static' }]
                            }
                        }
                    ]
                }
            };

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'private');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.isStatic, true);
        });
    });

    suite('extractFieldAnnotations', () => {
        test('should_extractAutowiredAnnotation_when_autowiredFieldProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: [{
                        children: {
                            annotation: [{
                                children: {
                                    At: [{ image: '@' }],
                                    typeName: [{
                                        children: {
                                            Identifier: [{
                                                image: 'Autowired'
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }]
                }
            };
            const lines = ['class TestClass {', '    @Autowired', '    private UserService userService;', '}'];

            // Act
            const result = fieldExtractor.extractFieldAnnotations(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'Autowired');
            assert.strictEqual(result[0].type, SpringAnnotationType.AUTOWIRED);
        });

        test('should_returnEmptyArray_when_noAnnotationsProvided', () => {
            // Arrange
            const mockFieldDecl = {
                children: {
                    fieldModifier: []
                }
            };
            const lines = ['class TestClass {', '    private UserService userService;', '}'];

            // Act
            const result = fieldExtractor.extractFieldAnnotations(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('Utility Methods', () => {
        test('should_findFieldsByType_when_fieldsWithTypeProvided', () => {
            // Arrange
            const fields = [
                {
                    name: 'userService',
                    type: 'UserService',
                    position: new vscode.Position(0, 0),
                    range: new vscode.Range(0, 0, 0, 10),
                    annotations: [],
                    visibility: 'private',
                    isFinal: false,
                    isStatic: false
                },
                {
                    name: 'orderService',
                    type: 'OrderService',
                    position: new vscode.Position(1, 0),
                    range: new vscode.Range(1, 0, 1, 12),
                    annotations: [],
                    visibility: 'private',
                    isFinal: false,
                    isStatic: false
                },
                {
                    name: 'anotherUserService',
                    type: 'UserService',
                    position: new vscode.Position(2, 0),
                    range: new vscode.Range(2, 0, 2, 18),
                    annotations: [],
                    visibility: 'private',
                    isFinal: false,
                    isStatic: false
                }
            ];

            // Act
            const result = fieldExtractor.findFieldsByType(fields, 'UserService');

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, 'userService');
            assert.strictEqual(result[1].name, 'anotherUserService');
        });

        test('should_findFieldsByAnnotation_when_fieldsWithAnnotationProvided', () => {
            // Arrange
            const fields = [
                {
                    name: 'userService',
                    type: 'UserService',
                    position: new vscode.Position(0, 0),
                    range: new vscode.Range(0, 0, 0, 10),
                    annotations: [{ name: 'Autowired', type: SpringAnnotationType.AUTOWIRED, line: 0, column: 0 }],
                    visibility: 'private',
                    isFinal: false,
                    isStatic: false
                },
                {
                    name: 'normalField',
                    type: 'String',
                    position: new vscode.Position(1, 0),
                    range: new vscode.Range(1, 0, 1, 10),
                    annotations: [],
                    visibility: 'private',
                    isFinal: false,
                    isStatic: false
                }
            ];

            // Act
            const result = fieldExtractor.findFieldsByAnnotation(fields, 'Autowired');

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'userService');
        });

        test('should_hasVisibility_when_fieldWithVisibilityProvided', () => {
            // Arrange
            const field = {
                name: 'userService',
                type: 'UserService',
                position: new vscode.Position(0, 0),
                range: new vscode.Range(0, 0, 0, 10),
                annotations: [],
                visibility: 'private',
                isFinal: false,
                isStatic: false
            };

            // Act & Assert
            assert.strictEqual(fieldExtractor.hasVisibility(field, 'private'), true);
            assert.strictEqual(fieldExtractor.hasVisibility(field, 'public'), false);
        });

        test('should_isFinalField_when_finalFieldProvided', () => {
            // Arrange
            const finalField = {
                name: 'CONSTANT',
                type: 'String',
                position: new vscode.Position(0, 0),
                range: new vscode.Range(0, 0, 0, 8),
                annotations: [],
                visibility: 'public',
                isFinal: true,
                isStatic: true
            };
            const nonFinalField = {
                name: 'variable',
                type: 'String',
                position: new vscode.Position(1, 0),
                range: new vscode.Range(1, 0, 1, 8),
                annotations: [],
                visibility: 'private',
                isFinal: false,
                isStatic: false
            };

            // Act & Assert
            assert.strictEqual(fieldExtractor.isFinalField(finalField), true);
            assert.strictEqual(fieldExtractor.isFinalField(nonFinalField), false);
        });

        test('should_isStaticField_when_staticFieldProvided', () => {
            // Arrange
            const staticField = {
                name: 'CONSTANT',
                type: 'String',
                position: new vscode.Position(0, 0),
                range: new vscode.Range(0, 0, 0, 8),
                annotations: [],
                visibility: 'public',
                isFinal: true,
                isStatic: true
            };
            const instanceField = {
                name: 'variable',
                type: 'String',
                position: new vscode.Position(1, 0),
                range: new vscode.Range(1, 0, 1, 8),
                annotations: [],
                visibility: 'private',
                isFinal: false,
                isStatic: false
            };

            // Act & Assert
            assert.strictEqual(fieldExtractor.isStaticField(staticField), true);
            assert.strictEqual(fieldExtractor.isStaticField(instanceField), false);
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullFieldDeclaration_when_nullProvided', () => {
            // Arrange
            const lines = ['class TestClass {', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(null, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleUndefinedFieldDeclaration_when_undefinedProvided', () => {
            // Arrange
            const lines = ['class TestClass {', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(undefined, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleInvalidClassStructure_when_malformedStructureProvided', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    invalidStructure: 'malformed'
                }
            };
            const lines = ['class TestClass {', '}'];

            // Act
            const result = fieldExtractor.extractFields(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_logErrorButNotThrow_when_unexpectedErrorOccurs', () => {
            // Arrange - 순환 참조로 에러 발생시키기
            const circularRef: any = {};
            circularRef.children = circularRef;
            const lines = ['class TestClass {', '}'];

            // Act & Assert - 에러를 던지지 않고 결과를 반환해야 함
            const result = fieldExtractor.extractFields(circularRef, lines);
            assert.strictEqual(result.length, 0);
        });
    });
}); 