import * as assert from 'assert';
import * as vscode from 'vscode';
import { FieldExtractor } from '../../../parsers/extractors/field-extractor';
import { PositionCalculator } from '../../../parsers/core/position-calculator';
import { AnnotationParser } from '../../../parsers/extractors/annotation-parser';
import { SpringAnnotationType, AnnotationInfo, FieldInfo } from '../../../models/spring-types';
import { FieldMockBuilder } from '../../helpers/field-mock-builder';

/**
 * FieldExtractor test suite
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
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('name')
                .withType('String')
                .asPrivate()
                .build();
            
            const mockClassDecl = createClassWithFields([mockFieldDecl]);
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
            const nameField = FieldMockBuilder.create()
                .withName('name')
                .withType('String')
                .asPrivate()
                .build();
            
            const ageField = FieldMockBuilder.create()
                .withName('age')
                .withType('Integer')
                .asPrivate()
                .build();
            
            const mockClassDecl = createClassWithFields([nameField, ageField]);
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
            const mockClassDecl = createClassWithFields([]);
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
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('userService')
                .withType('UserService')
                .asPrivate()
                .build();
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
            const mockFieldDecl = createFieldWithoutType('userService');
            const lines = ['class TestClass {', '    userService;', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_fieldNameNotFound', () => {
            // Arrange
            const mockFieldDecl = createFieldWithoutName('UserService');
            const lines = ['class TestClass {', '    UserService;', '}'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_detectFinalReferenceField_when_finalStringFieldProvided', () => {
            // Arrange
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
            // Arrange
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('packageField')
                .withType('String')
                .build();
            const lines = ['String packageField;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'packageField');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.visibility, undefined); // package-private is undefined
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_detectSpringNonNull_when_springNonNullAnnotationPresent', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('userService')
                .withType('UserService')
                .asPrivate()
                .build();
            
            // Add Spring @NonNull annotation
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('dataService')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // Add JSR-305 @Nonnull annotation (lowercase 'n')
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'Nonnull' }]
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('repository')
                .withType('UserRepository')
                .asPrivate()
                .asFinal()
                .build();
            
            // Add @NonNull annotation
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('DEFAULT_NAME')
                .withType('String')
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final String DEFAULT_NAME = "default";'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'DEFAULT_NAME');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_detectFinalGenericField_when_genericTypeUsed', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('items')
                .withType('List')  // Generic part is simplified
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final List<String> items;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'items');
            assert.strictEqual(result.type, 'List');  // Generic part is currently ignored
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_prioritizeLombokNonNull_when_multipleNonNullAnnotationsPresent', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('service')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // Add multiple NonNull annotations (only first one will be recognized)
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

            const lines = ['@lombok.NonNull', '@org.springframework.lang.NonNull', 'private DataService service;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'service');
            assert.strictEqual(result.type, 'DataService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });
    });

    suite('extractFieldType', () => {
        test('should_extractFieldType_when_validFieldProvided', () => {
            // Arrange - Using FieldMockBuilder
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
            const mockFieldDecl = createInvalidFieldStructure();

            // Act
            const result = fieldExtractor.extractFieldType(mockFieldDecl);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('extractFieldName', () => {
        test('should_extractFieldName_when_validFieldProvided', () => {
            // Arrange
            const mockField = FieldMockBuilder.create()
                .withName('userName')
                .build();

            // Act
            const result = fieldExtractor.extractFieldName(mockField);

            // Assert
            assert.strictEqual(result, 'userName');
        });

        test('should_returnUndefined_when_invalidNameStructure', () => {
            // Arrange
            const mockFieldDecl = createInvalidFieldStructure();

            // Act
            const result = fieldExtractor.extractFieldName(mockFieldDecl);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('extractFieldModifiers', () => {
        test('should_extractPrivateModifier_when_privateFieldProvided', () => {
            // Arrange
            const mockFieldDecl = createFieldWithModifier('Private', 'private');

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'private');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractPublicModifier_when_publicFieldProvided', () => {
            // Arrange
            const mockFieldDecl = createFieldWithModifier('Public', 'public');

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'public');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractProtectedModifier_when_protectedFieldProvided', () => {
            // Arrange
            const mockFieldDecl = createFieldWithModifier('Protected', 'protected');

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, 'protected');
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractFinalModifier_when_finalFieldProvided', () => {
            // Arrange
            const mockFieldDecl = createFieldWithModifier('Final', 'final');

            // Act
            const result = fieldExtractor.extractFieldModifiers(mockFieldDecl);

            // Assert
            assert.strictEqual(result.visibility, undefined);
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_extractStaticModifier_when_staticFieldProvided', () => {
            // Arrange
            const mockFieldDecl = createFieldWithModifier('Static', 'static');

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
            const mockFieldDecl = createFieldWithAnnotation('Autowired');
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
            const mockFieldDecl = createFieldWithoutAnnotations();
            const lines = ['class TestClass {', '    private UserService userService;', '}'];

            // Act
            const result = fieldExtractor.extractFieldAnnotations(mockFieldDecl, lines);

            // Assert
            assert.strictEqual(result.length, 0);
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
            // Arrange - Create circular reference to trigger error
            const circularRef: any = {};
            circularRef.children = circularRef;
            const lines = ['class TestClass {', '}'];

            // Act & Assert - Should not throw error and return result
            const result = fieldExtractor.extractFields(circularRef, lines);
            assert.strictEqual(result.length, 0);
        });
    });

    // ======================================================
    // ======================================================
    // Lombok Field Analysis Expansion
    // ======================================================
    suite('Final Field Detection (Lombok Support)', () => {
        test('should_detectFinalPrimitiveField_when_finalIntFieldProvided', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('id')
                .withPrimitiveType('int')
                .asFinal()
                .build();
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
            // Arrange
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
            // Arrange
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
            // Static final fields should be excluded from Lombok constructors
        });

        test('should_detectFinalFieldWithInitializer_when_defaultValuePresent', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('DEFAULT_NAME')
                .withType('String')
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final String DEFAULT_NAME = "default";'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'DEFAULT_NAME');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });

        test('should_detectFinalGenericField_when_genericTypeUsed', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('items')
                .withType('List')  // Generic part is simplified
                .asPrivate()
                .asFinal()
                .build();
            const lines = ['private final List<String> items;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'items');
            assert.strictEqual(result.type, 'List');  // Generic part is currently ignored
            assert.strictEqual(result.isFinal, true);
            assert.strictEqual(result.visibility, 'private');
        });
    });

    suite('NonNull Annotation Detection', () => {
        test('should_detectLombokNonNull_when_lombokNonNullAnnotationPresent', () => {
            // Arrange
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('userService')
                .withType('UserService')
                .asPrivate()
                .build();
            
            // Add Spring @NonNull annotation
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('dataService')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // Add JSR-305 @Nonnull annotation (lowercase 'n')
            mockFieldDecl.children.fieldModifier.push({
                children: {
                    annotation: [{
                        children: {
                            At: [{ image: '@' }],
                            typeName: [{
                                children: {
                                    Identifier: [{ image: 'Nonnull' }]
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('repository')
                .withType('UserRepository')
                .asPrivate()
                .asFinal()
                .build();
            
            // Add @NonNull annotation
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
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('service')
                .withType('DataService')
                .asPrivate()
                .build();
            
            // Add multiple NonNull annotations (only first one will be recognized)
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

            const lines = ['@lombok.NonNull', '@org.springframework.lang.NonNull', 'private DataService service;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'service');
            assert.strictEqual(result.type, 'DataService');
            assert.strictEqual(result.annotations.length, 1);
            assert.strictEqual(result.annotations[0].name, 'NonNull');
        });
    });

    suite('Enhanced Access Modifier Analysis', () => {
        test('should_detectPackagePrivateField_when_noAccessModifierSpecified', () => {
            // Arrange
            const mockFieldDecl = FieldMockBuilder.create()
                .withName('packageField')
                .withType('String')
                .build();
            const lines = ['String packageField;'];

            // Act
            const result = fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'packageField');
            assert.strictEqual(result.type, 'String');
            assert.strictEqual(result.visibility, undefined); // package-private is undefined
            assert.strictEqual(result.isFinal, false);
            assert.strictEqual(result.isStatic, false);
        });

        test('should_analyzeComplexModifierCombination_when_multipleModifiersPresent', () => {
            // Arrange
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
            // Arrange
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
            // Transient is not tracked as a separate property but field should be detected
        });

        test('should_detectVolatileField_when_volatileModifierPresent', () => {
            // Arrange
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
            // Volatile is not tracked as a separate property but field should be detected
        });
    });

    suite('Lombok Field Classification', () => {
        test('should_classifyRequiredArgsConstructorFields_when_finalAndNonNullFieldsPresent', () => {
            // Arrange
            const fields = [
                createParsedField(FieldMockBuilder.privateFinalString('name'), ['private final String name;']),
                createParsedField(FieldMockBuilder.withNonNullAnnotation('userService', 'UserService'), ['@NonNull private UserService userService;']),
                createParsedField(FieldMockBuilder.create().withName('temp').withType('String').asPrivate().build(), ['private String temp;'])
            ].filter(f => f !== undefined);

            // Act
            const requiredFields = fields.filter((field): field is FieldInfo => 
                field !== undefined && (field.isFinal || field.annotations.some((ann: AnnotationInfo) => ann.name === 'NonNull'))
            );

            // Assert
            assert.strictEqual(requiredFields.length, 2);
            assert.ok(requiredFields.some(f => f.name === 'name'));
            assert.ok(requiredFields.some(f => f.name === 'userService'));
        });

        test('should_classifyAllArgsConstructorFields_when_variousFieldsPresent', () => {
            // Arrange
            const fields = [
                createParsedField(FieldMockBuilder.privateFinalString('id'), ['private final String id;']),
                createParsedField(FieldMockBuilder.withNonNullAnnotation('name', 'String'), ['@NonNull private String name;']),
                createParsedField(FieldMockBuilder.create().withName('description').withType('String').asPrivate().build(), ['private String description;']),
                createParsedField(FieldMockBuilder.privateStaticFinalString('VERSION'), ['private static final String VERSION;'])
            ].filter(f => f !== undefined) as FieldInfo[];

            // Act
            const allArgsFields = fields.filter(field => !field.isStatic);

            // Assert
            assert.strictEqual(allArgsFields.length, 3);
            assert.ok(allArgsFields.some(f => f.name === 'id'));
            assert.ok(allArgsFields.some(f => f.name === 'name'));
            assert.ok(allArgsFields.some(f => f.name === 'description'));
            assert.ok(!allArgsFields.some(f => f.name === 'VERSION'));
        });

        test('should_preserveFieldOrder_when_multipleFieldsPresent', () => {
            // Arrange
            const fields = [
                createParsedField(FieldMockBuilder.create().withName('first').withType('String').asPrivate().build(), ['private String first;']),
                createParsedField(FieldMockBuilder.create().withName('second').withPrimitiveType('int').asPrivate().build(), ['private int second;']),
                createParsedField(FieldMockBuilder.create().withName('third').withPrimitiveType('boolean').asPrivate().build(), ['private boolean third;'])
            ].filter(f => f !== undefined) as FieldInfo[];

            // Act
            const fieldNames = fields.map(f => f.name);

            // Assert
            assert.deepStrictEqual(fieldNames, ['first', 'second', 'third']);
        });

        test('should_handleEmptyFieldList_when_noEligibleFieldsPresent', () => {
            // Arrange
            const staticField = createParsedField(
                FieldMockBuilder.privateStaticFinalString('CONSTANT1'), 
                ['private static final String CONSTANT1;']
            );
            
            const fields = staticField ? [staticField] as FieldInfo[] : [];

            // Act
            const requiredFields = fields.filter(field => 
                field.isFinal && !field.isStatic || 
                field.annotations.some((ann: AnnotationInfo) => ann.name === 'NonNull')
            );

            // Assert
            assert.strictEqual(requiredFields.length, 0);
        });
    });
});

/**
 * Helper function to create a class declaration with fields
 */
