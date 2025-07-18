import * as assert from 'assert';
import * as vscode from 'vscode';
import { ClassExtractor } from '../../../parsers/extractors/class-extractor';
import { CSTNavigator } from '../../../parsers/core/cst-navigator';
import { PositionCalculator } from '../../../parsers/core/position-calculator';
import { AnnotationParser } from '../../../parsers/extractors/annotation-parser';
import { FieldExtractor } from '../../../parsers/extractors/field-extractor';
import { SpringAnnotationType, CompilationUnitNode } from '../../../models/spring-types';

/**
 * ClassExtractor 테스트 스위트
 */
suite('ClassExtractor', () => {
    let classExtractor: ClassExtractor;
    let cstNavigator: CSTNavigator;
    let positionCalculator: PositionCalculator;
    let annotationParser: AnnotationParser;
    let fieldExtractor: FieldExtractor;

    setup(() => {
        cstNavigator = new CSTNavigator();
        positionCalculator = new PositionCalculator();
        annotationParser = new AnnotationParser(positionCalculator);
        fieldExtractor = new FieldExtractor(positionCalculator, annotationParser, cstNavigator);
        classExtractor = new ClassExtractor(cstNavigator, positionCalculator, annotationParser, fieldExtractor);
    });

    suite('extractClasses', () => {
        test('should_extractSingleClass_when_validCSTProvided', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            typeDeclaration: [{
                                children: {
                                    classDeclaration: [{
                                        children: {
                                            normalClassDeclaration: [{
                                                children: {
                                                    typeIdentifier: [{
                                                        children: {
                                                            Identifier: [{
                                                                image: 'TestClass'
                                                            }]
                                                        }
                                                    }],
                                                    classBody: [{
                                                        children: {
                                                            classBodyDeclaration: []
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
            const fileUri = vscode.Uri.file('/test/TestClass.java');
            const content = 'public class TestClass {}';

            // Mock CST Navigator methods
            cstNavigator.extractPackageName = () => 'com.example';
            cstNavigator.extractImports = () => ['java.util.List'];
            cstNavigator.findClassDeclarations = () => [mockCST.children.ordinaryCompilationUnit[0].children.typeDeclaration[0].children.classDeclaration[0]];

            // Act
            const result = classExtractor.extractClasses(mockCST, fileUri, content);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'TestClass');
            assert.strictEqual(result[0].packageName, 'com.example');
            assert.strictEqual(result[0].fullyQualifiedName, 'com.example.TestClass');
        });

        test('should_returnEmptyArray_when_noClassesFound', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: []
                }
            } as CompilationUnitNode;
            const fileUri = vscode.Uri.file('/test/Empty.java');
            const content = '// Empty file';

            // Mock CST Navigator methods
            cstNavigator.extractPackageName = () => undefined;
            cstNavigator.extractImports = () => [];
            cstNavigator.findClassDeclarations = () => [];

            // Act
            const result = classExtractor.extractClasses(mockCST, fileUri, content);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('parseClassDeclaration', () => {
        test('should_parseClassDeclaration_when_validClassProvided', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    normalClassDeclaration: [{
                        children: {
                            typeIdentifier: [{
                                children: {
                                    Identifier: [{
                                        image: 'UserService'
                                    }]
                                }
                            }],
                            classBody: [{
                                children: {
                                    classBodyDeclaration: []
                                }
                            }]
                        }
                    }],
                    classModifier: []
                }
            };
            const fileUri = vscode.Uri.file('/test/UserService.java');
            const content = 'public class UserService {}';
            const lines = content.split('\n');

            // Act
            const result = classExtractor.parseClassDeclaration(mockClassDecl, fileUri, lines, 'com.example', []);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'UserService');
            assert.strictEqual(result.packageName, 'com.example');
        });

        test('should_returnUndefined_when_classNameNotFound', () => {
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
            const fileUri = vscode.Uri.file('/test/Invalid.java');
            const content = 'public class {}';
            const lines = content.split('\n');

            // Act
            const result = classExtractor.parseClassDeclaration(mockClassDecl, fileUri, lines, undefined, []);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('extractClassAnnotations', () => {
        test('should_extractServiceAnnotation_when_serviceClassProvided', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    classModifier: [{
                        children: {
                            annotation: [{
                                children: {
                                    At: [{ image: '@' }],
                                    typeName: [{
                                        children: {
                                            Identifier: [{
                                                image: 'Service'
                                            }]
                                        }
                                    }]
                                }
                            }]
                        }
                    }]
                }
            };
            const lines = ['@Service', 'public class UserService {}'];

            // Act
            const result = classExtractor.extractClassAnnotations(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'Service');
            assert.strictEqual(result[0].type, SpringAnnotationType.SERVICE);
        });

        test('should_returnEmptyArray_when_noAnnotationsProvided', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    classModifier: []
                }
            };
            const lines = ['public class UserService {}'];

            // Act
            const result = classExtractor.extractClassAnnotations(mockClassDecl, lines);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('extractImplementedInterfaces', () => {
        test('should_extractInterface_when_classImplementsInterface', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    normalClassDeclaration: [{
                        children: {
                            superinterfaces: [{
                                children: {
                                    interfaceTypeList: [{
                                        children: {
                                            interfaceType: [{
                                                children: {
                                                    classType: [{
                                                        children: {
                                                            Identifier: [{
                                                                image: 'UserRepository'
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
                    }]
                }
            };

            // Act
            const result = classExtractor.extractImplementedInterfaces(mockClassDecl);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'UserRepository');
        });

        test('should_returnEmptyArray_when_noInterfacesImplemented', () => {
            // Arrange
            const mockClassDecl = {
                children: {
                    normalClassDeclaration: [{
                        children: {}
                    }]
                }
            };

            // Act
            const result = classExtractor.extractImplementedInterfaces(mockClassDecl);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('findInterfacesRecursively', () => {
        test('should_findInterfaces_when_implementsKeywordPresent', () => {
            // Arrange
            const mockNode = {
                children: {
                    Implements: [{ image: 'implements' }],
                    Identifier: [
                        { image: 'implements' },
                        { image: 'UserRepository' },
                        { image: 'Serializable' }
                    ]
                }
            };

            // Act
            const result = classExtractor.findInterfacesRecursively(mockNode);

            // Assert
            assert.ok(result.length >= 1);
            assert.ok(result.includes('UserRepository') || result.includes('Serializable'));
        });

        test('should_returnEmptyArray_when_noImplementsKeyword', () => {
            // Arrange
            const mockNode = {
                children: {
                    someOtherNode: []
                }
            };

            // Act
            const result = classExtractor.findInterfacesRecursively(mockNode);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('collectIdentifiersAfterImplements', () => {
        test('should_collectIdentifiers_when_validNodeProvided', () => {
            // Arrange
            const mockNode = {
                children: {
                    Identifier: [
                        { image: 'implements' },
                        { image: 'UserRepository' },
                        { image: 'class' },
                        { image: 'Serializable' }
                    ]
                }
            };

            // Act
            const result = classExtractor.collectIdentifiersAfterImplements(mockNode);

            // Assert
            assert.ok(result.length >= 1);
            // Java 키워드들은 필터링되어야 함
            assert.ok(!result.includes('implements'));
            assert.ok(!result.includes('class'));
        });

        test('should_returnEmptyArray_when_noValidIdentifiers', () => {
            // Arrange
            const mockNode = {
                children: {
                    Identifier: [
                        { image: 'implements' },
                        { image: 'class' },
                        { image: 'public' }
                    ]
                }
            };

            // Act
            const result = classExtractor.collectIdentifiersAfterImplements(mockNode);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });

    suite('collectAllIdentifiers', () => {
        test('should_collectAllIdentifiers_when_nodeHasIdentifiers', () => {
            // Arrange
            const identifiers: string[] = [];
            const mockNode = {
                image: 'TestClass',
                children: {
                    child1: [
                        { image: 'UserService' },
                        { image: 'Repository' }
                    ]
                }
            };

            // Act
            classExtractor.collectAllIdentifiers(mockNode, identifiers);

            // Assert
            assert.ok(identifiers.includes('TestClass'));
            assert.ok(identifiers.includes('UserService'));
            assert.ok(identifiers.includes('Repository'));
        });

        test('should_handleNullNode_when_nullProvided', () => {
            // Arrange
            const identifiers: string[] = [];

            // Act & Assert - Should not throw
            classExtractor.collectAllIdentifiers(null as any, identifiers);
            assert.strictEqual(identifiers.length, 0);
        });
    });

    suite('extractInterfaceName', () => {
        test('should_extractInterfaceName_when_validInterfaceTypeProvided', () => {
            // Arrange
            const mockInterfaceType = {
                children: {
                    classType: [{
                        children: {
                            Identifier: [{
                                image: 'UserRepository'
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = classExtractor.extractInterfaceName(mockInterfaceType);

            // Assert
            assert.strictEqual(result, 'UserRepository');
        });

        test('should_returnUndefined_when_invalidInterfaceTypeProvided', () => {
            // Arrange
            const mockInterfaceType = {
                children: {
                    invalidStructure: {}
                }
            } as any;

            // Act
            const result = classExtractor.extractInterfaceName(mockInterfaceType);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullClassDeclaration_when_nullProvided', () => {
            // Arrange
            const fileUri = vscode.Uri.file('/test/Test.java');
            const content = 'public class Test {}';
            const lines = content.split('\n');

            // Act
            const result = classExtractor.parseClassDeclaration(null as any, fileUri, lines, undefined, []);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleInvalidCST_when_malformedStructureProvided', () => {
            // Arrange
            const mockCST = {
                children: {
                    invalidStructure: 'malformed'
                }
            } as any;
            const fileUri = vscode.Uri.file('/test/Invalid.java');
            const content = 'invalid content';

            // Mock CST Navigator methods to handle errors
            cstNavigator.extractPackageName = () => { throw new Error('Invalid CST'); };
            cstNavigator.extractImports = () => [];
            cstNavigator.findClassDeclarations = () => [];

            // Act
            const result = classExtractor.extractClasses(mockCST, fileUri, content);

            // Assert
            assert.strictEqual(result.length, 0);
        });
    });
}); 