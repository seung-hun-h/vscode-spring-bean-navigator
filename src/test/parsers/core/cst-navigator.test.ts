import * as assert from 'assert';
import { CSTNavigator } from '../../../parsers/core/cst-navigator';
import { CompilationUnitNode } from '../../../models/spring-types';

suite('CSTNavigator', () => {
    let navigator: CSTNavigator;

    setup(() => {
        navigator = new CSTNavigator();
    });

    // 타입 안전한 mock CST 생성 헬퍼
    function createMockCST(content?: any): CompilationUnitNode {
        return {
            children: {
                ordinaryCompilationUnit: [content || {}]
            }
        } as CompilationUnitNode;
    }

    function createEmptyCST(): CompilationUnitNode {
        return {
            children: {
                ordinaryCompilationUnit: [{
                    children: {}
                }]
            }
        } as CompilationUnitNode;
    }

    suite('extractPackageName', () => {
        test('should_extractPackageName_when_validPackageDeclarationProvided', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            packageDeclaration: [{
                                children: {
                                    Identifier: [
                                        { image: 'com' },
                                        { image: 'example' },
                                        { image: 'service' }
                                    ]
                                }
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.extractPackageName(mockCST);

            // Assert
            assert.strictEqual(result, 'com.example.service');
        });

        test('should_returnUndefined_when_noPackageDeclaration', () => {
            // Arrange
            const mockCST = createEmptyCST();

            // Act
            const result = navigator.extractPackageName(mockCST);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_invalidCSTStructure', () => {
            // Arrange
            const mockCST = createMockCST();

            // Act
            const result = navigator.extractPackageName(mockCST);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_handleSinglePackageName_when_simplePackageProvided', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            packageDeclaration: [{
                                children: {
                                    Identifier: [
                                        { image: 'service' }
                                    ]
                                }
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.extractPackageName(mockCST);

            // Assert
            assert.strictEqual(result, 'service');
        });
    });

    suite('extractImports', () => {
        test('should_extractImports_when_validImportDeclarationsProvided', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            importDeclaration: [
                                {
                                    children: {
                                        packageOrTypeName: [{
                                            children: {
                                                Identifier: [
                                                    { image: 'org' },
                                                    { image: 'springframework' },
                                                    { image: 'stereotype' },
                                                    { image: 'Service' }
                                                ]
                                            }
                                        }]
                                    }
                                },
                                {
                                    children: {
                                        packageOrTypeName: [{
                                            children: {
                                                Identifier: [
                                                    { image: 'java' },
                                                    { image: 'util' },
                                                    { image: 'List' }
                                                ]
                                            }
                                        }]
                                    }
                                }
                            ]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.extractImports(mockCST);

            // Assert
            assert.strictEqual(result.length, 2);
            assert.ok(result.includes('org.springframework.stereotype.Service'));
            assert.ok(result.includes('java.util.List'));
        });

        test('should_returnEmptyArray_when_noImportDeclarations', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {}
                    }]
                }
            };

            // Act
            const result = navigator.extractImports(mockCST);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_skipInvalidImports_when_malformedImportDeclarations', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            importDeclaration: [
                                {
                                    children: {
                                        packageOrTypeName: [{
                                            children: {
                                                Identifier: [
                                                    { image: 'valid' },
                                                    { image: 'import' }
                                                ]
                                            }
                                        }]
                                    }
                                },
                                {
                                    // 잘못된 구조
                                    children: {}
                                }
                            ]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.extractImports(mockCST);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], 'valid.import');
        });
    });

    suite('findClassDeclarations', () => {
        test('should_findClassDeclarations_when_validClassDeclarationsProvided', () => {
            // Arrange
            const mockClassDeclaration1 = { type: 'classDeclaration', name: 'UserService' };
            const mockClassDeclaration2 = { type: 'classDeclaration', name: 'UserController' };
            
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            typeDeclaration: [
                                {
                                    children: {
                                        classDeclaration: [mockClassDeclaration1]
                                    }
                                },
                                {
                                    children: {
                                        classDeclaration: [mockClassDeclaration2]
                                    }
                                }
                            ]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.findClassDeclarations(mockCST);

            // Assert
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0], mockClassDeclaration1);
            assert.strictEqual(result[1], mockClassDeclaration2);
        });

        test('should_returnEmptyArray_when_noClassDeclarations', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            typeDeclaration: [
                                {
                                    children: {
                                        // 인터페이스나 다른 타입
                                        interfaceDeclaration: [{}]
                                    }
                                }
                            ]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.findClassDeclarations(mockCST);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_returnEmptyArray_when_noTypeDeclarations', () => {
            // Arrange
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {}
                    }]
                }
            };

            // Act
            const result = navigator.findClassDeclarations(mockCST);

            // Assert
            assert.strictEqual(result.length, 0);
        });

        test('should_handleMixedTypeDeclarations_when_classAndInterfaceProvided', () => {
            // Arrange
            const mockClassDeclaration = { type: 'classDeclaration', name: 'UserService' };
            
            const mockCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            typeDeclaration: [
                                {
                                    children: {
                                        classDeclaration: [mockClassDeclaration]
                                    }
                                },
                                {
                                    children: {
                                        interfaceDeclaration: [{}]
                                    }
                                },
                                {
                                    children: {
                                        enumDeclaration: [{}]
                                    }
                                }
                            ]
                        }
                    }]
                }
            };

            // Act
            const result = navigator.findClassDeclarations(mockCST);

            // Assert
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0], mockClassDeclaration);
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullCST_when_nullProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const packageName = navigator.extractPackageName(null as any);
                const imports = navigator.extractImports(null as any);
                const classDeclarations = navigator.findClassDeclarations(null as any);
                
                assert.strictEqual(packageName, undefined);
                assert.strictEqual(imports.length, 0);
                assert.strictEqual(classDeclarations.length, 0);
            });
        });

        test('should_handleUndefinedCST_when_undefinedProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const packageName = navigator.extractPackageName(undefined as any);
                const imports = navigator.extractImports(undefined as any);
                const classDeclarations = navigator.findClassDeclarations(undefined as any);
                
                assert.strictEqual(packageName, undefined);
                assert.strictEqual(imports.length, 0);
                assert.strictEqual(classDeclarations.length, 0);
            });
        });

        test('should_logErrorsButNotThrow_when_unexpectedErrorOccurs', () => {
            // Arrange - 타입 캐스팅으로 malformed 구조 허용
            const malformedCST = {
                children: {
                    ordinaryCompilationUnit: [{
                        children: {
                            packageDeclaration: [{
                                children: {
                                    Identifier: {
                                        // 배열이어야 하는데 객체로 설정 - TypeError 발생 예상
                                        map: () => { throw new Error('Unexpected error'); }
                                    }
                                }
                            }]
                        }
                    }]
                }
            } as any;

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = navigator.extractPackageName(malformedCST);
                assert.strictEqual(result, undefined);
            });
        });
    });
}); 