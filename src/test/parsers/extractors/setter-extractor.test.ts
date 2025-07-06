import * as assert from 'assert';
import * as vscode from 'vscode';
import { SetterExtractor } from '../../../parsers/extractors/setter-extractor';
import { SpringAnnotationType } from '../../../models/spring-types';

suite('SetterExtractor Test Suite', () => {
    
    let setterExtractor: SetterExtractor;
    
    setup(() => {
        setterExtractor = new SetterExtractor();
    });
    
    suite('extractSetterMethods', () => {
        
        test('should_extractSimpleSetterMethod_when_autowiredSetterExists', () => {
            // Arrange
            const javaCode = `
                public class UserService {
                    private UserRepository userRepository;
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                }`;
                            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/UserService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1, 'setter 메서드가 1개 추출되어야 함');
            
            const method = methods[0];
            assert.strictEqual(method.name, 'setUserRepository', '메서드 이름이 올바르지 않음');
            assert.strictEqual(method.isSetterMethod, true, 'setter 메서드로 인식되어야 함');
            assert.strictEqual(method.parameters.length, 1, '매개변수가 1개여야 함');
            assert.strictEqual(method.parameters[0].name, 'userRepository', '매개변수 이름이 올바르지 않음');
            assert.strictEqual(method.parameters[0].type, 'UserRepository', '매개변수 타입이 올바르지 않음');
            assert.strictEqual(method.annotations.length, 1, '@Autowired 어노테이션이 있어야 함');
            assert.strictEqual(method.annotations[0].type, SpringAnnotationType.AUTOWIRED, '@Autowired 타입이어야 함');
            assert.ok(method.position, 'position 정보가 있어야 함');
            assert.ok(method.range, 'range 정보가 있어야 함');
        });
        
        test('should_extractMultipleSetterMethods_when_multipleAutowiredSettersExist', () => {
            // Arrange
            const javaCode = `
                public class PaymentService {
                    private UserRepository userRepository;
                    private EmailService emailService;
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                    
                    @Autowired
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                    
                    public void processPayment() {
                        // 일반 메서드 (setter 아님)
                    }
                }`;
            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/PaymentService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 2, 'setter 메서드가 2개 추출되어야 함');
            
            // 첫 번째 setter
            const firstSetter = methods.find(m => m.name === 'setUserRepository');
            assert.ok(firstSetter, 'setUserRepository 메서드가 존재해야 함');
            assert.strictEqual(firstSetter.isSetterMethod, true, '첫 번째 메서드가 setter여야 함');
            assert.strictEqual(firstSetter.parameters[0].type, 'UserRepository', '첫 번째 setter 매개변수 타입');
            
            // 두 번째 setter
            const secondSetter = methods.find(m => m.name === 'setEmailService');
            assert.ok(secondSetter, 'setEmailService 메서드가 존재해야 함');
            assert.strictEqual(secondSetter.isSetterMethod, true, '두 번째 메서드가 setter여야 함');
            assert.strictEqual(secondSetter.parameters[0].type, 'EmailService', '두 번째 setter 매개변수 타입');
        });
        
        test('should_ignoreNonAutowiredSetters_when_autowiredAnnotationMissing', () => {
            // Arrange
            const javaCode = `
                public class OrderService {
                    private UserRepository userRepository;
                    private EmailService emailService;
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                    
                    // @Autowired 없는 setter - 무시되어야 함
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                }`;
            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/OrderService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1, '@Autowired가 있는 setter만 추출되어야 함');
            assert.strictEqual(methods[0].name, 'setUserRepository', 'setUserRepository만 추출되어야 함');
        });
        
        test('should_handleComplexSetterMethod_when_annotationsAndModifiersPresent', () => {
            // Arrange
            const javaCode = `
                public class ComplexService {
                    @Autowired
                    @Qualifier("primary")
                    public void setUserRepository(
                        @Qualifier("userRepo") UserRepository userRepository,
                        @Value("\${app.config}") String config
                    ) {
                        // 복잡한 setter
                    }
                }`;
            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/ComplexService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1, 'setter 메서드가 1개 추출되어야 함');
            
            const method = methods[0];
            assert.strictEqual(method.name, 'setUserRepository', '메서드 이름이 올바르지 않음');
            assert.strictEqual(method.isSetterMethod, true, 'setter 메서드로 인식되어야 함');
            assert.strictEqual(method.parameters.length, 2, '매개변수가 2개여야 함');
            assert.strictEqual(method.annotations.length, 2, '@Autowired와 @Qualifier 어노테이션이 있어야 함');
            
            // 첫 번째 매개변수
            assert.strictEqual(method.parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입');
            assert.strictEqual(method.parameters[0].name, 'userRepository', '첫 번째 매개변수 이름');
            
            // 두 번째 매개변수
            assert.strictEqual(method.parameters[1].type, 'String', '두 번째 매개변수 타입');
            assert.strictEqual(method.parameters[1].name, 'config', '두 번째 매개변수 이름');
        });
        
        test('should_handleGenericTypes_when_setterHasGenericParameters', () => {
            // Arrange
            const javaCode = `
                public class GenericService {
                    @Autowired
                    public void setUserList(List<User> users) {
                        // 제네릭 타입 setter
                    }
                    
                    @Autowired
                    public void setRepositoryMap(Map<String, Repository> repositories) {
                        // 제네릭 Map setter
                    }
                }`;
            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/GenericService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 2, 'setter 메서드가 2개 추출되어야 함');
            
            const listSetter = methods.find(m => m.name === 'setUserList');
            assert.ok(listSetter, 'setUserList 메서드가 존재해야 함');
            assert.strictEqual(listSetter.parameters[0].type, 'List<User>', '제네릭 List 타입');
            
            const mapSetter = methods.find(m => m.name === 'setRepositoryMap');
            assert.ok(mapSetter, 'setRepositoryMap 메서드가 존재해야 함');
            assert.strictEqual(mapSetter.parameters[0].type, 'Map<String, Repository>', '제네릭 Map 타입');
        });
        
        test('should_returnEmptyArray_when_noAutowiredSettersFound', () => {
            // Arrange
            const javaCode = `
                public class NoSetterService {
                    private UserRepository userRepository;
                    
                    public void processUser() {
                        // 일반 메서드
                    }
                    
                    public void setUserRepository(UserRepository userRepository) {
                        // @Autowired 없는 setter
                        this.userRepository = userRepository;
                    }
                }`;
            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/NoSetterService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 0, '@Autowired가 없으면 setter를 추출하지 않아야 함');
        });
        
        test('should_handleReturnType_when_setterHasReturnType', () => {
            // Arrange
            const javaCode = `
                public class FluentService {
                    @Autowired
                    public FluentService setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                        return this;
                    }
                    
                    @Autowired
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                }`;
            
            // Act
            const methods = setterExtractor.extractSetterMethods(javaCode, vscode.Uri.file('/test/FluentService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 2, 'setter 메서드가 2개 추출되어야 함');
            
            const fluentSetter = methods.find(m => m.name === 'setUserRepository');
            assert.ok(fluentSetter, 'setUserRepository 메서드가 존재해야 함');
            assert.strictEqual(fluentSetter.returnType, 'FluentService', '반환 타입이 올바르지 않음');
            
            const voidSetter = methods.find(m => m.name === 'setEmailService');
            assert.ok(voidSetter, 'setEmailService 메서드가 존재해야 함');
            assert.strictEqual(voidSetter.returnType, 'void', 'void 반환 타입이어야 함');
        });
    });
    
    suite('parseMethodDeclaration', () => {
        
        test('should_parseMethodDeclaration_when_validSetterMethodProvided', () => {
            // Arrange
            const methodLine = 'public void setUserRepository(UserRepository userRepository)';
            
            // Act
            const result = setterExtractor.parseMethodDeclaration(methodLine);
            
            // Assert
            assert.ok(result, '메서드 파싱 결과가 존재해야 함');
            assert.strictEqual(result.name, 'setUserRepository', '메서드 이름이 올바르지 않음');
            assert.strictEqual(result.returnType, 'void', '반환 타입이 올바르지 않음');
            assert.strictEqual(result.parameters.length, 1, '매개변수가 1개 파싱되어야 함');
            assert.strictEqual(result.parameters[0].name, 'userRepository', '매개변수 이름');
            assert.strictEqual(result.parameters[0].type, 'UserRepository', '매개변수 타입');
        });
        
        test('should_returnUndefined_when_invalidMethodDeclaration', () => {
            // Arrange
            const invalidLine = 'private String someField;';
            
            // Act
            const result = setterExtractor.parseMethodDeclaration(invalidLine);
            
            // Assert
            assert.strictEqual(result, undefined, '필드는 메서드로 파싱되지 않아야 함');
        });
        
        test('should_handleGenericReturnType_when_genericReturnTypeProvided', () => {
            // Arrange
            const methodLine = 'public Optional<String> setConfig(String config)';
            
            // Act
            const result = setterExtractor.parseMethodDeclaration(methodLine);
            
            // Assert
            assert.ok(result, '메서드 파싱 결과가 존재해야 함');
            assert.strictEqual(result.returnType, 'Optional<String>', '제네릭 반환 타입이 올바르지 않음');
        });
    });
    
    suite('detectAutowiredAnnotation', () => {
        
        test('should_returnTrue_when_autowiredAnnotationPresent', () => {
            // Arrange
            const javaLines = [
                '@Autowired',
                'public void setUserRepository(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = setterExtractor.detectAutowiredAnnotation(javaLines, 1);
            
            // Assert
            assert.strictEqual(hasAutowired, true, '@Autowired 어노테이션이 감지되어야 함');
        });
        
        test('should_returnFalse_when_noAutowiredAnnotation', () => {
            // Arrange
            const javaLines = [
                'public void setUserRepository(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = setterExtractor.detectAutowiredAnnotation(javaLines, 0);
            
            // Assert
            assert.strictEqual(hasAutowired, false, '@Autowired 어노테이션이 없으면 false여야 함');
        });
        
        test('should_returnTrue_when_autowiredWithFullPackageName', () => {
            // Arrange
            const javaLines = [
                '@org.springframework.beans.factory.annotation.Autowired',
                'public void setUserRepository(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = setterExtractor.detectAutowiredAnnotation(javaLines, 1);
            
            // Assert
            assert.strictEqual(hasAutowired, true, '완전한 패키지명의 @Autowired도 감지되어야 함');
        });
        
        test('should_returnTrue_when_multipleAnnotationsWithAutowired', () => {
            // Arrange
            const javaLines = [
                '@Qualifier("primary")',
                '@Autowired',
                'public void setUserRepository(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = setterExtractor.detectAutowiredAnnotation(javaLines, 2);
            
            // Assert
            assert.strictEqual(hasAutowired, true, '여러 어노테이션 중 @Autowired가 감지되어야 함');
        });
    });
    
    suite('isSetterMethod', () => {
        
        test('should_returnTrue_when_validSetterMethodName', () => {
            // Arrange
            const methodName = 'setUserRepository';
            const parameterCount = 1;
            
            // Act
            const result = setterExtractor.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, true, 'setXxx 패턴의 메서드는 setter로 인식되어야 함');
        });
        
        test('should_returnFalse_when_invalidSetterMethodName', () => {
            // Arrange
            const methodName = 'getUserRepository';
            const parameterCount = 1;
            
            // Act
            const result = setterExtractor.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false, 'getXxx 패턴의 메서드는 setter가 아님');
        });
        
        test('should_returnFalse_when_setterWithoutParameters', () => {
            // Arrange
            const methodName = 'setUserRepository';
            const parameterCount = 0;
            
            // Act
            const result = setterExtractor.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false, '매개변수가 없으면 setter가 아님');
        });
        
        test('should_returnTrue_when_setterWithMultipleParameters', () => {
            // Arrange
            const methodName = 'setConfiguration';
            const parameterCount = 2;
            
            // Act
            const result = setterExtractor.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, true, '매개변수가 여러 개여도 setter로 인식되어야 함');
        });
        
        test('should_returnFalse_when_justSetMethod', () => {
            // Arrange
            const methodName = 'set';
            const parameterCount = 1;
            
            // Act
            const result = setterExtractor.isSetterMethod(methodName, parameterCount);
            
            // Assert
            assert.strictEqual(result, false, '단순히 "set"만 있는 메서드는 setter가 아님');
        });
    });
    
    suite('Error Handling', () => {
        
        test('should_handleEmptyContent_when_emptyStringProvided', () => {
            // Arrange
            const emptyContent = '';
            
            // Act
            const methods = setterExtractor.extractSetterMethods(emptyContent, vscode.Uri.file('/test/Empty.java'));
            
            // Assert
            assert.strictEqual(methods.length, 0, '빈 내용에서는 setter 메서드가 없어야 함');
        });
        
        test('should_handleMalformedJava_when_invalidSyntaxProvided', () => {
            // Arrange
            const malformedJava = 'public class Broken { invalid syntax ';
            
            // Act & Assert
            assert.doesNotThrow(() => {
                const methods = setterExtractor.extractSetterMethods(malformedJava, vscode.Uri.file('/test/Broken.java'));
                assert.strictEqual(methods.length, 0, '잘못된 구문에서는 setter 메서드가 없어야 함');
            });
        });
        
        test('should_handleNullInput_when_nullProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const methods = setterExtractor.extractSetterMethods(null as any, vscode.Uri.file('/test/Null.java'));
                assert.strictEqual(methods.length, 0, 'null 입력에서는 setter 메서드가 없어야 함');
            });
        });
    });
    
    suite('Integration Tests', () => {
        
        test('should_handleRealWorldExample_when_completeSpringServiceProvided', () => {
            // Arrange - Real Spring Service example
            const realWorldJava = `
                package com.example.service;

                import org.springframework.beans.factory.annotation.Autowired;
                import org.springframework.beans.factory.annotation.Qualifier;
                import org.springframework.stereotype.Service;

                @Service
                public class UserService {
                    private UserRepository userRepository;
                    private EmailService emailService;
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                    
                    @Autowired
                    @Qualifier("asyncEmailService")
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                    
                    public void createUser(String name) {
                        // 메소드 구현
                    }
                }`;
                            
            // Act
            const methods = setterExtractor.extractSetterMethods(realWorldJava, vscode.Uri.file('/test/UserService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 2, '실제 Spring Service에서 setter 메서드 2개 추출');
            
            const userRepoSetter = methods.find(m => m.name === 'setUserRepository');
            assert.ok(userRepoSetter, 'setUserRepository 메서드 존재');
            assert.strictEqual(userRepoSetter.annotations.length, 1, '@Autowired만 있어야 함');
            assert.strictEqual(userRepoSetter.parameters[0].type, 'UserRepository', 'UserRepository 타입');
            
            const emailSetter = methods.find(m => m.name === 'setEmailService');
            assert.ok(emailSetter, 'setEmailService 메서드 존재');
            assert.strictEqual(emailSetter.annotations.length, 2, '@Autowired와 @Qualifier 어노테이션');
            assert.strictEqual(emailSetter.parameters[0].type, 'EmailService', 'EmailService 타입');
        });
    });
}); 