import * as assert from 'assert';
import { AnnotationParser } from '../../../parsers/extractors/annotation-parser';
import { SpringAnnotationType, AnnotationNode } from '../../../models/spring-types';

suite('AnnotationParser', () => {
    let parser: AnnotationParser;

    setup(() => {
        parser = new AnnotationParser();
    });

    suite('parseAnnotation', () => {
        test('should_parseServiceAnnotation_when_validServiceAnnotationProvided', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Service'
                            }]
                        }
                    }]
                }
            };
            const lines = ['@Service', 'public class UserService {'];

            // Act
            const result = parser.parseAnnotation(mockAnnotation, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'Service');
            assert.strictEqual(result.type, SpringAnnotationType.SERVICE);
            assert.strictEqual(result.parameters?.size, 0);
        });

        test('should_parseAutowiredAnnotation_when_autowiredAnnotationProvided', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Autowired'
                            }]
                        }
                    }]
                }
            };
            const lines = ['@Autowired', 'private UserService userService;'];

            // Act
            const result = parser.parseAnnotation(mockAnnotation, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'Autowired');
            assert.strictEqual(result.type, SpringAnnotationType.AUTOWIRED);
        });

        test('should_parseComponentAnnotation_when_componentAnnotationProvided', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Component'
                            }]
                        }
                    }]
                }
            };
            const lines = ['@Component'];

            // Act
            const result = parser.parseAnnotation(mockAnnotation, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'Component');
            assert.strictEqual(result.type, SpringAnnotationType.COMPONENT);
        });

        test('should_returnUndefined_when_nonSpringAnnotationProvided', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Override'  // Non-Spring annotation
                            }]
                        }
                    }]
                }
            };
            const lines = ['@Override'];

            // Act
            const result = parser.parseAnnotation(mockAnnotation, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_invalidAnnotationStructure', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    // Missing typeName
                }
            };
            const lines = ['invalid'];

            // Act
            const result = parser.parseAnnotation(mockAnnotation, lines);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_parseAllSpringAnnotationTypes_when_validAnnotationsProvided', () => {
            // Arrange
            const annotationTypes = [
                { name: 'Component', type: SpringAnnotationType.COMPONENT },
                { name: 'Service', type: SpringAnnotationType.SERVICE },
                { name: 'Repository', type: SpringAnnotationType.REPOSITORY },
                { name: 'Controller', type: SpringAnnotationType.CONTROLLER },
                { name: 'RestController', type: SpringAnnotationType.REST_CONTROLLER },
                { name: 'Configuration', type: SpringAnnotationType.CONFIGURATION },
                { name: 'Bean', type: SpringAnnotationType.BEAN },
                { name: 'Autowired', type: SpringAnnotationType.AUTOWIRED }
            ];

            // Act & Assert
            for (const annotationType of annotationTypes) {
                const mockAnnotation = {
                    children: {
                        typeName: [{
                            children: {
                                Identifier: [{
                                    image: annotationType.name
                                }]
                            }
                        }]
                    }
                };

                const result = parser.parseAnnotation(mockAnnotation, []);
                
                assert.ok(result, `Should parse ${annotationType.name} annotation`);
                assert.strictEqual(result.name, annotationType.name);
                assert.strictEqual(result.type, annotationType.type);
            }
        });
    });

    suite('extractAnnotationParameters', () => {
        test('should_extractSingleValue_when_annotationHasStringLiteral', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    LParen: [{}],
                    StringLiteral: [{
                        image: '"userService"'
                    }]
                }
            };

            // Act
            const result = parser.extractAnnotationParameters(mockAnnotation as any);

            // Assert
            assert.strictEqual(result.size, 1);
            assert.strictEqual(result.get('value'), 'userService');
        });

        test('should_extractParametersFromStringLiterals_when_complexStructure', () => {
            // Arrange
            const mockAnnotation: AnnotationNode = {
                children: {
                    StringLiteral: [{
                        image: '"foundValue"'
                    }]
                }
            };

            // Act
            const result = parser.extractAnnotationParameters(mockAnnotation);

            // Assert
            assert.strictEqual(result.size, 1);
            assert.strictEqual(result.get('value'), 'foundValue');
        });

        test('should_returnEmptyMap_when_noParametersFound', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{}]
                }
            };

            // Act
            const result = parser.extractAnnotationParameters(mockAnnotation);

            // Assert
            assert.strictEqual(result.size, 0);
        });

        test('should_handleQuotedStrings_when_singleAndDoubleQuotes', () => {
            // Arrange
            const doubleQuoteAnnotation: AnnotationNode = {
                children: {
                    LParen: [{
                        image: '('
                    }],
                    StringLiteral: [{
                        image: '"doubleQuoted"'
                    }]
                }
            };

            const singleQuoteAnnotation: AnnotationNode = {
                children: {
                    LParen: [{
                        image: '('
                    }],
                    StringLiteral: [{
                        image: "'singleQuoted'"
                    }]
                }
            };

            // Act
            const doubleQuoteResult = parser.extractAnnotationParameters(doubleQuoteAnnotation);
            const singleQuoteResult = parser.extractAnnotationParameters(singleQuoteAnnotation);

            // Assert
            assert.strictEqual(doubleQuoteResult.get('value'), 'doubleQuoted');
            assert.strictEqual(singleQuoteResult.get('value'), 'singleQuoted');
        });

        test('should_extractElementValuePairList_when_complexParametersProvided', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    elementValuePairList: [{
                        children: {
                            elementValuePair: [
                                {
                                    children: {
                                        Identifier: [{ image: 'name' }],
                                        elementValue: [{
                                            children: {
                                                conditionalExpression: [{
                                                    children: {
                                                        StringLiteral: [{ image: '"testName"' }]
                                                    }
                                                }]
                                            }
                                        }]
                                    }
                                },
                                {
                                    children: {
                                        Identifier: [{ image: 'value' }],
                                        elementValue: [{
                                            children: {
                                                conditionalExpression: [{
                                                    children: {
                                                        StringLiteral: [{ image: '"testValue"' }]
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
            };

            // Act
            const result = parser.extractAnnotationParameters(mockAnnotation);

            // Assert
            assert.strictEqual(result.size, 2);
            assert.strictEqual(result.get('name'), 'testName');
            assert.strictEqual(result.get('value'), 'testValue');
        });
    });

    suite('isAnnotationType', () => {
        test('should_returnTrue_when_annotationMatchesTargetType', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Service'
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = parser.isAnnotationType(mockAnnotation, SpringAnnotationType.SERVICE);

            // Assert
            assert.strictEqual(result, true);
        });

        test('should_returnFalse_when_annotationDoesNotMatchTargetType', () => {
            // Arrange
            const mockAnnotation = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Service'
                            }]
                        }
                    }]
                }
            };

            // Act
            const result = parser.isAnnotationType(mockAnnotation, SpringAnnotationType.REPOSITORY);

            // Assert
            assert.strictEqual(result, false);
        });

        test('should_returnFalse_when_invalidAnnotation', () => {
            // Arrange
            const mockAnnotation = {
                children: {}
            };

            // Act
            const result = parser.isAnnotationType(mockAnnotation, SpringAnnotationType.SERVICE);

            // Assert
            assert.strictEqual(result, false);
        });
    });

    suite('findAnnotationByType', () => {
        test('should_findAnnotation_when_targetTypeExists', () => {
            // Arrange
            const annotations = [
                {
                    name: 'Component',
                    type: SpringAnnotationType.COMPONENT,
                    line: 0,
                    column: 0,
                    parameters: new Map()
                },
                {
                    name: 'Service',
                    type: SpringAnnotationType.SERVICE,
                    line: 1,
                    column: 0,
                    parameters: new Map()
                }
            ];

            // Act
            const result = parser.findAnnotationByType(annotations, SpringAnnotationType.SERVICE);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'Service');
            assert.strictEqual(result.type, SpringAnnotationType.SERVICE);
        });

        test('should_returnUndefined_when_targetTypeNotFound', () => {
            // Arrange
            const annotations = [
                {
                    name: 'Component',
                    type: SpringAnnotationType.COMPONENT,
                    line: 0,
                    column: 0,
                    parameters: new Map()
                }
            ];

            // Act
            const result = parser.findAnnotationByType(annotations, SpringAnnotationType.SERVICE);

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_emptyAnnotationArray', () => {
            // Arrange
            const annotations: any[] = [];

            // Act
            const result = parser.findAnnotationByType(annotations, SpringAnnotationType.SERVICE);

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('getAnnotationParameter', () => {
        test('should_returnParameterValue_when_parameterExists', () => {
            // Arrange
            const parameters = new Map<string, string>();
            parameters.set('value', 'testValue');
            parameters.set('name', 'testName');

            const annotation = {
                name: 'Service',
                type: SpringAnnotationType.SERVICE,
                line: 0,
                column: 0,
                parameters
            };

            // Act
            const result = parser.getAnnotationParameter(annotation, 'value');

            // Assert
            assert.strictEqual(result, 'testValue');
        });

        test('should_returnUndefined_when_parameterNotExists', () => {
            // Arrange
            const parameters = new Map<string, string>();
            parameters.set('value', 'testValue');

            const annotation = {
                name: 'Service',
                type: SpringAnnotationType.SERVICE,
                line: 0,
                column: 0,
                parameters
            };

            // Act
            const result = parser.getAnnotationParameter(annotation, 'nonExistent');

            // Assert
            assert.strictEqual(result, undefined);
        });

        test('should_returnUndefined_when_emptyParameters', () => {
            // Arrange
            const annotation = {
                name: 'Service',
                type: SpringAnnotationType.SERVICE,
                line: 0,
                column: 0,
                parameters: new Map<string, string>()
            };

            // Act
            const result = parser.getAnnotationParameter(annotation, 'value');

            // Assert
            assert.strictEqual(result, undefined);
        });
    });

    suite('Error Handling', () => {
        test('should_handleNullAnnotation_when_nullProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const result = parser.parseAnnotation(null as any, []);
                assert.strictEqual(result, undefined);
            });
        });

        test('should_handleUndefinedAnnotation_when_undefinedProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const result = parser.parseAnnotation(undefined as any, []);
                assert.strictEqual(result, undefined);
            });
        });

        test('should_handleMalformedAnnotation_when_invalidStructureProvided', () => {
            // Arrange - Actually malformed structure (bypass type check with as any)
            const malformedAnnotation = {
                children: {
                    // typeName이 없어서 실제로 malformed
                    invalidProperty: 'invalid'
                }
            } as any;

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = parser.parseAnnotation(malformedAnnotation, []);
                assert.strictEqual(result, undefined);
            });
        });

        test('should_handleCircularReferences_when_nodeReferencesItself', () => {
            // Arrange
            const circularAnnotation: any = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Service'
                            }]
                        }
                    }]
                }
            };
            circularAnnotation.children.self = [circularAnnotation];

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = parser.extractAnnotationParameters(circularAnnotation);
                assert.ok(result instanceof Map);
            });
        });

        test('should_logErrorButNotThrow_when_parameterExtractionFails', () => {
            // Arrange
            const problematicAnnotation: AnnotationNode = {
                children: {
                    elementValuePairList: [{
                        children: {
                            elementValuePair: [
                                {
                                    children: {
                                        Identifier: [], // Empty array instead of null
                                        elementValue: [{
                                            children: {}
                                        }]
                                    }
                                }
                            ]
                        }
                    }]
                }
            };

            // Act & Assert
            assert.doesNotThrow(() => {
                const result = parser.extractAnnotationParameters(problematicAnnotation);
                assert.ok(result instanceof Map);
            });
        });
    });

    suite('Integration Tests', () => {
        test('should_parseCompleteAnnotation_when_serviceWithParametersProvided', () => {
            // Arrange
            const mockAnnotation: AnnotationNode = {
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: 'Service'
                            }]
                        }
                    }],
                    LParen: [{
                        image: '('
                    }],
                    StringLiteral: [{
                        image: '"userService"'
                    }]
                }
            };
            const lines = ['@Service("userService")', 'public class UserService {'];

            // Act
            const result = parser.parseAnnotation(mockAnnotation, lines);

            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'Service');
            assert.strictEqual(result.type, SpringAnnotationType.SERVICE);
            assert.strictEqual(result.parameters?.size, 1);
            assert.strictEqual(result.parameters?.get('value'), 'userService');
        });

        test('should_processMultipleAnnotations_when_arrayOfAnnotationsProvided', () => {
            // Arrange
            const annotationData = [
                { name: 'Component', type: SpringAnnotationType.COMPONENT },
                { name: 'Service', type: SpringAnnotationType.SERVICE },
                { name: 'Repository', type: SpringAnnotationType.REPOSITORY }
            ];

            const mockAnnotations = annotationData.map(data => ({
                children: {
                    typeName: [{
                        children: {
                            Identifier: [{
                                image: data.name
                            }]
                        }
                    }]
                }
            }));

            // Act
            const results = mockAnnotations.map(annotation => 
                parser.parseAnnotation(annotation, [])
            );

            // Assert
            assert.strictEqual(results.length, 3);
            results.forEach((result, index) => {
                assert.ok(result);
                assert.strictEqual(result.name, annotationData[index].name);
                assert.strictEqual(result.type, annotationData[index].type);
            });
        });
    });
}); 