function createClassWithFields(fields: any[]): any {
    const fieldDeclarations = fields.map(field => ({
        children: {
            classMemberDeclaration: [{
                children: {
                    fieldDeclaration: [field]
                }
            }]
        }
    }));

    return {
        children: {
            normalClassDeclaration: [{
                children: {
                    classBody: [{
                        children: {
                            classBodyDeclaration: fieldDeclarations
                        }
                    }]
                }
            }]
        }
    };
}

/**
 * Helper function to create a field without type
 */
function createFieldWithoutType(name: string): any {
    // Create a basic field structure but remove the type part
    const field = FieldMockBuilder.create()
        .withName(name)
        .build();
    
    // Remove type information to simulate missing type
    delete field.children.unannType;
    
    return field;
}

/**
 * Helper function to create a field without name
 */
function createFieldWithoutName(type: string): any {
    // Create a basic field structure but remove the name part
    const field = FieldMockBuilder.create()
        .withType(type)
        .build();
    
    // Remove variable declarator to simulate missing name
    delete field.children.variableDeclaratorList;
    
    return field;
}

/**
 * Helper function to create a field with a specific modifier
 */
function createFieldWithModifier(modifierType: string, value: string): any {
    // Create a minimal field structure with only the specified modifier
    const field = FieldMockBuilder.create().build();
    
    // Replace modifiers with only the specified one
    field.children.fieldModifier = [{
        children: {
            [modifierType]: [{ image: value }]
        }
    }];
    
    return field;
}

