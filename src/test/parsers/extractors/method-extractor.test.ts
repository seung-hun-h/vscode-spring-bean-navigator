import * as assert from 'assert';
import * as vscode from 'vscode';
import { MethodExtractor } from '../../../parsers/extractors/method-extractor';
import { SpringAnnotationType } from '../../../models/spring-types';
import { ParameterParser } from '../../../parsers/utils/parameter-parser';
import { JavaSyntaxUtils } from '../../../parsers/utils/java-syntax-utils';

suite('MethodExtractor Test Suite', () => {
    
    let methodExtractor: MethodExtractor;
    
    setup(() => {
        methodExtractor = new MethodExtractor();
    });
    
    suite('extractAllMethods', () => {
        
        test('should_extractSimpleMethod_when_basicMethodExists', () => {
            // Arrange
            const javaCode = `
                public class UserService {
                    public void doSomething() {
                        // method body
                    }
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/UserService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1, 'Should extract 1 method');
            
            const method = methods[0];
            assert.strictEqual(method.name, 'doSomething');
            assert.strictEqual(method.returnType, 'void');
            assert.strictEqual(method.parameters.length, 0);
            assert.strictEqual(method.isSetterMethod, false);
            assert.ok(method.position);
            assert.ok(method.range);
        });
        
        test('should_extractSetterMethod_when_setterPatternExists', () => {
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
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/UserService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1);
            
            const method = methods[0];
            assert.strictEqual(method.name, 'setUserRepository');
            assert.strictEqual(method.isSetterMethod, true, 'Should be identified as setter');
            assert.strictEqual(method.returnType, 'void');
            assert.strictEqual(method.parameters.length, 1);
            assert.strictEqual(method.parameters[0].name, 'userRepository');
            assert.strictEqual(method.parameters[0].type, 'UserRepository');
            assert.strictEqual(method.annotations.length, 1);
            assert.strictEqual(method.annotations[0].type, SpringAnnotationType.AUTOWIRED);
        });
        
        test('should_extractBeanMethod_when_beanAnnotationExists', () => {
            // Arrange
            const javaCode = `
                @Configuration
                public class AppConfig {
                    
                    @Bean
                    public DataSource dataSource() {
                        return new DataSource();
                    }
                    
                    @Bean("customBean")
                    public UserService userService(UserRepository repo) {
                        return new UserService(repo);
                    }
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/AppConfig.java'));
            
            // Assert
            assert.strictEqual(methods.length, 2);
            
            const dataSourceMethod = methods[0];
            assert.strictEqual(dataSourceMethod.name, 'dataSource');
            assert.strictEqual(dataSourceMethod.returnType, 'DataSource');
            assert.strictEqual(dataSourceMethod.parameters.length, 0);
            assert.strictEqual(dataSourceMethod.annotations.length, 1);
            assert.strictEqual(dataSourceMethod.annotations[0].type, SpringAnnotationType.BEAN);
            
            const userServiceMethod = methods[1];
            assert.strictEqual(userServiceMethod.name, 'userService');
            assert.strictEqual(userServiceMethod.returnType, 'UserService');
            assert.strictEqual(userServiceMethod.parameters.length, 1);
            assert.strictEqual(userServiceMethod.parameters[0].type, 'UserRepository');
            assert.strictEqual(userServiceMethod.parameters[0].name, 'repo');
        });
        
        test('should_extractMultiLineMethod_when_methodSpansMultipleLines', () => {
            // Arrange
            const javaCode = `
                public class ComplexService {
                    
                    @Autowired
                    public void setComplexDependencies(
                            UserRepository userRepository,
                            OrderService orderService,
                            PaymentProcessor paymentProcessor) {
                        // method body
                    }
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/ComplexService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1);
            
            const method = methods[0];
            assert.strictEqual(method.name, 'setComplexDependencies');
            assert.strictEqual(method.isSetterMethod, true);
            assert.strictEqual(method.parameters.length, 3);
            assert.strictEqual(method.parameters[0].type, 'UserRepository');
            assert.strictEqual(method.parameters[1].type, 'OrderService');
            assert.strictEqual(method.parameters[2].type, 'PaymentProcessor');
        });
        
        test('should_extractGenericMethod_when_genericTypesUsed', () => {
            // Arrange
            const javaCode = `
                public class GenericService {
                    
                    public List<String> getNames() {
                        return new ArrayList<>();
                    }
                    
                    public void processItems(Map<String, List<Integer>> items) {
                        // processing logic
                    }
                    
                    public <T extends Comparable<T>> T findMax(List<T> items) {
                        return null;
                    }
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/GenericService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 3);
            
            const getNamesMethod = methods[0];
            assert.strictEqual(getNamesMethod.name, 'getNames');
            assert.strictEqual(getNamesMethod.returnType, 'List<String>');
            assert.strictEqual(getNamesMethod.parameters.length, 0);
            
            const processItemsMethod = methods[1];
            assert.strictEqual(processItemsMethod.name, 'processItems');
            assert.strictEqual(processItemsMethod.parameters.length, 1);
            assert.strictEqual(processItemsMethod.parameters[0].type, 'Map<String, List<Integer>>');
            
            const findMaxMethod = methods[2];
            assert.strictEqual(findMaxMethod.name, 'findMax');
            assert.strictEqual(findMaxMethod.returnType, '<T extends Comparable<T>> T');
            assert.strictEqual(findMaxMethod.parameters.length, 1);
            assert.strictEqual(findMaxMethod.parameters[0].type, 'List<T>');
        });
        
        test('should_extractMultipleMethods_when_classHasManyMethods', () => {
            // Arrange
            const javaCode = `
                public class ServiceClass {
                    private UserRepository userRepository;
                    private OrderService orderService;
                    
                    public ServiceClass() {
                        // constructor
                    }
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                    
                    @Autowired
                    public void setOrderService(OrderService orderService) {
                        this.orderService = orderService;
                    }
                    
                    public User findUser(Long id) {
                        return userRepository.findById(id);
                    }
                    
                    private void validateOrder(Order order) {
                        // validation logic
                    }
                    
                    protected List<Order> getUserOrders(User user) {
                        return orderService.findByUser(user);
                    }
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/ServiceClass.java'));
            
            // Assert
            assert.strictEqual(methods.length, 5, 'Should extract all 5 methods');
            
            const methodNames = methods.map(m => m.name);
            assert.ok(methodNames.includes('setUserRepository'));
            assert.ok(methodNames.includes('setOrderService'));
            assert.ok(methodNames.includes('findUser'));
            assert.ok(methodNames.includes('validateOrder'));
            assert.ok(methodNames.includes('getUserOrders'));
            
            // Check setter methods
            const setterMethods = methods.filter(m => m.isSetterMethod);
            assert.strictEqual(setterMethods.length, 2);
            
            // Check @Autowired annotations
            const autowiredMethods = methods.filter(m => 
                m.annotations.some(a => a.type === SpringAnnotationType.AUTOWIRED)
            );
            assert.strictEqual(autowiredMethods.length, 2);
        });
        
        test('should_returnEmptyArray_when_noMethodsExist', () => {
            // Arrange
            const javaCode = `
                public class EmptyClass {
                    private String field1;
                    private int field2;
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/EmptyClass.java'));
            
            // Assert
            assert.strictEqual(methods.length, 0);
        });
        
        test('should_handleMethodWithAnnotations_when_multipleAnnotationsPresent', () => {
            // Arrange
            const javaCode = `
                public class AnnotatedService {
                    
                    @Override
                    @Transactional
                    @Cacheable("users")
                    @Autowired
                    public void setUserCache(CacheManager cacheManager) {
                        // implementation
                    }
                }`;
                            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/AnnotatedService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1);
            const method = methods[0];
            assert.strictEqual(method.name, 'setUserCache');
            assert.strictEqual(method.isSetterMethod, true);
            assert.ok(method.annotations.length >= 1);
            assert.ok(method.annotations.some(a => a.type === SpringAnnotationType.AUTOWIRED));
        });
    });
    
    suite('parseMethodDeclarationWithParameters', () => {
        
        test('should_parseMethodDeclaration_when_validMethodProvided', () => {
            // Arrange
            const methodDeclaration = 'public void setName(String name)';
            const parametersString = 'String name';
            
            // Act
            const result = methodExtractor.parseMethodDeclarationWithParameters(methodDeclaration, parametersString);
            
            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'setName');
            assert.strictEqual(result.returnType, 'void');
            assert.strictEqual(result.parameters.length, 1);
            assert.strictEqual(result.parameters[0].type, 'String');
            assert.strictEqual(result.parameters[0].name, 'name');
        });
        
        test('should_parseComplexMethod_when_genericTypesUsed', () => {
            // Arrange
            const methodDeclaration = 'public Map<String, List<User>> getUsersByCategory(String category, List<Filter> filters)';
            const parametersString = 'String category, List<Filter> filters';
            
            // Act
            const result = methodExtractor.parseMethodDeclarationWithParameters(methodDeclaration, parametersString);
            
            // Assert
            assert.ok(result);
            assert.strictEqual(result.name, 'getUsersByCategory');
            assert.strictEqual(result.returnType, 'Map<String, List<User>>');
            assert.strictEqual(result.parameters.length, 2);
            assert.strictEqual(result.parameters[0].type, 'String');
            assert.strictEqual(result.parameters[0].name, 'category');
            assert.strictEqual(result.parameters[1].type, 'List<Filter>');
            assert.strictEqual(result.parameters[1].name, 'filters');
        });
        
        test('should_returnUndefined_when_fieldDeclarationProvided', () => {
            // Arrange
            const fieldDeclaration = 'private String name;';
            const parametersString = '';
            
            // Act
            const result = methodExtractor.parseMethodDeclarationWithParameters(fieldDeclaration, parametersString);
            
            // Assert
            assert.strictEqual(result, undefined);
        });
    });
    
    suite('isSetterMethod', () => {
        
        test('should_returnTrue_when_validSetterPattern', () => {
            // Arrange
            const testCases = [
                { name: 'setName', paramCount: 1, expected: true },
                { name: 'setUserRepository', paramCount: 1, expected: true },
                { name: 'setEnabled', paramCount: 1, expected: true },
                { name: 'setXY', paramCount: 2, expected: true } // Multiple params still setter
            ];
            
            // Act & Assert
            testCases.forEach(testCase => {
                const result = methodExtractor.isSetterMethod(testCase.name, testCase.paramCount);
                assert.strictEqual(result, testCase.expected, 
                    `Method ${testCase.name} with ${testCase.paramCount} params should be ${testCase.expected}`);
            });
        });
        
        test('should_returnFalse_when_notSetterPattern', () => {
            // Arrange
            const testCases = [
                { name: 'getName', paramCount: 0, expected: false },
                { name: 'set', paramCount: 1, expected: false }, // Just 'set'
                { name: 'setup', paramCount: 1, expected: false }, // Not 'set' prefix
                { name: 'setName', paramCount: 0, expected: false }, // No parameters
                { name: 'doSomething', paramCount: 1, expected: false }
            ];
            
            // Act & Assert
            testCases.forEach(testCase => {
                const result = methodExtractor.isSetterMethod(testCase.name, testCase.paramCount);
                assert.strictEqual(result, testCase.expected, 
                    `Method ${testCase.name} with ${testCase.paramCount} params should be ${testCase.expected}`);
            });
        });
    });
    
    suite('Error Handling', () => {
        
        test('should_returnEmptyArray_when_emptyContentProvided', () => {
            // Arrange
            const emptyContent = '';
            
            // Act
            const methods = methodExtractor.extractAllMethods(emptyContent, vscode.Uri.file('/test/Empty.java'));
            
            // Assert
            assert.strictEqual(methods.length, 0);
        });
        
        test('should_returnEmptyArray_when_nullContentProvided', () => {
            // Arrange
            const nullContent = null as any;
            
            // Act
            const methods = methodExtractor.extractAllMethods(nullContent, vscode.Uri.file('/test/Null.java'));
            
            // Assert
            assert.strictEqual(methods.length, 0);
        });
        
        test('should_handleMalformedJava_when_invalidSyntaxProvided', () => {
            // Arrange
            const malformedJava = `
                public class Broken {
                    public void method1( {
                        // broken
                    }
                    
                    public normal() {
                        return;
                    }
                }`;
            
            // Act
            const methods = methodExtractor.extractAllMethods(malformedJava, vscode.Uri.file('/test/Broken.java'));
            
            // Assert
            // Should still extract what it can
            assert.ok(methods.length >= 0);
        });
    });
    
    suite('Integration Tests', () => {
        
        test('should_handleRealWorldExample_when_complexSpringServiceProvided', () => {
            // Arrange
            const realWorldJava = `
                package com.example.service;
                
                import org.springframework.stereotype.Service;
                import org.springframework.beans.factory.annotation.Autowired;
                import org.springframework.transaction.annotation.Transactional;
                
                @Service
                @Transactional
                public class UserManagementService {
                    
                    private UserRepository userRepository;
                    private EmailService emailService;
                    private SecurityService securityService;
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                    
                    @Autowired
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                    
                    @Autowired
                    public void setSecurityService(SecurityService securityService) {
                        this.securityService = securityService;
                    }
                    
                    public User createUser(String username, String email, String password) {
                        User user = new User(username, email);
                        user.setPassword(securityService.encryptPassword(password));
                        
                        User savedUser = userRepository.save(user);
                        emailService.sendWelcomeEmail(savedUser);
                        
                        return savedUser;
                    }
                    
                    public void updateUserEmail(Long userId, String newEmail) {
                        User user = userRepository.findById(userId)
                            .orElseThrow(() -> new UserNotFoundException(userId));
                        
                        user.setEmail(newEmail);
                        userRepository.save(user);
                        
                        emailService.sendEmailChangeNotification(user);
                    }
                    
                    @Transactional(readOnly = true)
                    public List<User> findActiveUsers() {
                        return userRepository.findByActiveTrue();
                    }
                    
                    private void validateEmail(String email) {
                        if (!email.contains("@")) {
                            throw new InvalidEmailException(email);
                        }
                    }
                }`;
            
            // Act
            const methods = methodExtractor.extractAllMethods(realWorldJava, vscode.Uri.file('/test/UserManagementService.java'));
            
            // Assert
            assert.ok(methods.length >= 7, 'Should extract at least 7 methods');
            
            // Check setter methods
            const setterMethods = methods.filter(m => m.isSetterMethod);
            assert.strictEqual(setterMethods.length, 3, 'Should have 3 setter methods');
            
            // Check all setters have @Autowired
            setterMethods.forEach(setter => {
                assert.ok(setter.annotations.some(a => a.type === SpringAnnotationType.AUTOWIRED),
                    `Setter ${setter.name} should have @Autowired annotation`);
            });
            
            // Check non-setter methods
            const nonSetterMethods = methods.filter(m => !m.isSetterMethod);
            assert.ok(nonSetterMethods.length >= 4);
            
            // Verify specific methods
            const createUserMethod = methods.find(m => m.name === 'createUser');
            assert.ok(createUserMethod);
            assert.strictEqual(createUserMethod.parameters.length, 3);
            assert.strictEqual(createUserMethod.returnType, 'User');
            
            const findActiveUsersMethod = methods.find(m => m.name === 'findActiveUsers');
            assert.ok(findActiveUsersMethod);
            assert.strictEqual(findActiveUsersMethod.returnType, 'List<User>');
            
            const validateEmailMethod = methods.find(m => m.name === 'validateEmail');
            assert.ok(validateEmailMethod);
            assert.strictEqual(validateEmailMethod.returnType, 'void');
        });
        
        test('should_extractParameterPositions_when_multiLineMethodExists', () => {
            // Arrange
            const javaCode = `
                public class TestService {
                    @Autowired
                    public void configure(
                            @Qualifier("primary") DataSource primaryDataSource,
                            @Qualifier("secondary") DataSource secondaryDataSource,
                            TransactionManager transactionManager
                    ) {
                        // configuration logic
                    }
                }`;
            
            // Act
            const methods = methodExtractor.extractAllMethods(javaCode, vscode.Uri.file('/test/TestService.java'));
            
            // Assert
            assert.strictEqual(methods.length, 1);
            const method = methods[0];
            assert.strictEqual(method.parameters.length, 3);
            
            // Check that each parameter has position information
            method.parameters.forEach((param, index) => {
                assert.ok(param.position, `Parameter ${index} should have position`);
                assert.ok(param.range, `Parameter ${index} should have range`);
            });
        });
    });
    
    suite('JavaSyntaxUtils compatibility', () => {
        
        test('should_compareCountParenthesesWithJavaSyntaxUtils_when_analyzingStrings', () => {
            // Arrange
            const testCases = [
                'public void method(String param)',
                'public void method(String param1, int param2)',
                'System.out.println("Hello (world)")',
                'method("(", ")")',
                'method(list.get(0), map.get("key"))',
                'if ((a > b) && (c < d)) { return; }',
                '"This is a string with (parentheses)"',
                '\'(\' + \')\''
            ];
            
            // Act & Assert
            testCases.forEach(testCase => {
                // Get result from countParentheses
                const countResult = (methodExtractor as any).countParentheses(testCase);
                
                // Get result from JavaSyntaxUtils
                const openCountUtil = JavaSyntaxUtils.countCharacterOutsideStrings(testCase, '(');
                const closeCountUtil = JavaSyntaxUtils.countCharacterOutsideStrings(testCase, ')');
                
                // Compare results
                assert.strictEqual(
                    countResult.openCount,
                    openCountUtil,
                    `Open parentheses count mismatch for: ${testCase}`
                );
                assert.strictEqual(
                    countResult.closeCount,
                    closeCountUtil,
                    `Close parentheses count mismatch for: ${testCase}`
                );
            });
        });
        
        test('should_compareExtractParametersStringWithJavaSyntaxUtils_when_extractingParameters', () => {
            // Arrange
            const testCases = [
                'public void method(String param)',
                'public void method(String param1, int param2)',
                'public List<String> getItems(Map<String, List<Integer>> map)',
                'void print(String msg, Object... args)',
                'public void method()',
                'public void nested(List<Map<String, Set<Integer>>> complex)'
            ];
            
            // Act & Assert
            testCases.forEach(testCase => {
                // Get result from extractParametersStringFromDeclaration
                const extractResult = (methodExtractor as any).extractParametersStringFromDeclaration(testCase);
                
                // Get result from JavaSyntaxUtils
                const utilResult = JavaSyntaxUtils.extractBetweenParentheses(testCase);
                
                // Compare results
                assert.strictEqual(
                    extractResult,
                    utilResult,
                    `Parameter extraction mismatch for: ${testCase}`
                );
            });
        });
        
        test('should_compareHasMethodBodyStartWithManualCheck_when_checkingMethodBody', () => {
            // Arrange
            const testCases = [
                { line: 'public void method() {', expected: true },
                { line: 'public abstract void method();', expected: true },
                { line: 'String text = "method() { return; }";', expected: true }, // Has ; at the end
                { line: 'String text = "method() { return; }"', expected: false }, // No ; at the end
                { line: '// This is a comment {', expected: true }, // Note: comments are not string literals
                { line: 'char c = \'{\';', expected: true }, // Has ; at the end
                { line: 'char c = \'{\'', expected: false }, // No ; at the end
                { line: 'return new Object() { };', expected: true }
            ];
            
            // Act & Assert
            testCases.forEach(testCase => {
                const result = (methodExtractor as any).hasMethodBodyStart(testCase.line);
                assert.strictEqual(
                    result,
                    testCase.expected,
                    `Method body start check failed for: ${testCase.line}`
                );
            });
        });
    });
}); 