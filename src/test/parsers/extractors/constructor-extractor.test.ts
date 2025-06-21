import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConstructorExtractor } from '../../../parsers/extractors/constructor-extractor';
import { ConstructorInfo, ParameterInfo, SpringAnnotationType } from '../../../models/spring-types';

suite('🔧 ConstructorExtractor Test Suite', () => {
    
    let constructorExtractor: ConstructorExtractor;
    
    setup(() => {
        constructorExtractor = new ConstructorExtractor();
    });
    
    suite('extractConstructors', () => {
        
        test('should_extractSingleConstructor_when_classHasOneConstructor', () => {
            // Arrange
            const javaCode = `
public class UserService {
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(javaCode, vscode.Uri.file('/test/UserService.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 1, '생성자가 1개 추출되어야 함');
            
            const constructor = constructors[0];
            assert.strictEqual(constructor.parameters.length, 1, '매개변수가 1개여야 함');
            assert.strictEqual(constructor.parameters[0].name, 'userRepository', '매개변수 이름이 올바르지 않음');
            assert.strictEqual(constructor.parameters[0].type, 'UserRepository', '매개변수 타입이 올바르지 않음');
            assert.strictEqual(constructor.hasAutowiredAnnotation, false, '단일 생성자는 @Autowired가 없어야 함');
            assert.ok(constructor.position, 'position 정보가 있어야 함');
            assert.ok(constructor.range, 'range 정보가 있어야 함');
        });
        
        test('should_extractMultipleConstructors_when_classHasMultipleConstructors', () => {
            // Arrange
            const javaCode = `
public class PaymentService {
    private UserRepository userRepository;
    private PaymentGateway paymentGateway;
    
    public PaymentService() {
        // 기본 생성자
    }
    
    @Autowired
    public PaymentService(UserRepository userRepository, PaymentGateway paymentGateway) {
        this.userRepository = userRepository;
        this.paymentGateway = paymentGateway;
    }
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(javaCode, vscode.Uri.file('/test/PaymentService.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 2, '생성자가 2개 추출되어야 함');
            
            // 기본 생성자 (매개변수 없음)
            const defaultConstructor = constructors.find(c => c.parameters.length === 0);
            assert.ok(defaultConstructor, '기본 생성자가 존재해야 함');
            assert.strictEqual(defaultConstructor.hasAutowiredAnnotation, false, '기본 생성자는 @Autowired가 없어야 함');
            
            // @Autowired 생성자
            const autowiredConstructor = constructors.find(c => c.parameters.length === 2);
            assert.ok(autowiredConstructor, '@Autowired 생성자가 존재해야 함');
            assert.strictEqual(autowiredConstructor.hasAutowiredAnnotation, true, '@Autowired 어노테이션이 있어야 함');
            assert.strictEqual(autowiredConstructor.parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입이 올바르지 않음');
            assert.strictEqual(autowiredConstructor.parameters[1].type, 'PaymentGateway', '두 번째 매개변수 타입이 올바르지 않음');
        });
        
        test('should_extractParameterInfo_when_constructorHasParameters', () => {
            // Arrange
            const javaCode = `
public class OrderService {
    public OrderService(UserRepository userRepo, EmailService emailSvc, SmsService smsSvc) {
        // 생성자 구현
    }
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(javaCode, vscode.Uri.file('/test/OrderService.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 1, '생성자가 1개여야 함');
            
            const constructor = constructors[0];
            assert.strictEqual(constructor.parameters.length, 3, '매개변수가 3개여야 함');
            
            // 첫 번째 매개변수
            assert.strictEqual(constructor.parameters[0].name, 'userRepo', '첫 번째 매개변수 이름이 올바르지 않음');
            assert.strictEqual(constructor.parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입이 올바르지 않음');
            
            // 두 번째 매개변수
            assert.strictEqual(constructor.parameters[1].name, 'emailSvc', '두 번째 매개변수 이름이 올바르지 않음');
            assert.strictEqual(constructor.parameters[1].type, 'EmailService', '두 번째 매개변수 타입이 올바르지 않음');
            
            // 세 번째 매개변수
            assert.strictEqual(constructor.parameters[2].name, 'smsSvc', '세 번째 매개변수 이름이 올바르지 않음');
            assert.strictEqual(constructor.parameters[2].type, 'SmsService', '세 번째 매개변수 타입이 올바르지 않음');
        });
        
        test('should_handleGenericTypes_when_constructorHasGenericParameters', () => {
            // Arrange
            const javaCode = `
public class GenericService {
    public GenericService(List<User> users, Optional<EmailService> emailService, Map<String, Repository> repos) {
        // 제네릭 타입 생성자
    }
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(javaCode, vscode.Uri.file('/test/GenericService.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 1, '생성자가 1개여야 함');
            
            const constructor = constructors[0];
            assert.strictEqual(constructor.parameters.length, 3, '매개변수가 3개여야 함');
            
            assert.strictEqual(constructor.parameters[0].type, 'List<User>', '제네릭 List 타입이 올바르지 않음');
            assert.strictEqual(constructor.parameters[1].type, 'Optional<EmailService>', 'Optional 제네릭 타입이 올바르지 않음');
            assert.strictEqual(constructor.parameters[2].type, 'Map<String, Repository>', 'Map 제네릭 타입이 올바르지 않음');
        });
        
        test('should_returnEmptyArray_when_noConstructorsFound', () => {
            // Arrange
            const javaCode = `
public interface UserRepository {
    void save(User user);
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(javaCode, vscode.Uri.file('/test/UserRepository.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 0, '인터페이스에는 생성자가 없어야 함');
        });
        
        test('should_handleComplexConstructor_when_annotationsAndModifiersPresent', () => {
            // Arrange
            const javaCode = `
public class ComplexService {
    @Autowired
    public ComplexService(
        @Qualifier("primary") UserRepository userRepository,
        @Value("\${app.name}") String appName,
        Optional<EmailService> emailService
    ) {
        // 복잡한 생성자
    }
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(javaCode, vscode.Uri.file('/test/ComplexService.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 1, '생성자가 1개여야 함');
            
            const constructor = constructors[0];
            assert.strictEqual(constructor.hasAutowiredAnnotation, true, '@Autowired 어노테이션이 있어야 함');
            assert.strictEqual(constructor.parameters.length, 3, '매개변수가 3개여야 함');
            
            // 매개변수들 확인 (어노테이션은 무시하고 타입과 이름만)
            assert.strictEqual(constructor.parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입');
            assert.strictEqual(constructor.parameters[1].type, 'String', '두 번째 매개변수 타입');
            assert.strictEqual(constructor.parameters[2].type, 'Optional<EmailService>', '세 번째 매개변수 타입');
        });
    });
    
    suite('parseConstructorDeclaration', () => {
        
        test('should_parseConstructorDeclaration_when_validConstructorProvided', () => {
            // Arrange
            const constructorLine = 'public UserService(UserRepository userRepository, EmailService emailService)';
            
            // Act
            const result = constructorExtractor.parseConstructorDeclaration(constructorLine);
            
            // Assert
            assert.ok(result, '생성자 파싱 결과가 존재해야 함');
            assert.strictEqual(result.parameters.length, 2, '매개변수가 2개 파싱되어야 함');
            assert.strictEqual(result.parameters[0].name, 'userRepository', '첫 번째 매개변수 이름');
            assert.strictEqual(result.parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입');
            assert.strictEqual(result.parameters[1].name, 'emailService', '두 번째 매개변수 이름');
            assert.strictEqual(result.parameters[1].type, 'EmailService', '두 번째 매개변수 타입');
        });
        
        test('should_returnUndefined_when_invalidConstructorDeclaration', () => {
            // Arrange
            const invalidLine = 'public void someMethod(String param)';
            
            // Act
            const result = constructorExtractor.parseConstructorDeclaration(invalidLine);
            
            // Assert
            assert.strictEqual(result, undefined, '메소드는 생성자로 파싱되지 않아야 함');
        });
    });
    
    suite('detectAutowiredAnnotation', () => {
        
        test('should_returnTrue_when_autowiredAnnotationPresent', () => {
            // Arrange
            const javaLines = [
                '@Autowired',
                'public UserService(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = constructorExtractor.detectAutowiredAnnotation(javaLines, 1);
            
            // Assert
            assert.strictEqual(hasAutowired, true, '@Autowired 어노테이션이 감지되어야 함');
        });
        
        test('should_returnFalse_when_noAutowiredAnnotation', () => {
            // Arrange
            const javaLines = [
                'public UserService(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = constructorExtractor.detectAutowiredAnnotation(javaLines, 0);
            
            // Assert
            assert.strictEqual(hasAutowired, false, '@Autowired 어노테이션이 없으면 false여야 함');
        });
        
        test('should_returnTrue_when_autowiredWithImport', () => {
            // Arrange
            const javaLines = [
                '@org.springframework.beans.factory.annotation.Autowired',
                'public UserService(UserRepository userRepository) {'
            ];
            
            // Act
            const hasAutowired = constructorExtractor.detectAutowiredAnnotation(javaLines, 1);
            
            // Assert
            assert.strictEqual(hasAutowired, true, '완전한 패키지명의 @Autowired도 감지되어야 함');
        });
    });
    
    suite('extractParametersFromDeclaration', () => {
        
        test('should_extractParameters_when_multipleParametersProvided', () => {
            // Arrange
            const parametersPart = 'UserRepository userRepo, EmailService emailSvc, String appName';
            
            // Act
            const parameters = constructorExtractor.extractParametersFromDeclaration(parametersPart);
            
            // Assert
            assert.strictEqual(parameters.length, 3, '매개변수가 3개 추출되어야 함');
            
            assert.strictEqual(parameters[0].name, 'userRepo', '첫 번째 매개변수 이름');
            assert.strictEqual(parameters[0].type, 'UserRepository', '첫 번째 매개변수 타입');
            
            assert.strictEqual(parameters[1].name, 'emailSvc', '두 번째 매개변수 이름');
            assert.strictEqual(parameters[1].type, 'EmailService', '두 번째 매개변수 타입');
            
            assert.strictEqual(parameters[2].name, 'appName', '세 번째 매개변수 이름');
            assert.strictEqual(parameters[2].type, 'String', '세 번째 매개변수 타입');
        });
        
        test('should_handleGenericParameters_when_genericTypesProvided', () => {
            // Arrange
            const parametersPart = 'List<User> users, Map<String, Repository> repositories';
            
            // Act
            const parameters = constructorExtractor.extractParametersFromDeclaration(parametersPart);
            
            // Assert
            assert.strictEqual(parameters.length, 2, '매개변수가 2개 추출되어야 함');
            assert.strictEqual(parameters[0].type, 'List<User>', '제네릭 List 타입이 올바르지 않음');
            assert.strictEqual(parameters[1].type, 'Map<String, Repository>', '제네릭 Map 타입이 올바르지 않음');
        });
        
        test('should_returnEmptyArray_when_noParameters', () => {
            // Arrange
            const parametersPart = '';
            
            // Act
            const parameters = constructorExtractor.extractParametersFromDeclaration(parametersPart);
            
            // Assert
            assert.strictEqual(parameters.length, 0, '매개변수가 없으면 빈 배열이어야 함');
        });
    });
    
    suite('Error Handling', () => {
        
        test('should_handleEmptyContent_when_emptyStringProvided', () => {
            // Arrange
            const emptyContent = '';
            
            // Act
            const constructors = constructorExtractor.extractConstructors(emptyContent, vscode.Uri.file('/test/Empty.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 0, '빈 내용에서는 생성자가 없어야 함');
        });
        
        test('should_handleMalformedJava_when_invalidSyntaxProvided', () => {
            // Arrange
            const malformedJava = 'public class Broken { invalid syntax ';
            
            // Act & Assert
            // 에러가 발생하지 않고 빈 배열 반환해야 함
            assert.doesNotThrow(() => {
                const constructors = constructorExtractor.extractConstructors(malformedJava, vscode.Uri.file('/test/Broken.java'));
                assert.strictEqual(constructors.length, 0, '잘못된 구문에서는 생성자가 없어야 함');
            });
        });
        
        test('should_handleNullInput_when_nullProvided', () => {
            // Act & Assert
            assert.doesNotThrow(() => {
                const constructors = constructorExtractor.extractConstructors(null as any, vscode.Uri.file('/test/Null.java'));
                assert.strictEqual(constructors.length, 0, 'null 입력에서는 생성자가 없어야 함');
            });
        });
    });
    
    suite('Integration Tests', () => {
        
        test('should_handleRealWorldExample_when_completeSpringServiceProvided', () => {
            // Arrange - 실제 Spring Service 예시
            const realWorldJava = `
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.repository.UserRepository;
import com.example.service.EmailService;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    @Autowired
    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    
    public void createUser(String name) {
        // 메소드 구현
    }
}`;
            
            // Act
            const constructors = constructorExtractor.extractConstructors(realWorldJava, vscode.Uri.file('/test/UserService.java'));
            
            // Assert
            assert.strictEqual(constructors.length, 1, '실제 Spring Service에서 생성자 1개 추출');
            
            const constructor = constructors[0];
            assert.strictEqual(constructor.hasAutowiredAnnotation, true, '@Autowired 어노테이션 감지');
            assert.strictEqual(constructor.parameters.length, 2, '매개변수 2개');
            assert.strictEqual(constructor.parameters[0].type, 'UserRepository', 'UserRepository 타입');
            assert.strictEqual(constructor.parameters[1].type, 'EmailService', 'EmailService 타입');
        });
    });
}); 