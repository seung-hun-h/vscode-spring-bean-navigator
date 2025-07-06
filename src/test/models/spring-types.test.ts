import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
    ConstructorInfo, 
    MethodInfo, 
    ParameterInfo,
    InjectionType,
    SpringAnnotationType,
    AnnotationInfo
} from '../../models/spring-types';

suite('Type Definitions Test Suite', () => {
    
    suite('ConstructorInfo Interface', () => {
        
        test('should_haveCorrectStructure_when_constructorInfoCreated', () => {
            // Arrange
            const mockParameters: ParameterInfo[] = [
                {
                    name: 'userRepository',
                    type: 'UserRepository',
                    position: new vscode.Position(1, 5)
                },
                {
                    name: 'emailService',
                    type: 'EmailService', 
                    position: new vscode.Position(1, 25)
                }
            ];
            
            const constructorInfo: ConstructorInfo = {
                parameters: mockParameters,
                position: new vscode.Position(3, 4),
                range: new vscode.Range(3, 4, 5, 5),
                hasAutowiredAnnotation: false
            };
            
            // Assert
            assert.ok(constructorInfo.parameters, 'parameters property should exist');
            assert.ok(constructorInfo.position, 'position property should exist');
            assert.ok(constructorInfo.range, 'range property should exist');
            assert.strictEqual(typeof constructorInfo.hasAutowiredAnnotation, 'boolean', 'hasAutowiredAnnotation should be boolean');
            
            assert.strictEqual(constructorInfo.parameters.length, 2, 'should have 2 parameters');
            assert.strictEqual(constructorInfo.hasAutowiredAnnotation, false, 'should not have @Autowired annotation');
        });
        
        test('should_handleAutowiredConstructor_when_autowiredAnnotationPresent', () => {
            // Arrange & Act
            const autowiredConstructorInfo: ConstructorInfo = {
                parameters: [
                    {
                        name: 'repository',
                        type: 'Repository',
                        position: new vscode.Position(2, 10)
                    }
                ],
                position: new vscode.Position(4, 4),
                range: new vscode.Range(4, 4, 6, 5),
                hasAutowiredAnnotation: true
            };
            
            // Assert
            assert.strictEqual(autowiredConstructorInfo.hasAutowiredAnnotation, true, 'should have @Autowired annotation');
            assert.strictEqual(autowiredConstructorInfo.parameters.length, 1, 'should have 1 parameter');
        });
        
        test('should_handleEmptyParameters_when_noParameterConstructor', () => {
            // Arrange & Act
            const emptyConstructorInfo: ConstructorInfo = {
                parameters: [],
                position: new vscode.Position(1, 4),
                range: new vscode.Range(1, 4, 1, 20),
                hasAutowiredAnnotation: false
            };
            
            // Assert
            assert.strictEqual(emptyConstructorInfo.parameters.length, 0, 'should have no parameters');
            assert.strictEqual(emptyConstructorInfo.hasAutowiredAnnotation, false, 'should not have @Autowired annotation');
        });
    });
    
    suite('MethodInfo Interface', () => {
        
        test('should_haveCorrectStructure_when_methodInfoCreated', () => {
            // Arrange
            const mockAnnotations: AnnotationInfo[] = [
                {
                    name: 'Autowired',
                    type: SpringAnnotationType.AUTOWIRED,
                    line: 2,
                    column: 4
                }
            ];
            
            const methodInfo: MethodInfo = {
                name: 'setUserService',
                parameters: [
                    {
                        name: 'userService',
                        type: 'UserService',
                        position: new vscode.Position(3, 25)
                    }
                ],
                position: new vscode.Position(3, 4),
                range: new vscode.Range(3, 4, 5, 5),
                annotations: mockAnnotations,
                isSetterMethod: true
            };
            
            // Assert
            assert.ok(methodInfo.name, 'name property should exist');
            assert.ok(methodInfo.parameters, 'parameters property should exist');
            assert.ok(methodInfo.position, 'position property should exist');
            assert.ok(methodInfo.range, 'range property should exist');
            assert.ok(methodInfo.annotations, 'annotations property should exist');
            assert.strictEqual(typeof methodInfo.isSetterMethod, 'boolean', 'isSetterMethod should be boolean');
            
            assert.strictEqual(methodInfo.name, 'setUserService', 'method name should be correct');
            assert.strictEqual(methodInfo.isSetterMethod, true, 'should be recognized as setter method');
            assert.strictEqual(methodInfo.annotations.length, 1, 'should have 1 annotation');
        });
        
        test('should_identifySetterMethod_when_isSetterMethodTrue', () => {
            // Arrange & Act
            const setterMethodInfo: MethodInfo = {
                name: 'setEmailService',
                parameters: [
                    {
                        name: 'emailService',
                        type: 'EmailService',
                        position: new vscode.Position(4, 30)
                    }
                ],
                position: new vscode.Position(4, 4),
                range: new vscode.Range(4, 4, 6, 5),
                annotations: [
                    {
                        name: 'Autowired',
                        type: SpringAnnotationType.AUTOWIRED,
                        line: 3,
                        column: 4
                    }
                ],
                isSetterMethod: true
            };
            
            // Assert
            assert.strictEqual(setterMethodInfo.isSetterMethod, true, 'should be identified as setter method');
            assert.ok(setterMethodInfo.name.startsWith('set'), 'method name should start with set');
            assert.strictEqual(setterMethodInfo.parameters.length, 1, 'setter should have 1 parameter');
        });
        
        test('should_identifyNonSetterMethod_when_isSetterMethodFalse', () => {
            // Arrange & Act
            const nonSetterMethodInfo: MethodInfo = {
                name: 'processData',
                parameters: [
                    {
                        name: 'data',
                        type: 'String',
                        position: new vscode.Position(5, 20)
                    }
                ],
                position: new vscode.Position(5, 4),
                range: new vscode.Range(5, 4, 7, 5),
                annotations: [
                    {
                        name: 'Autowired',
                        type: SpringAnnotationType.AUTOWIRED,
                        line: 4,
                        column: 4
                    }
                ],
                isSetterMethod: false
            };
            
            // Assert
            assert.strictEqual(nonSetterMethodInfo.isSetterMethod, false, 'should be identified as non-setter method');
            assert.ok(!nonSetterMethodInfo.name.startsWith('set'), 'method name should not start with set');
        });
        
        test('should_handleMultipleParameters_when_methodHasMultipleParams', () => {
            // Arrange & Act
            const multiParamMethodInfo: MethodInfo = {
                name: 'updateServices',
                parameters: [
                    {
                        name: 'userService',
                        type: 'UserService',
                        position: new vscode.Position(6, 25)
                    },
                    {
                        name: 'emailService',
                        type: 'EmailService',
                        position: new vscode.Position(6, 45)
                    }
                ],
                position: new vscode.Position(6, 4),
                range: new vscode.Range(6, 4, 8, 5),
                annotations: [],
                isSetterMethod: false
            };
            
            // Assert
            assert.strictEqual(multiParamMethodInfo.parameters.length, 2, 'should have 2 parameters');
            assert.strictEqual(multiParamMethodInfo.isSetterMethod, false, 'should not be setter (has 2 parameters)');
        });
    });
    
    suite('ParameterInfo Interface', () => {
        
        test('should_haveCorrectStructure_when_parameterInfoCreated', () => {
            // Arrange & Act
            const parameterInfo: ParameterInfo = {
                name: 'userRepository',
                type: 'UserRepository',
                position: new vscode.Position(7, 35)
            };
            
            // Assert
            assert.ok(parameterInfo.name, 'name property should exist');
            assert.ok(parameterInfo.type, 'type property should exist');
            assert.ok(parameterInfo.position, 'position property should exist');
            
            assert.strictEqual(typeof parameterInfo.name, 'string', 'name should be string');
            assert.strictEqual(typeof parameterInfo.type, 'string', 'type should be string');
            assert.ok(parameterInfo.position instanceof vscode.Position, 'position should be vscode.Position');
        });
        
        test('should_handleComplexTypes_when_genericOrInterfaceTypes', () => {
            // Arrange & Act
            const complexParameters: ParameterInfo[] = [
                {
                    name: 'userList',
                    type: 'List<User>',
                    position: new vscode.Position(8, 20)
                },
                {
                    name: 'optionalService',
                    type: 'Optional<EmailService>',
                    position: new vscode.Position(8, 40)
                },
                {
                    name: 'repository',
                    type: 'UserRepository',
                    position: new vscode.Position(8, 70)
                }
            ];
            
            // Assert
            assert.strictEqual(complexParameters[0].type, 'List<User>', 'generic type should be stored correctly');
            assert.strictEqual(complexParameters[1].type, 'Optional<EmailService>', 'Optional generic type should be stored correctly');
            assert.strictEqual(complexParameters[2].type, 'UserRepository', 'regular type should be stored correctly');
        });
    });
    
    suite('InjectionType Enum Extension', () => {
        
        test('should_includeNewInjectionTypes_when_injectionTypesAdded', () => {
            // Assert - New injection types should exist
            assert.ok(InjectionType.CONSTRUCTOR, 'CONSTRUCTOR type should exist');
            assert.ok(InjectionType.SETTER, 'SETTER type should exist');
            
            // Verify existing types still exist
            assert.ok(InjectionType.FIELD, 'FIELD type should exist');
            
            // Additional injection type
            assert.ok(InjectionType.LOMBOK, 'LOMBOK type should exist');
            
            // Verify values
            assert.strictEqual(InjectionType.CONSTRUCTOR, 'constructor', 'CONSTRUCTOR value should be correct');
            assert.strictEqual(InjectionType.SETTER, 'setter', 'SETTER value should be correct');
            assert.strictEqual(InjectionType.FIELD, 'field', 'FIELD value should be correct');
            assert.strictEqual(InjectionType.LOMBOK, 'lombok', 'LOMBOK value should be correct');
        });
    });
    
    suite('Integration Tests', () => {
        
        test('should_workTogether_when_allTypesUsedInCombination', () => {
            // Arrange - Create complex constructor info
            const parameters: ParameterInfo[] = [
                {
                    name: 'userRepository',
                    type: 'UserRepository',
                    position: new vscode.Position(10, 25)
                },
                {
                    name: 'emailService',
                    type: 'EmailService',
                    position: new vscode.Position(10, 45)
                }
            ];
            
            const constructorInfo: ConstructorInfo = {
                parameters: parameters,
                position: new vscode.Position(10, 4),
                range: new vscode.Range(10, 4, 12, 5),
                hasAutowiredAnnotation: true
            };
            
            const setterMethod: MethodInfo = {
                name: 'setSmsService',
                parameters: [
                    {
                        name: 'smsService',
                        type: 'SmsService',
                        position: new vscode.Position(15, 25)
                    }
                ],
                position: new vscode.Position(15, 4),
                range: new vscode.Range(15, 4, 17, 5),
                annotations: [
                    {
                        name: 'Autowired',
                        type: SpringAnnotationType.AUTOWIRED,
                        line: 14,
                        column: 4
                    }
                ],
                isSetterMethod: true
            };
            
            // Assert - Verify all types work correctly together
            assert.strictEqual(constructorInfo.parameters.length, 2, 'constructor should have 2 parameters');
            assert.strictEqual(constructorInfo.hasAutowiredAnnotation, true, 'constructor should have @Autowired');
            
            assert.strictEqual(setterMethod.isSetterMethod, true, 'should be setter method');
            assert.strictEqual(setterMethod.parameters.length, 1, 'setter should have 1 parameter');
            assert.strictEqual(setterMethod.annotations.length, 1, 'setter should have 1 annotation');
            
            // Verify parameter types
            assert.strictEqual(constructorInfo.parameters[0].type, 'UserRepository', 'first parameter type should be correct');
            assert.strictEqual(constructorInfo.parameters[1].type, 'EmailService', 'second parameter type should be correct');
            assert.strictEqual(setterMethod.parameters[0].type, 'SmsService', 'setter parameter type should be correct');
        });
    });
}); 