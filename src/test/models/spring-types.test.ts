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

suite('🧪 Phase 2 Type Definitions Test Suite', () => {
    
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
            assert.ok(constructorInfo.parameters, 'parameters 속성이 존재해야 함');
            assert.ok(constructorInfo.position, 'position 속성이 존재해야 함');
            assert.ok(constructorInfo.range, 'range 속성이 존재해야 함');
            assert.strictEqual(typeof constructorInfo.hasAutowiredAnnotation, 'boolean', 'hasAutowiredAnnotation은 boolean이어야 함');
            
            assert.strictEqual(constructorInfo.parameters.length, 2, '매개변수가 2개여야 함');
            assert.strictEqual(constructorInfo.hasAutowiredAnnotation, false, '@Autowired 어노테이션이 없어야 함');
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
            assert.strictEqual(autowiredConstructorInfo.hasAutowiredAnnotation, true, '@Autowired 어노테이션이 있어야 함');
            assert.strictEqual(autowiredConstructorInfo.parameters.length, 1, '매개변수가 1개여야 함');
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
            assert.strictEqual(emptyConstructorInfo.parameters.length, 0, '매개변수가 없어야 함');
            assert.strictEqual(emptyConstructorInfo.hasAutowiredAnnotation, false, '@Autowired 어노테이션이 없어야 함');
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
            assert.ok(methodInfo.name, 'name 속성이 존재해야 함');
            assert.ok(methodInfo.parameters, 'parameters 속성이 존재해야 함');
            assert.ok(methodInfo.position, 'position 속성이 존재해야 함');
            assert.ok(methodInfo.range, 'range 속성이 존재해야 함');
            assert.ok(methodInfo.annotations, 'annotations 속성이 존재해야 함');
            assert.strictEqual(typeof methodInfo.isSetterMethod, 'boolean', 'isSetterMethod는 boolean이어야 함');
            
            assert.strictEqual(methodInfo.name, 'setUserService', '메소드 이름이 올바르지 않음');
            assert.strictEqual(methodInfo.isSetterMethod, true, 'setter 메소드로 인식되어야 함');
            assert.strictEqual(methodInfo.annotations.length, 1, '어노테이션이 1개여야 함');
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
            assert.strictEqual(setterMethodInfo.isSetterMethod, true, 'setter 메소드로 식별되어야 함');
            assert.ok(setterMethodInfo.name.startsWith('set'), '메소드 이름이 set으로 시작해야 함');
            assert.strictEqual(setterMethodInfo.parameters.length, 1, 'setter는 매개변수가 1개여야 함');
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
            assert.strictEqual(nonSetterMethodInfo.isSetterMethod, false, 'setter 메소드가 아님을 식별해야 함');
            assert.ok(!nonSetterMethodInfo.name.startsWith('set'), '메소드 이름이 set으로 시작하지 않아야 함');
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
            assert.strictEqual(multiParamMethodInfo.parameters.length, 2, '매개변수가 2개여야 함');
            assert.strictEqual(multiParamMethodInfo.isSetterMethod, false, 'setter가 아니어야 함 (매개변수가 2개)');
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
            assert.ok(parameterInfo.name, 'name 속성이 존재해야 함');
            assert.ok(parameterInfo.type, 'type 속성이 존재해야 함');
            assert.ok(parameterInfo.position, 'position 속성이 존재해야 함');
            
            assert.strictEqual(typeof parameterInfo.name, 'string', 'name은 string이어야 함');
            assert.strictEqual(typeof parameterInfo.type, 'string', 'type은 string이어야 함');
            assert.ok(parameterInfo.position instanceof vscode.Position, 'position은 vscode.Position이어야 함');
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
            assert.strictEqual(complexParameters[0].type, 'List<User>', '제네릭 타입이 올바르게 저장되어야 함');
            assert.strictEqual(complexParameters[1].type, 'Optional<EmailService>', 'Optional 제네릭 타입이 올바르게 저장되어야 함');
            assert.strictEqual(complexParameters[2].type, 'UserRepository', '일반 타입이 올바르게 저장되어야 함');
        });
    });
    
    suite('InjectionType Enum Extension', () => {
        
        test('should_includeNewInjectionTypes_when_phase2TypesAdded', () => {
            // Assert - Phase 2에서 추가되는 타입들
            assert.ok(InjectionType.CONSTRUCTOR, 'CONSTRUCTOR 타입이 존재해야 함');
            assert.ok(InjectionType.SETTER, 'SETTER 타입이 존재해야 함');
            
            // Phase 1에서 존재하던 타입들
            assert.ok(InjectionType.FIELD, 'FIELD 타입이 존재해야 함');
            
            // Phase 3에서 추가될 타입 (현재는 존재해야 함)
            assert.ok(InjectionType.LOMBOK, 'LOMBOK 타입이 존재해야 함');
            
            // 값 검증
            assert.strictEqual(InjectionType.CONSTRUCTOR, 'constructor', 'CONSTRUCTOR 값이 올바르지 않음');
            assert.strictEqual(InjectionType.SETTER, 'setter', 'SETTER 값이 올바르지 않음');
            assert.strictEqual(InjectionType.FIELD, 'field', 'FIELD 값이 올바르지 않음');
            assert.strictEqual(InjectionType.LOMBOK, 'lombok', 'LOMBOK 값이 올바르지 않음');
        });
    });
    
    suite('Integration Tests', () => {
        
        test('should_workTogether_when_allTypesUsedInCombination', () => {
            // Arrange - 복합적인 생성자 정보 생성
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
            
            // Assert - 모든 타입이 함께 올바르게 작동하는지 검증
            assert.strictEqual(constructorInfo.parameters.length, 2, '생성자 매개변수가 2개여야 함');
            assert.strictEqual(constructorInfo.hasAutowiredAnnotation, true, '생성자에 @Autowired가 있어야 함');
            
            assert.strictEqual(setterMethod.isSetterMethod, true, 'setter 메소드여야 함');
            assert.strictEqual(setterMethod.parameters.length, 1, 'setter 매개변수가 1개여야 함');
            assert.strictEqual(setterMethod.annotations.length, 1, 'setter에 어노테이션이 1개여야 함');
            
            // 매개변수 타입 검증
            assert.strictEqual(constructorInfo.parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입이 올바르지 않음');
            assert.strictEqual(constructorInfo.parameters[1].type, 'EmailService', '두 번째 매개변수 타입이 올바르지 않음');
            assert.strictEqual(setterMethod.parameters[0].type, 'SmsService', 'setter 매개변수 타입이 올바르지 않음');
        });
    });
}); 