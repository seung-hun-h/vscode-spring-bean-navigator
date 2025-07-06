import * as assert from 'assert';
import * as vscode from 'vscode';
import { SpringCodeLensProvider } from '../../providers/code-lens-provider';
import { BeanResolver } from '../../utils/bean-resolver';
import { SpringBeanDetector } from '../../detectors/spring-bean-detector';

suite('SpringCodeLensProvider', () => {
    let provider: SpringCodeLensProvider;
    let mockBeanResolver: BeanResolver;
    let mockBeanDetector: SpringBeanDetector;
    
    setup(() => {
        mockBeanResolver = new BeanResolver();
        mockBeanDetector = new SpringBeanDetector();
        provider = new SpringCodeLensProvider(mockBeanResolver, mockBeanDetector);
    });

    suite('isJavaFile', () => {
        test('should_returnTrue_when_javaFileProvided', () => {
            // Arrange
            const javaDocument = createDocumentWithLanguage('java');
            
            // Act
            const result = provider.isJavaFile(javaDocument);
            
            // Assert
            assert.strictEqual(result, true, 'Should return true for Java files');
        });

        test('should_returnFalse_when_nonJavaFileProvided', () => {
            // Arrange
            const textDocument = createDocumentWithLanguage('typescript');
            
            // Act
            const result = provider.isJavaFile(textDocument);
            
            // Assert
            assert.strictEqual(result, false, 'Should return false for non-Java files');
        });
    });

    suite('getBeanDisplayName', () => {
        test('should_returnSimpleName_when_shortClassName', () => {
            // Act
            const result = provider.getBeanDisplayName('UserService');
            
            // Assert
            assert.strictEqual(result, 'UserService', 'Should return simple class name');
        });

        test('should_returnSimpleName_when_fullyQualifiedName', () => {
            // Act
            const result = provider.getBeanDisplayName('com.example.service.UserService');
            
            // Assert
            assert.strictEqual(result, 'UserService', 'Should extract simple name from FQN');
        });
    });

    suite('provideCodeLenses - Basic', () => {
        test('should_returnEmptyArray_when_nonJavaFileProvided', async () => {
            // Arrange
            const document = createDocumentWithLanguage('typescript');
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            assert.ok(codeLenses);
            assert.strictEqual(codeLenses.length, 0, 'Should return empty array for non-Java files');
        });

        test('should_handleError_when_parsingFails', async () => {
            // Arrange
            const document = createDocumentWithContent('invalid java content {{{');
            
            // Act & Assert - should not throw
            const codeLenses = await provider.provideCodeLenses(document);
            assert.ok(codeLenses);
            assert.strictEqual(codeLenses.length, 0, 'Should return empty array on parsing error');
        });
    });
});