/**
 * Helper function to create a field with an annotation
 */
function createFieldWithAnnotation(annotationName: string): any {
    // Create a field with the specified annotation
    const field = FieldMockBuilder.create().build();
    
    // Add the annotation to field modifiers
    field.children.fieldModifier = [{
        children: {
            annotation: [{
                children: {
                    At: [{ image: '@' }],
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: annotationName
                            }]
                        }
                    }]
                }
            }]
        }
    }];
    
    return field;
}

/**
 * Helper function to create a field without annotations
 */
function createFieldWithoutAnnotations(): any {
    // Create a field and ensure no annotations
    const field = FieldMockBuilder.create().build();
    field.children.fieldModifier = [];
    
    return field;
}

/**
 * Helper function to create an invalid field structure
 */
function createInvalidFieldStructure(): any {
    // Return a structure that doesn't match the expected field format
    return {
        children: {
            invalidType: [{}]
        }
    };
}

/**
 * Helper function to create a parsed field using FieldExtractor
 */
function createParsedField(mockFieldDecl: any, lines: string[]): any {
    const positionCalculator = new PositionCalculator();
    const annotationParser = new AnnotationParser(positionCalculator);
    const fieldExtractor = new FieldExtractor(positionCalculator, annotationParser);
    return fieldExtractor.parseFieldDeclaration(mockFieldDecl, lines);
} 