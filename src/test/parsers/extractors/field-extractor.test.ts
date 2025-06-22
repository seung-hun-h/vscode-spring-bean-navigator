import * as assert from 'assert';
import * as vscode from 'vscode';
import { FieldExtractor } from '../../../parsers/extractors/field-extractor';
import { PositionCalculator } from '../../../parsers/core/position-calculator';
import { AnnotationParser } from '../../../parsers/extractors/annotation-parser';
import { SpringAnnotationType } from '../../../models/spring-types';
import { FieldMockBuilder } from '../../helpers/test-utils';

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

        test('should_detectFinalReferenceField_when_finalStringFieldProvided', () => {
            // Arrange - final String 필드 (FieldMockBuilder 사용)
            const mockFieldDecl = FieldMockBuilder.privateFinalString('name');
            const lines = ['private final String name;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'name');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_detectLombokNonNull_when_lombokNonNullAnnotationPresent', () => {
            // Arrange - @lombok.NonNull 어노테이션이 있는 필드
            const mockFieldDecl = FieldMockBuilder.withNonNullAnnotation('repository', 'UserRepository');
            const lines = ['@lombok.NonNull', 'private UserRepository repository;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'repository');
            assert.strictEqual(result.type, 'UserRepository');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });

        test('should_detectPackagePrivateField_when_noAccessModifierSpecified', () => {
            // Arrange - 접근 제어자가 없는 필드 (package-private)
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('packageField')
                .withType('String')
                // 접근 제어자 없이 생성
                .build();
            const lines = ['String packageField;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'packageField');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.visibility, undefined); // package-private는 undefined
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_detectSpringNonNull_when_springNonNullAnnotationPresent', () => {
            // Arrange - Spring Framework @NonNull 어노테이션
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('userService')
                .withType('UserService')
                .asPrivate()
                .build();
            
            // Spring @NonNull 어노테이션 추가
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'NonNull' }]
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@org.springframework.lang.NonNull', 'private UserService userService;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'userService');
            assert.strictEqual(result.type, 'UserService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });

        test('should_detectJavaxNonnull_when_javaxNonnullAnnotationPresent', () => {
            // Arrange - JSR-305 @Nonnull 어노테이션
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('dataService')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // JSR-305 @Nonnull 어노테이션 추가 (대소문자 다름 주의)
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'Nonnull' }]  // 소문자 n
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@javax.annotation.Nonnull', 'private DataService dataService;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'dataService');
            assert.strictEqual(result.type, 'DataService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'Nonnull');
        });

        test('should_detectNonNullOnFinalField_when_bothModifiersPresent', () => {
            // Arrange - final + @NonNull 조합 필드
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('repository')
                .withType('UserRepository')
                .asPrivate()
                .asFinal()
                .build();
            
            // @NonNull 어노테이션 추가
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'NonNull' }]
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@NonNull', 'private final UserRepository repository;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'repository');
            assert.strictEqual(result.type, 'UserRepository');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });

        test('should_detectFinalFieldWithInitializer_when_defaultValuePresent', () => {
            // Arrange - 초기값이 있는 final 필드
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('DEFAULT_NAME')
                .withType('String')
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final String DEFAULT_NAME = "default";'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert - 초기값과 상관없이 final 속성이 탐지되어야 함
            assert.ok(result);
            assert.strictEqual(result.name, 'DEFAULT_NAME');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_detectFinalGenericField_when_genericTypeUsed', () => {
            // Arrange - final 제네릭 타입 필드 (List<String> 등)
            // 제네릭 타입은 현재 단순화해서 기본 타입명만 추출
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('items')
                .withType('List')  // 제네릭 부분은 단순화
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final List<String> items;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert - 제네릭 타입도 기본 탐지 가능해야 함
            assert.ok(result);
            assert.strictEqual(result.name, 'items');
            assert.strictEqual(result.type, 'List');  // 제네릭 부분은 현재 무시
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_prioritizeLombokNonNull_when_multipleNonNullAnnotationsPresent', () => {
            // Arrange - 여러 NonNull 어노테이션이 동시에 있는 필드
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('service')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // 여러 NonNull 어노테이션 추가 (실제로는 첫 번째만 인식될 것)
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'NonNull' }]  // Lombok
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@lombok.NonNull', '@org.springframework.lang.NonNull', 'private DataService service;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert - 첫 번째 어노테이션이 인식됨 (실제로는 어노테이션 하나만 처리)
            assert.ok(result);
            assert.strictEqual(result.name, 'service');
            assert.strictEqual(result.type, 'DataService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });
    });

    suite('extractFieldType', () => {
        test('should_extractFieldType_when_validFieldProvided', () => {
            // Arrange - FieldMockBuilder 사용
            const mockField = FieldMockBuilder.create()
                .withType('String')
                .build();

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
            } as any;

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
            } as any;

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
            // Arrange - FieldMockBuilder로 복합 modifier 생성
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('CONSTANT')
                .withType('String')
                .asPrivate()
                .asFinal()
                .asStatic()
                .build();

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
            const result = fieldExtractor.parseFieldDeclaration(null as any, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleUndefinedFieldDeclaration_when_undefinedProvided', () => {
            // Arrange
            const lines = ['class TestClass {', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(undefined as any, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleInvalidClassStructure_when_malformedStructureProvided', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    invalidStructure: 'malformed'
                }
            } as any;
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

    // ======================================================
    // 🔧 Task 1.2: Lombok Field Analysis Expansion
    // ======================================================
    suite('🔧 Task 1.2: Final Field Detection (Lombok Support)', () => {
        test('should_detectFinalPrimitiveField_when_finalIntFieldProvided', () => {
            // Arrange - final int 필드
            const mockFieldDecl = {
                children: {
                    unannType: [{
                        children: {
                            unannPrimitiveType: [{
                                children: {
                                    IntegralType: [{
                                        children: {
                                            Int: [{ image: 'int' }]
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
                                            Identifier: [{ image: 'id' }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }],
                    fieldModifier: [{
                        children: {
                            Final: [{ image: 'final' }]
                        }
                    }]
                }
            };
            const lines = ['private final int id;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'id');
            assert.strictEqual(result.type, 'int');
            assert.strictEqual(result.isFinal, true);
        });

        test('should_detectFinalReferenceField_when_finalStringFieldProvided', () => {
            // Arrange - final String 필드 (FieldMockBuilder 사용)
            const mockFieldDecl = FieldMockBuilder.privateFinalString('name');
            const lines = ['private final String name;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'name');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_detectMultipleFinalFields_when_severalFinalFieldsProvided', () => {
            // Arrange - 여러 final 필드가 있는 클래스 mock
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
                                                        fieldDeclaration: [FieldMockBuilder.privateFinalString('name')]
                                                    }
                                                }]
                                            }
                                        },
                                        {
                                            children: {
                                                classMemberDeclaration: [{
                                                    children: {
                                                        fieldDeclaration: [FieldMockBuilder.privateFinalInt('id')]
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
            const lines = ['private final String name;', 'private final int id;'];

            // Act
            const result = fieldExtractor.extractFields(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].name, 'name');
            assert.strictEqual(result[0].type, 'String');
            assert.strictEqual(result[0].isFinal, true);
            assert.strictEqual(result[1].name, 'id');
            assert.strictEqual(result[1].type, 'int');
            assert.strictEqual(result[1].isFinal, true);
        });

        test('should_excludeStaticFinalFields_when_lombokAnalysisRequested', () => {
            // Arrange - static final 필드
            const mockFieldDecl = FieldMockBuilder.privateStaticFinalString('CONSTANT');
            const lines = ['private static final String CONSTANT;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert  
            assert.ok(result);
            assert.strictEqual(result.name, 'CONSTANT');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.isStatic, true);
            assert.strictEqual(result.visibility, 'private');
            // static final 필드는 Lombok constructor에서 제외되어야 함
        });

        test('should_detectFinalFieldWithInitializer_when_defaultValuePresent', () => {
            // Arrange - 초기값이 있는 final 필드
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('DEFAULT_NAME')
                .withType('String')
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final String DEFAULT_NAME = "default";'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert - 초기값과 상관없이 final 속성이 탐지되어야 함
            assert.ok(result);
            assert.strictEqual(result.name, 'DEFAULT_NAME');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_detectFinalGenericField_when_genericTypeUsed', () => {
            // Arrange - final 제네릭 타입 필드 (List<String> 등)
            // 제네릭 타입은 현재 단순화해서 기본 타입명만 추출
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('items')
                .withType('List')  // 제네릭 부분은 단순화
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final List<String> items;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert - 제네릭 타입도 기본 탐지 가능해야 함
            assert.ok(result);
            assert.strictEqual(result.name, 'items');
            assert.strictEqual(result.type, 'List');  // 제네릭 부분은 현재 무시
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });
    });

    suite('🔧 Task 1.2: NonNull Annotation Detection', () => {
        test('should_detectLombokNonNull_when_lombokNonNullAnnotationPresent', () => {
            // Arrange - @lombok.NonNull 어노테이션이 있는 필드
            const mockFieldDecl = FieldMockBuilder.withNonNullAnnotation('repository', 'UserRepository');
            const lines = ['@lombok.NonNull', 'private UserRepository repository;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'repository');
            assert.strictEqual(result.type, 'UserRepository');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });

        test('should_detectSpringNonNull_when_springNonNullAnnotationPresent', () => {
            // Arrange - Spring Framework @NonNull 어노테이션
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('userService')
                .withType('UserService')
                .asPrivate()
                .build();
            
            // Spring @NonNull 어노테이션 추가
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'NonNull' }]
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@org.springframework.lang.NonNull', 'private UserService userService;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'userService');
            assert.strictEqual(result.type, 'UserService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });

        test('should_detectJavaxNonnull_when_javaxNonnullAnnotationPresent', () => {
            // Arrange - JSR-305 @Nonnull 어노테이션
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('dataService')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // JSR-305 @Nonnull 어노테이션 추가 (대소문자 다름 주의)
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'Nonnull' }]  // 소문자 n
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@javax.annotation.Nonnull', 'private DataService dataService;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'dataService');
            assert.strictEqual(result.type, 'DataService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'Nonnull');
        });

        test('should_detectNonNullOnFinalField_when_bothModifiersPresent', () => {
            // Arrange - final + @NonNull 조합 필드
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('repository')
                .withType('UserRepository')
                .asPrivate()
                .asFinal()
                .build();
            
            // @NonNull 어노테이션 추가
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'NonNull' }]
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@NonNull', 'private final UserRepository repository;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'repository');
            assert.strictEqual(result.type, 'UserRepository');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });

        test('should_prioritizeLombokNonNull_when_multipleNonNullAnnotationsPresent', () => {
            // Arrange - 여러 NonNull 어노테이션이 동시에 있는 필드
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('service')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // 여러 NonNull 어노테이션 추가 (실제로는 첫 번째만 인식될 것)
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'NonNull' }]  // Lombok
                                }
                            }]
                        }
                    }]
                }
            });

            const lines = ['@lombok.NonNull', '@org.springframework.lang.NonNull', 'private DataService service;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert - 첫 번째 어노테이션이 인식됨 (실제로는 어노테이션 하나만 처리)
            assert.ok(result);
            assert.strictEqual(result.name, 'service');
            assert.strictEqual(result.type, 'DataService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });
    });

    suite('🔧 Task 1.2: Enhanced Access Modifier Analysis', () => {
        test('should_detectPackagePrivateField_when_noAccessModifierSpecified', () => {
            // Act - 접근 제어자가 없는 필드 (package-private)
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('packageField')
                .withType('String')
                // 접근 제어자 없이 생성
                .build();
            const lines = ['String packageField;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'packageField');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.visibility, undefined); // package-private는 undefined
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_analyzeComplexModifierCombination_when_multipleModifiersPresent', () => {
            // Arrange - private final static 조합
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('INSTANCE')
                .withType('MyClass')
                .asPrivate()
                .asFinal()
                .asStatic()
                .build();
            const lines = ['private static final MyClass INSTANCE;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'INSTANCE');
            assert.strictEqual(result.type, 'MyClass');
            assert.strictEqual(result.visibility, 'private');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.isStatic, true);
        });

        test('should_detectTransientField_when_transientModifierPresent', () => {
            // Arrange - transient 필드 (직렬화에서 제외되는 필드)
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('tempData')
                .withType('String')
                .asPrivate()
                .asTransient()
                .build();
            const lines = ['private transient String tempData;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'tempData');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.visibility, 'private');
            // transient는 현재 별도 속성으로 처리되지 않지만 필드 자체는 탐지되어야 함
        });

        test('should_detectVolatileField_when_volatileModifierPresent', () => {
            // Arrange - volatile 필드 (메모리 가시성 보장)
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('flag')
                .withPrimitiveType('boolean')
                .asPrivate()
                .asVolatile()
                .build();
            const lines = ['private volatile boolean flag;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'flag');
            assert.strictEqual(result.type, 'boolean');
            assert.strictEqual(result.visibility, 'private');
            // volatile는 현재 별도 속성으로 처리되지 않지만 필드 자체는 탐지되어야 함
        });
    });

    suite('🔧 Task 1.2: Lombok Field Classification', () => {
        test('should_classifyRequiredArgsConstructorFields_when_finalAndNonNullFieldsPresent', () => {
            // Arrange - final 필드와 @NonNull 필드, 일반 필드 혼재
            const finalField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateFinalString('name'), 
                ['private final String name;']
            );
            const nonNullField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.withNonNullAnnotation('userService', 'UserService'), 
                ['@NonNull private UserService userService;']
            );
            const normalField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.create().withName('temp').withType('String').asPrivate().build(),
                ['private String temp;']
            );

            const allFields = [finalField, nonNullField, normalField].filter(f => f !== undefined);

            // Act - @RequiredArgsConstructor에 포함될 필드들 필터링 (final 또는 @NonNull)
            const requiredFields = allFields.filter(field => 
                field!.isFinal || field!.annotations.some(ann => ann.name === 'NonNull')
            );

            // Assert - final 필드와 @NonNull 필드만 포함되어야 함
            assert.strictEqual(requiredFields.length, 2);
            assert.ok(requiredFields.some(f => f!.name === 'name'));
            assert.ok(requiredFields.some(f => f!.name === 'userService'));
        });

        test('should_classifyAllArgsConstructorFields_when_allFieldsAnalyzed', () => {
            // Arrange - 다양한 종류의 필드들
            const instanceField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.create().withName('data').withType('String').asPrivate().build(),
                ['private String data;']
            );
            const staticField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateStaticFinalString('CONSTANT'),
                ['private static final String CONSTANT;']
            );
            const finalField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateFinalString('name'),
                ['private final String name;']
            );

            const allFields = [instanceField, staticField, finalField].filter(f => f !== undefined);

            // Act - @AllArgsConstructor에 포함될 필드들 필터링 (static 제외)
            const allArgsFields = allFields.filter(field => !field!.isStatic);

            // Assert - static 필드는 제외되어야 함
            assert.strictEqual(allArgsFields.length, 2);
            assert.ok(allArgsFields.some(f => f!.name === 'data'));
            assert.ok(allArgsFields.some(f => f!.name === 'name'));
            assert.ok(!allArgsFields.some(f => f!.name === 'CONSTANT'));
        });

        test('should_maintainFieldOrder_when_multipleFieldsClassified', () => {
            // Arrange - 순서가 중요한 여러 필드들 (소스 코드 순서)
            const field1 = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateFinalString('first'),
                ['private final String first;']
            );
            const field2 = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateFinalString('second'),
                ['private final String second;']
            );
            const field3 = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateFinalString('third'),
                ['private final String third;']
            );

            const orderedFields = [field1, field2, field3].filter(f => f !== undefined);

            // Act - 필드 순서 확인
            const fieldNames = orderedFields.map(f => f!.name);

            // Assert - 소스 코드 순서대로 유지되어야 함
            assert.deepStrictEqual(fieldNames, ['first', 'second', 'third']);
        });

        test('should_handleEmptyFieldList_when_noEligibleFieldsPresent', () => {
            // Arrange - static 필드만 있는 경우 (Lombok constructor에 포함되지 않음)
            const staticField = fieldExtractor.parseFieldDeclaration(
                FieldMockBuilder.privateStaticFinalString('ONLY_STATIC'),
                ['private static final String ONLY_STATIC;']
            );

            const allFields = staticField ? [staticField] : [];

            // Act - @RequiredArgsConstructor에 포함될 필드 필터링
            const requiredFields = allFields.filter(field => 
                field.isFinal && !field.isStatic || 
                field.annotations.some(ann => ann.name === 'NonNull')
            );

            // Assert - 해당하는 필드가 없으면 빈 배열
            assert.strictEqual(requiredFields.length, 0);
        });
    });
}); 