// Constructor/Setter CodeLens tests
suite('Constructor and Setter CodeLens', () => {
    let provider: SpringCodeLensProvider;
    let mockBeanResolver: BeanResolver;
    let mockBeanDetector: SpringBeanDetector;
    
    setup(() => {
        mockBeanResolver = new BeanResolver();
        mockBeanDetector = new SpringBeanDetector();
        provider = new SpringCodeLensProvider(mockBeanResolver, mockBeanDetector);
        
        // Add test Bean definition
        const userRepositoryBean: import('../../models/spring-types').BeanDefinition = createBeanDefinition('userRepository', 'UserRepository', 'com.example.repository.UserRepository');
        const emailServiceBean: import('../../models/spring-types').BeanDefinition = createBeanDefinition('emailService', 'EmailService', 'com.example.service.EmailService');
        const paymentGatewayBean: import('../../models/spring-types').BeanDefinition = createBeanDefinition('paymentGateway', 'PaymentGateway', 'com.example.gateway.PaymentGateway');
        
        mockBeanResolver.addBeanDefinition(userRepositoryBean);
        mockBeanResolver.addBeanDefinition(emailServiceBean);
        mockBeanResolver.addBeanDefinition(paymentGatewayBean);
    });

    suite('provideConstructorCodeLenses', () => {
        test('should_provideCodeLens_when_singleConstructorParametersExist', async () => {
            // Arrange: Spring service with single constructor
            const javaContent = `
                package com.example.service;

                import org.springframework.stereotype.Service;
                import com.example.repository.UserRepository;
                import com.example.service.EmailService;

                @Service
                public class OrderService {
                    private final UserRepository userRepository;
                    private final EmailService emailService;
                    
                    public OrderService(UserRepository userRepository, EmailService emailService) {
                        this.userRepository = userRepository;
                        this.emailService = emailService;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            assert.ok(codeLenses, 'Should return CodeLens array');
            
            // Should create CodeLens for 2 constructor parameters
            const constructorCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('userRepository') || 
                cl.command?.title.includes('emailService')
            );
            
            assert.strictEqual(constructorCodeLenses.length, 2, 'Should provide CodeLens for constructor parameters');
            
            // Verify UserRepository parameter CodeLens
            const userRepoCodeLens = constructorCodeLenses.find(cl => 
                cl.command?.title.includes('userRepository')
            );
            assert.ok(userRepoCodeLens, 'Should have CodeLens for UserRepository parameter');
            assert.strictEqual(userRepoCodeLens.command?.command, 'spring-bean-navigator.goToBean');
            
            // Verify EmailService parameter CodeLens
            const emailServiceCodeLens = constructorCodeLenses.find(cl => 
                cl.command?.title.includes('emailService')
            );
            assert.ok(emailServiceCodeLens, 'Should have CodeLens for EmailService parameter');
            assert.strictEqual(emailServiceCodeLens.command?.command, 'spring-bean-navigator.goToBean');
        });

        test('should_provideCodeLens_when_autowiredConstructorExists', async () => {
            // Arrange: Spring service with @Autowired constructor
            const javaContent = `
                package com.example.service;

                import org.springframework.beans.factory.annotation.Autowired;
                import org.springframework.stereotype.Service;
                import com.example.repository.UserRepository;
                import com.example.gateway.PaymentGateway;

                @Service
                public class PaymentService {
                    private UserRepository userRepository;
                    private PaymentGateway paymentGateway;
                    
                    public PaymentService() {}
                    
                    @Autowired
                    public PaymentService(UserRepository userRepository, PaymentGateway paymentGateway) {
                        this.userRepository = userRepository;
                        this.paymentGateway = paymentGateway;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            assert.ok(codeLenses, 'Should return CodeLens array');
            
            // Should create CodeLens only for @Autowired constructor parameters
            const constructorCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('userRepository') || 
                cl.command?.title.includes('paymentGateway')
            );
            
            assert.strictEqual(constructorCodeLenses.length, 2, 'Should provide CodeLens for @Autowired constructor parameters');
        });

        test('should_notProvideCodeLens_when_multipleConstructorsWithoutAutowired', async () => {
            // Arrange: Multiple constructors without @Autowired
            const javaContent = `
                @Service
                public class NotificationService {
                    private EmailService emailService;
                    
                    public NotificationService() {}
                    
                    public NotificationService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            const constructorCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('emailService')
            );
            
            // No injection without @Autowired in multiple constructors
            assert.strictEqual(constructorCodeLenses.length, 0, 'Should not provide CodeLens for ambiguous constructors');
        });

        test('should_handleMultipleCandidates_when_interfaceHasMultipleImplementations', async () => {
            // Arrange: Interface with multiple implementations
            const impl1: import('../../models/spring-types').BeanDefinition = createImplementationBean(
                'notificationService1', 
                'EmailNotificationService', 
                'com.example.service.EmailNotificationService',
                ['NotificationService']
            );
            const impl2: import('../../models/spring-types').BeanDefinition = createImplementationBean(
                'notificationService2', 
                'SmsNotificationService', 
                'com.example.service.SmsNotificationService',
                ['NotificationService']
            );
            
            mockBeanResolver.addBeanDefinition(impl1);
            mockBeanResolver.addBeanDefinition(impl2);
            
            const javaContent = `
                @Service
                public class UserService {
                    private final NotificationService notificationService;
                    
                    public UserService(NotificationService notificationService) {
                        this.notificationService = notificationService;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            const notificationCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('Multiple candidates')
            );
            
            assert.ok(notificationCodeLens, 'Should show multiple candidates message');
            assert.strictEqual(notificationCodeLens.command?.command, 'spring-bean-navigator.selectBean');
        });
    });

    suite('provideSetterCodeLenses', () => {
        test('should_provideCodeLens_when_autowiredSetterExists', async () => {
            // Arrange: Spring service with @Autowired setter
            const javaContent = `
                package com.example.service;

                import org.springframework.beans.factory.annotation.Autowired;
                import org.springframework.stereotype.Service;
                import com.example.service.EmailService;
                import com.example.repository.UserRepository;

                @Service
                public class UserService {
                    private EmailService emailService;
                    private UserRepository userRepository;
                    
                    @Autowired
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            assert.ok(codeLenses, 'Should return CodeLens array');
            
            // Should create CodeLens for 2 setter parameters
            const setterCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('emailService') || 
                cl.command?.title.includes('userRepository')
            );
            
            assert.strictEqual(setterCodeLenses.length, 2, 'Should provide CodeLens for setter parameters');
            
            // Verify EmailService setter CodeLens
            const emailSetterCodeLens = setterCodeLenses.find(cl => 
                cl.command?.title.includes('emailService')
            );
            assert.ok(emailSetterCodeLens, 'Should have CodeLens for EmailService setter parameter');
            assert.strictEqual(emailSetterCodeLens.command?.command, 'spring-bean-navigator.goToBean');
            
            // Verify UserRepository setter CodeLens
            const userRepoSetterCodeLens = setterCodeLenses.find(cl => 
                cl.command?.title.includes('userRepository')
            );
            assert.ok(userRepoSetterCodeLens, 'Should have CodeLens for UserRepository setter parameter');
            assert.strictEqual(userRepoSetterCodeLens.command?.command, 'spring-bean-navigator.goToBean');
        });

        test('should_notProvideCodeLens_when_setterWithoutAutowired', async () => {
            // Arrange: Setter without @Autowired
            const javaContent = `
                @Service
                public class UserService {
                    private EmailService emailService;
                    
                    public void setEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            const setterCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('emailService')
            );
            
            // No injection for setter without @Autowired
            assert.strictEqual(setterCodeLenses.length, 0, 'Should not provide CodeLens for non-autowired setters');
        });

        test('should_notProvideCodeLens_when_autowiredButNotSetter', async () => {
            // Arrange: @Autowired but not a setter method
            const javaContent = `
                @Service
                public class UserService {
                    private EmailService emailService;
                    
                    @Autowired
                    public void initializeEmailService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            const methodCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('emailService')
            );
            
            // Methods not following setXxx pattern are not considered setter injection
            assert.strictEqual(methodCodeLenses.length, 0, 'Should not provide CodeLens for non-setter methods');
        });
    });

    suite('provideMixedInjectionCodeLenses', () => {
        test('should_provideCodeLenses_when_fieldConstructorSetterCombined', async () => {
            // Arrange: Mixed field, constructor, and setter injection
            const javaContent = `
                package com.example.service;

                import org.springframework.beans.factory.annotation.Autowired;
                import org.springframework.stereotype.Service;
                import com.example.repository.UserRepository;
                import com.example.service.EmailService;
                import com.example.gateway.PaymentGateway;

                @Service
                public class UserService {
                    @Autowired
                    private UserRepository userRepository;
                    
                    private final EmailService emailService;
                    private PaymentGateway paymentGateway;
                    
                    public UserService(EmailService emailService) {
                        this.emailService = emailService;
                    }
                    
                    @Autowired
                    public void setPaymentGateway(PaymentGateway paymentGateway) {
                        this.paymentGateway = paymentGateway;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            assert.ok(codeLenses, 'Should return CodeLens array');
            
            // Should create CodeLens for all 3 injection types
            const allInjectionCodeLenses = codeLenses.filter(cl => 
                cl.command?.title.includes('userRepository') || 
                cl.command?.title.includes('emailService') ||
                cl.command?.title.includes('paymentGateway')
            );
            
            assert.strictEqual(allInjectionCodeLenses.length, 3, 'Should provide CodeLens for all injection types');
            
            // Verify each injection type
            const fieldCodeLens = allInjectionCodeLenses.find(cl => 
                cl.command?.title.includes('userRepository')
            );
            assert.ok(fieldCodeLens, 'Should have CodeLens for field injection');
            
            const constructorCodeLens = allInjectionCodeLenses.find(cl => 
                cl.command?.title.includes('emailService')
            );
            assert.ok(constructorCodeLens, 'Should have CodeLens for constructor injection');
            
            const setterCodeLens = allInjectionCodeLenses.find(cl => 
                cl.command?.title.includes('paymentGateway')
            );
            assert.ok(setterCodeLens, 'Should have CodeLens for setter injection');
        });

        test('should_notProvideCodeLens_when_beanDoesNotExist', async () => {
            // Arrange: Non-existent Bean type
            const javaContent = `
                @Service
                public class UserService {
                    private final UnknownService unknownService;
                    
                    public UserService(UnknownService unknownService) {
                        this.unknownService = unknownService;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            const unknownServiceCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('UnknownService') || 
                cl.command?.title.includes('Bean not found')
            );
            
            assert.strictEqual(unknownServiceCodeLens, undefined, 'Should not provide CodeLens for unknown beans');
            assert.strictEqual(codeLenses.length, 0, 'Should return empty array when no beans are found');
        });

        test('should_notProvideCodeLens_when_autowiredFieldBeanNotFound', async () => {
            // Arrange: @Autowired field but Bean not found
            const javaContent = `
                package com.example.service;

                import org.springframework.beans.factory.annotation.Autowired;
                import org.springframework.stereotype.Service;
                import com.example.repository.UserRepository;

                @Service
                public class UserService {
                    @Autowired
                    private NonExistentService nonExistentService;
                    
                    @Autowired
                    private UserRepository userRepository;
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            // Only UserRepository should have CodeLens
            const userRepoCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('userRepository')
            );
            assert.ok(userRepoCodeLens, 'Should provide CodeLens for existing bean');
            
            // NonExistentService should not have CodeLens
            const nonExistentCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('NonExistentService')
            );
            assert.strictEqual(nonExistentCodeLens, undefined, 'Should not provide CodeLens for non-existent bean');
            
            assert.strictEqual(codeLenses.length, 1, 'Should only provide CodeLens for existing beans');
        });

        test('should_notProvideCodeLens_when_setterBeanNotFound', async () => {
            // Arrange: @Autowired setter but Bean not found
            const javaContent = `
                @Service
                public class UserService {
                    private UnknownService unknownService;
                    private UserRepository userRepository;
                    
                    @Autowired
                    public void setUnknownService(UnknownService unknownService) {
                        this.unknownService = unknownService;
                    }
                    
                    @Autowired
                    public void setUserRepository(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            // Only UserRepository setter should have CodeLens
            const userRepoCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('userRepository')
            );
            assert.ok(userRepoCodeLens, 'Should provide CodeLens for existing bean setter');
            
            // UnknownService setter should not have CodeLens
            const unknownCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('UnknownService')
            );
            assert.strictEqual(unknownCodeLens, undefined, 'Should not provide CodeLens for non-existent bean setter');
            
            assert.strictEqual(codeLenses.length, 1, 'Should only provide CodeLens for existing beans');
        });

        test('should_notProvideCodeLens_when_collectionBeanNotFound', async () => {
            // Arrange: Collection type but Bean not found
            const javaContent = `
                @Service
                public class UserService {
                    @Autowired
                    private List<NonExistentService> nonExistentServices;
                    
                    @Autowired
                    private List<UserRepository> userRepositories; // This exists
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            // Only UserRepository collection should have CodeLens
            const userRepoCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('userRepository')
            );
            assert.ok(userRepoCodeLens, 'Should provide CodeLens for existing bean collection');
            
            // NonExistentService collection should not have CodeLens
            const nonExistentCodeLens = codeLenses.find(cl => 
                cl.command?.title.includes('NonExistentService')
            );
            assert.strictEqual(nonExistentCodeLens, undefined, 'Should not provide CodeLens for non-existent bean collection');
            
            assert.strictEqual(codeLenses.length, 1, 'Should only provide CodeLens for existing bean collections');
        });
    });

    suite('Performance and Edge Cases', () => {
        test('should_handleLargeClass_when_manyInjectionsPresent', async () => {
            // Arrange: Large class with many injections
            const dependencies = [];
            for (let i = 0; i < 10; i++) {
                dependencies.push(`EmailService emailService${i}`);
                const bean: import('../../models/spring-types').BeanDefinition = createBeanDefinition(`emailService${i}`, 'EmailService', 'com.example.service.EmailService');
                mockBeanResolver.addBeanDefinition(bean);
            }
            
            const javaContent = `
                @Service
                public class LargeService {
                    ${dependencies.map((dep, _) => `@Autowired\n    private ${dep};`).join('\n    ')}
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act
            const startTime = Date.now();
            const codeLenses = await provider.provideCodeLenses(document);
            const endTime = Date.now();
            
            // Assert
            assert.ok(codeLenses, 'Should return CodeLens array');
            assert.strictEqual(codeLenses.length, 10, 'Should handle many injections');
            assert.ok(endTime - startTime < 1000, 'Should complete within reasonable time'); // within 1 second
        });

        test('should_cacheResults_when_sameDocumentProcessedMultipleTimes', async () => {
            // Arrange
            const javaContent = `
                @Service
                public class UserService {
                    private final UserRepository userRepository;
                    
                    public UserService(UserRepository userRepository) {
                        this.userRepository = userRepository;
                    }
                }`;
            const document = createDocumentWithContent(javaContent);
            
            // Act: Process same document multiple times
            const codeLenses1 = await provider.provideCodeLenses(document);
            const codeLenses2 = await provider.provideCodeLenses(document);
            
            // Assert: Results should be consistent
            assert.strictEqual(codeLenses1.length, codeLenses2.length, 'Results should be consistent');
            
            if (codeLenses1.length > 0 && codeLenses2.length > 0) {
                assert.strictEqual(
                    codeLenses1[0].command?.title, 
                    codeLenses2[0].command?.title, 
                    'CodeLens titles should be identical'
                );
            }
        });
    });
});

// Helper functions for testing
function createBeanDefinition(name: string, type: string, implementationClass: string): import('../../models/spring-types').BeanDefinition {
    return {
        name,
        type,
        implementationClass,
        fileUri: vscode.Uri.file(`/test/${name}.java`),
        position: new vscode.Position(5, 0),
        definitionType: 'class',
        annotation: 'Service' as any,
        beanName: name,
        className: type,
        annotationType: 'Service' as any,
        fullyQualifiedName: implementationClass
    };
}

function createImplementationBean(name: string, type: string, fullyQualifiedName: string, interfaces: string[]): import('../../models/spring-types').BeanDefinition {
    const bean = createBeanDefinition(name, type, fullyQualifiedName);
    (bean as any).interfaces = interfaces;
    return bean;
}

// Simplified helper functions
function createDocumentWithLanguage(languageId: string): vscode.TextDocument {
    return {
        languageId,
        getText: () => '',
        uri: vscode.Uri.file('/test/TestFile'),
    } as any;
}

function createDocumentWithContent(content: string): vscode.TextDocument {
    return {
        languageId: 'java',
        getText: () => content,
        uri: vscode.Uri.file('/test/TestFile.java'),
    } as any;
} 