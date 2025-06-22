import * as vscode from 'vscode';
import { 
    ClassInfo, 
    FieldInfo, 
    AnnotationInfo, 
    SpringAnnotationType, 
    BeanDefinition, 
    InjectionInfo, 
    InjectionType,
    ParameterInfo,
    VirtualConstructorInfo,
    LombokAnnotationInfo,
    LombokFieldAnalysis,
    LombokSimulationResult
} from '../../models/spring-types';

/**
 * 테스트용 유틸리티 클래스
 */
export class TestUtils {
    
    /**
     * 테스트용 가짜 URI를 생성합니다.
     */
    public static createMockUri(path: string = '/test/TestClass.java'): vscode.Uri {
        return vscode.Uri.file(path);
    }

    /**
     * 테스트용 Position을 생성합니다.
     */
    public static createPosition(line: number = 0, character: number = 0): vscode.Position {
        return new vscode.Position(line, character);
    }

    /**
     * 테스트용 Range를 생성합니다.
     */
    public static createRange(
        startLine: number = 0, 
        startChar: number = 0, 
        endLine: number = 0, 
        endChar: number = 10
    ): vscode.Range {
        return new vscode.Range(
            new vscode.Position(startLine, startChar),
            new vscode.Position(endLine, endChar)
        );
    }

    /**
     * 테스트용 어노테이션 정보를 생성합니다.
     */
    public static createAnnotationInfo(
        name: string = 'Autowired',
        type: SpringAnnotationType = SpringAnnotationType.AUTOWIRED,
        line: number = 0,
        column: number = 0
    ): AnnotationInfo {
        return {
            name,
            type,
            line,
            column,
            parameters: new Map()
        };
    }

    /**
     * 테스트용 필드 정보를 생성합니다.
     */
    public static createFieldInfo(
        name: string = 'testField',
        type: string = 'TestService',
        annotations: AnnotationInfo[] = [],
        line: number = 1
    ): FieldInfo {
        return {
            name,
            type,
            position: this.createPosition(line, 0),
            range: this.createRange(line, 0, line, name.length),
            annotations,
            visibility: 'private',
            isFinal: false,
            isStatic: false
        };
    }

    /**
     * 테스트용 클래스 정보를 생성합니다.
     */
    public static createClassInfo(
        name: string = 'TestClass',
        packageName: string = 'com.example.test',
        fields: FieldInfo[] = [],
        annotations: AnnotationInfo[] = []
    ): ClassInfo {
        return {
            name,
            packageName,
            fullyQualifiedName: `${packageName}.${name}`,
            fileUri: this.createMockUri(`/test/${name}.java`),
            position: this.createPosition(0, 0),
            range: this.createRange(0, 0, 10, 0),
            annotations,
            fields,
            imports: []
        };
    }

    /**
     * 테스트용 Bean 정의를 생성합니다.
     */
    public static createBeanDefinition(
        name: string = 'testService',
        type: string = 'TestService',
        implementationClass: string = 'com.example.TestService'
    ): BeanDefinition {
        const className = type;
        const fullyQualifiedName = implementationClass;
        
        return {
            name,
            type,
            implementationClass,
            fileUri: this.createMockUri(`/test/${type}.java`),
            position: this.createPosition(0, 0),
            definitionType: 'class',
            annotation: SpringAnnotationType.SERVICE,
            // 편의 속성들
            beanName: name,
            className,
            annotationType: SpringAnnotationType.SERVICE,
            fullyQualifiedName
        };
    }

    /**
     * 테스트용 주입 정보를 생성합니다.
     */
    public static createInjectionInfo(
        targetType: string = 'TestService',
        targetName: string = 'testService',
        injectionType: InjectionType = InjectionType.FIELD
    ): InjectionInfo {
        return {
            targetType,
            injectionType,
            position: this.createPosition(1, 0),
            range: this.createRange(1, 0, 1, targetName.length),
            targetName,
            resolvedBean: undefined,
            candidateBeans: undefined
        };
    }

    /**
     * ParameterInfo 객체를 생성합니다. (Phase 2에서 추가)
     */
    public static createParameterInfo(
        name: string = 'testParam',
        type: string = 'TestType',
        line: number = 1,
        column: number = 4
    ): ParameterInfo {
        return {
            name,
            type,
            position: this.createPosition(line, column)
        };
    }
}

/**
 * Java 파일 샘플 생성기
 */
export class JavaSampleGenerator {
    
    /**
     * @Autowired 필드가 있는 간단한 Java 클래스
     */
    public static simpleAutowiredClass(): string {
        return `
            package com.example.service;

            import org.springframework.beans.factory.annotation.Autowired;
            import org.springframework.stereotype.Service;
            import com.example.repository.UserRepository;

            @Service
            public class UserService {
                
                @Autowired
                private UserRepository userRepository;
                
                public void saveUser() {
                    // 구현
                }
            }
        `.trim();
    }

    /**
     * 여러 @Autowired 필드가 있는 Java 클래스
     */
    public static multipleAutowiredFields(): string {
        return `
            package com.example.service;

            import org.springframework.beans.factory.annotation.Autowired;
            import org.springframework.stereotype.Service;
            import com.example.repository.UserRepository;
            import com.example.service.EmailService;

            @Service
            public class UserService {
                
                @Autowired
                private UserRepository userRepository;
                
                @Autowired
                private EmailService emailService;
                
                private String nonAutowiredField;
                
                public void processUser() {
                    // 구현
                }
            }
        `.trim();
    }

    /**
     * @Autowired가 없는 Java 클래스
     */
    public static noAutowiredClass(): string {
        return `
        package com.example.model;

        public class User {
            private String name;
            private String email;
            
            public String getName() {
                return name;
            }
            
            public void setName(String name) {
                this.name = name;
            }
        }
        `.trim();
    }

    /**
     * @Component 어노테이션이 있는 Java 클래스
     */
    public static componentClass(): string {
        return `
        package com.example.component;

        import org.springframework.stereotype.Component;
        import org.springframework.beans.factory.annotation.Autowired;
        import com.example.service.DataService;

        @Component
        public class DataProcessor {
            
            @Autowired
            private DataService dataService;
            
            public void processData() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 잘못된 문법의 Java 파일 (파싱 에러 테스트용)
     */
    public static invalidJavaFile(): string {
        return `
        package com.example;

        import org.springframework.stereotype.Service

        @Service  // 세미콜론 누락
        public class InvalidService {
            @Autowired
            private SomeService someService  // 세미콜론 누락
            
            public void method() {
                // 중괄호 누락
            
        }
        `.trim();
    }

    /**
     * 빈 Java 파일
     */
    public static emptyJavaFile(): string {
        return '';
    }

    /**
     * 패키지 선언만 있는 Java 파일
     */
    public static packageOnlyFile(): string {
        return 'package com.example;';
    }

    /**
     * @Repository 어노테이션이 있는 Java 클래스
     */
    public static repositoryClass(): string {
        return `
        package com.example.repository;

        import org.springframework.stereotype.Repository;

        @Repository
        public class UserRepository {
            
            public void findById(Long id) {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * @Configuration과 @Bean이 있는 Java 클래스
     */
    public static configurationClass(): string {
        return `
        package com.example.config;

        import org.springframework.context.annotation.Configuration;
        import org.springframework.context.annotation.Bean;
        import com.example.service.ExternalService;

        @Configuration
        public class AppConfig {
            
            @Bean
            public ExternalService externalService() {
                return new ExternalService();
            }
        }
        `.trim();
    }

    /**
     * @Service 어노테이션이 있는 Java 클래스 (Spring Bean 탐지용)
     */
    public static serviceClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class UserService {
            public void saveUser() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * @Controller 어노테이션이 있는 Java 클래스
     */
    public static controllerClass(): string {
        return `
        package com.example.controller;

        import org.springframework.stereotype.Controller;

        @Controller
        public class UserController {
            public String getUsers() {
                return "users";
            }
        }
        `.trim();
    }

    /**
     * @RestController 어노테이션이 있는 Java 클래스
     */
    public static restControllerClass(): string {
        return `
        package com.example.controller;

        import org.springframework.web.bind.annotation.RestController;

        @RestController
        public class ApiController {
            public String getApi() {
                return "api";
            }
        }
        `.trim();
    }

    /**
     * @Configuration 어노테이션만 있는 Java 클래스
     */
    public static configurationOnlyClass(): string {
        return `
        package com.example.config;

        import org.springframework.context.annotation.Configuration;

        @Configuration
        public class AppConfig {
            // 설정 클래스
        }
        `.trim();
    }

    /**
     * @Configuration과 @Bean 메소드들이 있는 Java 클래스
     */
    public static configurationWithBeanMethods(): string {
        return `
        package com.example.config;

        import org.springframework.context.annotation.Bean;
        import org.springframework.context.annotation.Configuration;

        @Configuration
        public class DatabaseConfig {
            
            @Bean
            public DataSource dataSource() {
                return new HikariDataSource();
            }
            
            @Bean
            public EntityManagerFactory entityManagerFactory() {
                return new LocalEntityManagerFactory();
            }
        }
        `.trim();
    }

    /**
     * 여러 Spring Bean 어노테이션이 있는 Java 클래스
     */
    public static multipleBeansClass(): string {
        return `
        package com.example.mixed;

        import org.springframework.stereotype.Service;
        import org.springframework.stereotype.Repository;

        @Service
        public class UserService {
            // 서비스 구현
        }

        @Repository
        class UserRepository {
            // 레포지토리 구현
        }
        `.trim();
    }

    /**
     * Spring 어노테이션이 없는 일반 Java 클래스
     */
    public static plainJavaClass(): string {
        return `
        package com.example.plain;

        public class PlainJavaClass {
            public void doSomething() {
                // 일반 Java 클래스
            }
        }
        `.trim();
    }

    /**
     * 커스텀 Bean 이름을 가진 Service 클래스
     */
    public static customBeanNameService(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service("customUserService")
        public class UserService {
            // 구현
        }
        `.trim();
    }

    /**
     * 인터페이스를 구현하는 클래스
     */
    public static interfaceImplementationClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class MessageServiceImpl implements MessageService {
            
            public void sendMessage(String message) {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 여러 인터페이스를 구현하는 클래스
     */
    public static multipleInterfaceImplementationClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class MultiServiceImpl implements MessageService, NotificationService {
            
            public void sendMessage(String message) {
                // 구현
            }
            
            public void sendNotification(String notification) {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 상속만 하고 인터페이스 구현은 하지 않는 클래스
     */
    public static extendsOnlyClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class ExtendedService extends BaseService {
            
            public void extendedMethod() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 인터페이스를 구현하면서 @Autowired 필드도 가지는 클래스
     */
    public static autowiredImplementationClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;

        @Service
        public class MessageServiceImpl implements MessageService {
            
            @Autowired
            private NotificationService notificationService;
            
            public void sendMessage(String message) {
                notificationService.sendNotification(message);
            }
        }
        `.trim();
    }

    /**
     * 제네릭 인터페이스를 구현하는 클래스
     */
    public static genericInterfaceImplementationClass(): string {
        return `
        package com.example.repository;

        import org.springframework.stereotype.Repository;

        @Repository
        public class UserRepositoryImpl implements Repository<User, Long> {
            
            public User findById(Long id) {
                // 구현
                return null;
            }
            
            public void save(User entity) {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 인터페이스를 구현하지 않는 일반 클래스
     */
    public static noInterfaceClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class StandaloneService {
            
            public void doSomething() {
                // 구현
            }
        }
        `.trim();
    }

    // ===== Phase 2: 생성자 주입 및 Setter 주입 테스트용 샘플 =====

    /**
     * 단일 생성자 주입 (Spring 5.0+ @Autowired 생략)
     */
    public static singleConstructorInjection(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class OrderService {
            private final UserRepository userRepository;
            private final ProductRepository productRepository;
            
            public OrderService(UserRepository userRepository, ProductRepository productRepository) {
                this.userRepository = userRepository;
                this.productRepository = productRepository;
            }
            
            public void processOrder() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 다중 생성자 중 @Autowired가 붙은 생성자
     */
    public static multipleConstructorWithAutowired(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;

        @Service
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
            
            public void processPayment() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * Setter 주입 (@Autowired setter 메서드)
     */
    public static setterInjection(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;

        @Service
        public class NotificationService {
            private EmailService emailService;
            private SmsService smsService;
            
            @Autowired
            public void setEmailService(EmailService emailService) {
                this.emailService = emailService;
            }
            
            @Autowired
            public void setSmsService(SmsService smsService) {
                this.smsService = smsService;
            }
            
            public void sendNotification() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 혼합 주입 (필드 + 생성자 + Setter)
     */
    public static mixedInjection(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;

        @Service
        public class UserService {
            @Autowired
            private UserRepository userRepository; // 필드 주입
            
            private final EmailService emailService; // 생성자 주입
            private SmsService smsService; // Setter 주입
            
            public UserService(EmailService emailService) {
                this.emailService = emailService;
            }
            
            @Autowired
            public void setSmsService(SmsService smsService) {
                this.smsService = smsService;
            }
            
            public void processUser() {
                // 구현
            }
        }
        `.trim();
    }

    /**
     * 복잡한 생성자 주입 (여러 어노테이션, 제네릭 타입)
     */
    public static complexConstructorInjection(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;
        import org.springframework.beans.factory.annotation.Qualifier;
        import org.springframework.beans.factory.annotation.Value;

        @Service
        public class ComplexService {
            private final Repository<User> userRepository;
            private final List<MessageService> messageServices;
            private final String configValue;
            
            @Autowired
            public ComplexService(
                @Qualifier("userRepo") Repository<User> userRepository,
                List<MessageService> messageServices,
                @Value("\${app.config}") String configValue
            ) {
                this.userRepository = userRepository;
                this.messageServices = messageServices;
                this.configValue = configValue;
            }
        }
        `.trim();
    }

    /**
     * 복잡한 Setter 주입 (여러 어노테이션, 제네릭 타입)
     */
    public static complexSetterInjection(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;
        import org.springframework.beans.factory.annotation.Qualifier;
        import org.springframework.beans.factory.annotation.Value;

        @Service
        public class ComplexSetterService {
            private Repository<User> userRepository;
            private String configValue;
            
            @Autowired
            @Qualifier("primary")
            public void setUserRepository(Repository<User> userRepository) {
                this.userRepository = userRepository;
            }
            
            @Autowired
            public void setConfigValue(@Value("\${app.name}") String configValue) {
                this.configValue = configValue;
            }
        }
        `.trim();
    }
}

/**
 * Mock 객체 생성 헬퍼
 */
export class MockHelper {
    
    /**
     * java-parser의 parse 함수를 모킹합니다.
     */
    public static createMockParseFunction() {
        return (content: string) => {
            // 간단한 가짜 CST 구조 반환
            if (content.includes('invalid')) {
                throw new Error('Parsing failed');
            }
            return {
                children: {
                    compilationUnit: [{
                        children: {
                            packageDeclaration: content.includes('package') ? [{
                                children: {
                                    packageName: [{
                                        children: {
                                            Identifier: [
                                                { image: 'com' },
                                                { image: 'example' },
                                                { image: 'service' }
                                            ]
                                        }
                                    }]
                                }
                            }] : undefined,
                            importDeclaration: content.includes('import') ? [
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
                                }
                            ] : [],
                            typeDeclaration: content.includes('class') ? [{
                                children: {
                                    classDeclaration: [{
                                        children: {
                                            normalClassDeclaration: [{
                                                children: {
                                                    typeIdentifier: [{
                                                        children: {
                                                            Identifier: [{ image: 'UserService' }]
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
                            }] : []
                        }
                    }]
                }
            };
        };
    }

    /**
     * VSCode Extension Context를 모킹합니다.
     */
    public static createMockExtensionContext(): Partial<vscode.ExtensionContext> {
        return {
            subscriptions: [],
            workspaceState: {} as any,
            globalState: {} as any,
            extensionUri: vscode.Uri.file('/test'),
            extensionPath: '/test',
            asAbsolutePath: (relativePath: string) => `/test/${relativePath}`,
            storagePath: '/test/storage',
            globalStoragePath: '/test/globalStorage',
            logPath: '/test/logs'
        };
    }
}

/**
 * 테스트 어설션 헬퍼
 */
export class AssertionHelper {
    
    /**
     * 두 Position이 같은지 확인합니다.
     */
    public static expectPositionEqual(actual: vscode.Position, expected: vscode.Position): void {
        const assert = require('assert');
        assert.strictEqual(actual.line, expected.line);
        assert.strictEqual(actual.character, expected.character);
    }

    /**
     * 두 Range가 같은지 확인합니다.
     */
    public static expectRangeEqual(actual: vscode.Range, expected: vscode.Range): void {
        this.expectPositionEqual(actual.start, expected.start);
        this.expectPositionEqual(actual.end, expected.end);
    }

    /**
     * 어노테이션 정보가 올바른지 확인합니다.
     */
    public static expectAnnotationValid(annotation: AnnotationInfo, expectedType: SpringAnnotationType): void {
        const assert = require('assert');
        assert.strictEqual(annotation.type, expectedType);
        assert.ok(annotation.name, 'Annotation name should be truthy');
        assert.ok(annotation.line >= 0, 'Annotation line should be >= 0');
        assert.ok(annotation.column >= 0, 'Annotation column should be >= 0');
    }

    /**
     * 필드 정보가 올바른지 확인합니다.
     */
    public static expectFieldValid(field: FieldInfo): void {
        const assert = require('assert');
        assert.ok(field.name, 'Field name should be truthy');
        assert.ok(field.type, 'Field type should be truthy');
        assert.ok(field.position, 'Field position should be defined');
        assert.ok(field.range, 'Field range should be defined');
        assert.ok(field.annotations, 'Field annotations should be defined');
    }

    /**
     * 클래스 정보가 올바른지 확인합니다.
     */
    public static expectClassValid(classInfo: ClassInfo): void {
        const assert = require('assert');
        assert.ok(classInfo.name, 'Class name should be truthy');
        assert.ok(classInfo.fullyQualifiedName, 'Class fully qualified name should be truthy');
        assert.ok(classInfo.fileUri, 'Class file URI should be defined');
        assert.ok(classInfo.position, 'Class position should be defined');
        assert.ok(classInfo.range, 'Class range should be defined');
        assert.ok(classInfo.annotations, 'Class annotations should be defined');
        assert.ok(classInfo.fields, 'Class fields should be defined');
        assert.ok(classInfo.imports, 'Class imports should be defined');
    }
}

/**
 * Lombok 관련 Java 파일 샘플 생성기 (Phase 3)
 * Lombok 어노테이션 테스트를 위한 Java 코드 템플릿 제공
 */
export class LombokJavaSampleGenerator {
    
    /**
     * @RequiredArgsConstructor 기본 케이스
     * final 필드가 있는 서비스 클래스
     */
    public static requiredArgsConstructorBasic(): string {
        return `
package com.example.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final EmailService emailService;
    private String tempData; // final이 아니므로 생성자에 포함되지 않음
    
    public void createUser(String name) {
        // 메서드 구현
    }
}`.trim();
    }

    /**
     * @RequiredArgsConstructor + @NonNull 조합
     * final과 @NonNull 필드가 혼재된 케이스
     */
    public static requiredArgsWithNonNull(): string {
        return `
package com.example.service;

import lombok.RequiredArgsConstructor;
import lombok.NonNull;
import org.springframework.stereotype.Service;

@Service  
@RequiredArgsConstructor
public class OrderService {
    private final UserRepository userRepository;
    @NonNull private ProductService productService;
    private PaymentService paymentService; // final도 @NonNull도 아니므로 제외
    
    public void processOrder() {
        // 구현
    }
}`.trim();
    }

    /**
     * @AllArgsConstructor 케이스
     * 모든 필드를 생성자 매개변수로 포함
     */
    public static allArgsConstructor(): string {
        return `
package com.example.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class ReportService {
    private UserRepository userRepository;
    private EmailService emailService;
    private ConfigService configService;
    private static final String VERSION = "1.0"; // static 필드는 제외
    
    public void generateReport() {
        // 구현
    }
}`.trim();
    }

    /**
     * 복잡한 Lombok 조합
     * @RequiredArgsConstructor + @Slf4j + @Service 조합
     */
    public static complexLombokAnnotations(): string {
        return `
package com.example.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private final EmailService emailService;
    private final SmsService smsService;
    
    public void sendNotification(String message) {
        log.info("Sending notification: {}", message);
    }
}`.trim();
    }

    /**
     * @Data 어노테이션 케이스 (생성자 관련 부분만)
     * @Data는 @RequiredArgsConstructor를 포함함
     */
    public static dataAnnotationConstructor(): string {
        return `
package com.example.model;

import lombok.Data;
import org.springframework.stereotype.Component;

@Component
@Data
public class UserProfile {
    private final String userId;
    private final String email;
    private String displayName; // final이 아니므로 @RequiredArgsConstructor에서 제외
    private int age;
}`.trim();
    }

    /**
     * Lombok + 기존 생성자 혼재 케이스
     * 명시적 생성자가 있으면 Lombok 생성자 무시
     */
    public static lombokWithExplicitConstructor(): string {
        return `
package com.example.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomService {
    private final UserRepository userRepository;
    
    // 명시적 생성자가 있으면 Lombok이 생성자를 만들지 않음
    public CustomService(UserRepository userRepository, String customParam) {
        this.userRepository = userRepository;
        // 커스텀 로직
    }
}`.trim();
    }

    /**
     * Lombok이 없는 일반 클래스
     * 대조군 테스트용
     */
    public static plainClassWithoutLombok(): string {
        return `
package com.example.service;

import org.springframework.stereotype.Service;

@Service
public class PlainService {
    private final UserRepository userRepository;
    
    public PlainService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public void doSomething() {
        // 구현
    }
}`.trim();
    }

    /**
     * 빈 필드를 가진 Lombok 클래스
     * 필드가 없는 @RequiredArgsConstructor 클래스
     */
    public static lombokClassWithoutFields(): string {
        return `
package com.example.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmptyService {
    // 필드가 없으므로 빈 생성자만 생성됨
    
    public void performAction() {
        // 구현
    }
}`.trim();
    }
}

/**
 * Lombok 관련 Mock 객체 생성 헬퍼 (Phase 3)
 */
export class LombokMockHelper {
    
    /**
     * Lombok 어노테이션 정보 Mock 생성
     */
    public static createLombokAnnotationInfo(
        type: SpringAnnotationType, 
        parameters?: Map<string, string>
    ): LombokAnnotationInfo {
        return {
            name: type.toString(),
            type: type,
            line: 3,
            column: 0,
            parameters: parameters || new Map(),
            lombokConfig: new Map([
                ['access', 'public'],
                ['staticName', '']
            ])
        };
    }

    /**
     * 가상 생성자 정보 Mock 생성
     */
    public static createVirtualConstructorInfo(
        source: string, 
        parameters: ParameterInfo[],
        lombokType: SpringAnnotationType
    ): VirtualConstructorInfo {
        return {
            parameters: parameters,
            range: TestUtils.createRange(5, 4, 8, 5),
            lombokAnnotationType: lombokType,
            annotationSource: source,
            visibility: 'public',
            isVirtual: true,
            position: TestUtils.createPosition(5, 4)
        };
    }

    /**
     * final 필드 Mock 생성
     */
    public static createFinalFieldInfo(name: string, type: string, line: number): FieldInfo {
        return {
            name: name,
            type: type,
            position: TestUtils.createPosition(line, 4),
            range: TestUtils.createRange(line, 4, line, 50),
            annotations: [],
            visibility: 'private',
            isFinal: true,
            isStatic: false
        };
    }

    /**
     * @NonNull 필드 Mock 생성
     */
    public static createNonNullFieldInfo(name: string, type: string, line: number): FieldInfo {
        return {
            name: name,
            type: type,
            position: TestUtils.createPosition(line, 4),
            range: TestUtils.createRange(line, 4, line, 50),
            annotations: [{
                name: 'NonNull',
                type: SpringAnnotationType.LOMBOK_NON_NULL,
                line: line - 1,
                column: 4
            }],
            visibility: 'private',
            isFinal: false,
            isStatic: false
        };
    }

    /**
     * static final 필드 Mock 생성
     */
    public static createStaticFinalFieldInfo(name: string, type: string, line: number): FieldInfo {
        return {
            name: name,
            type: type,
            position: TestUtils.createPosition(line, 4),
            range: TestUtils.createRange(line, 4, line, 50),
            annotations: [],
            visibility: 'private',
            isFinal: true,
            isStatic: true // static final 필드는 생성자에서 제외
        };
    }
}

/**
 * Lombok Helper - 예상 결과 생성기 (Phase 3)
 */
export class LombokExpectedResultHelper {
    
    /**
     * @RequiredArgsConstructor 예상 생성자 정보 생성
     */
    public static createExpectedRequiredArgsConstructor(
        finalFields: FieldInfo[], 
        nonNullFields: FieldInfo[]
    ): VirtualConstructorInfo {
        const allRequiredFields = [...finalFields, ...nonNullFields];
        const parameters = allRequiredFields.map(field => 
            TestUtils.createParameterInfo(field.name, field.type)
        );

        return LombokMockHelper.createVirtualConstructorInfo(
            'RequiredArgsConstructor',
            parameters,
            SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR
        );
    }

    /**
     * @AllArgsConstructor 예상 생성자 정보 생성
     */
    public static createExpectedAllArgsConstructor(fields: FieldInfo[]): VirtualConstructorInfo {
        // static 필드 제외
        const nonStaticFields = fields.filter(field => !field.isStatic);
        const parameters = nonStaticFields.map(field => 
            TestUtils.createParameterInfo(field.name, field.type)
        );

        return LombokMockHelper.createVirtualConstructorInfo(
            'AllArgsConstructor',
            parameters,
            SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR
        );
    }

    /**
     * Lombok 시뮬레이션 결과 생성
     */
    public static createLombokSimulationResult(
        annotations: LombokAnnotationInfo[],
        virtualConstructors: VirtualConstructorInfo[],
        fieldAnalysis: LombokFieldAnalysis
    ): LombokSimulationResult {
        return {
            lombokAnnotations: annotations,
            virtualConstructors: virtualConstructors,
            fieldAnalysis: fieldAnalysis,
            isSuccess: true,
            errors: []
        };
    }

    /**
     * 실패한 Lombok 시뮬레이션 결과 생성
     */
    public static createFailedLombokSimulationResult(errors: string[]): LombokSimulationResult {
        return {
            lombokAnnotations: [],
            virtualConstructors: [],
            fieldAnalysis: {
                requiredArgsFields: [],
                allArgsFields: [],
                classInfo: TestUtils.createClassInfo('EmptyClass', 'com.example', [], [])
            },
            isSuccess: false,
            errors: errors
        };
    }
}

/**
 * Field Extractor용 Mock 데이터 생성기 (Task 1.2)
 * 복잡한 CST 구조를 간단하게 생성할 수 있는 Builder 패턴
 */
export class FieldMockBuilder {
    private fieldName: string = 'testField';
    private fieldType: string = 'String';
    private isPrimitive: boolean = false;
    private modifiers: string[] = [];

    /**
     * 필드 이름 설정
     */
    public withName(name: string): FieldMockBuilder {
        this.fieldName = name;
        return this;
    }

    /**
     * 필드 타입 설정 (참조 타입)
     */
    public withType(type: string): FieldMockBuilder {
        this.fieldType = type;
        this.isPrimitive = false;
        return this;
    }

    /**
     * 기본 타입 설정 (int, boolean, etc.)
     */
    public withPrimitiveType(type: 'int' | 'boolean' | 'char' | 'byte' | 'short' | 'long' | 'float' | 'double'): FieldMockBuilder {
        this.fieldType = type;
        this.isPrimitive = true;
        return this;
    }

    /**
     * private 제한자 추가
     */
    public asPrivate(): FieldMockBuilder {
        this.modifiers.push('Private');
        return this;
    }

    /**
     * public 제한자 추가
     */
    public asPublic(): FieldMockBuilder {
        this.modifiers.push('Public');
        return this;
    }

    /**
     * protected 제한자 추가
     */
    public asProtected(): FieldMockBuilder {
        this.modifiers.push('Protected');
        return this;
    }

    /**
     * final 제한자 추가
     */
    public asFinal(): FieldMockBuilder {
        this.modifiers.push('Final');
        return this;
    }

    /**
     * static 제한자 추가
     */
    public asStatic(): FieldMockBuilder {
        this.modifiers.push('Static');
        return this;
    }

    /**
     * transient 제한자 추가
     */
    public asTransient(): FieldMockBuilder {
        this.modifiers.push('Transient');
        return this;
    }

    /**
     * volatile 제한자 추가
     */
    public asVolatile(): FieldMockBuilder {
        this.modifiers.push('Volatile');
        return this;
    }

    /**
     * CST 구조의 field mock 데이터 빌드
     */
    public build(): any {
        return {
            children: {
                unannType: [this.buildTypeStructure()],
                variableDeclaratorList: [this.buildVariableDeclaratorList()],
                fieldModifier: this.buildFieldModifiers()
            }
        };
    }

    /**
     * 타입 구조 빌드 (참조 타입 vs 기본 타입)
     */
    private buildTypeStructure(): any {
        if (this.isPrimitive) {
            return this.buildPrimitiveType();
        } else {
            return this.buildReferenceType();
        }
    }

    /**
     * 참조 타입 구조 빌드
     */
    private buildReferenceType(): any {
        return {
            children: {
                unannReferenceType: [{
                    children: {
                        unannClassOrInterfaceType: [{
                            children: {
                                unannClassType: [{
                                    children: {
                                        Identifier: [{ image: this.fieldType }]
                                    }
                                }]
                            }
                        }]
                    }
                }]
            }
        };
    }

    /**
     * 기본 타입 구조 빌드
     */
    private buildPrimitiveType(): any {
        const primitiveMap: Record<string, any> = {
            'int': { IntegralType: [{ children: { Int: [{ image: 'int' }] } }] },
            'boolean': { Boolean: [{ image: 'boolean' }] },
            'char': { IntegralType: [{ children: { Char: [{ image: 'char' }] } }] },
            'byte': { IntegralType: [{ children: { Byte: [{ image: 'byte' }] } }] },
            'short': { IntegralType: [{ children: { Short: [{ image: 'short' }] } }] },
            'long': { IntegralType: [{ children: { Long: [{ image: 'long' }] } }] },
            'float': { FloatingPointType: [{ children: { Float: [{ image: 'float' }] } }] },
            'double': { FloatingPointType: [{ children: { Double: [{ image: 'double' }] } }] }
        };

        return {
            children: {
                unannPrimitiveType: [{
                    children: primitiveMap[this.fieldType]
                }]
            }
        };
    }

    /**
     * 변수 선언자 리스트 빌드
     */
    private buildVariableDeclaratorList(): any {
        return {
            children: {
                variableDeclarator: [{
                    children: {
                        variableDeclaratorId: [{
                            children: {
                                Identifier: [{ image: this.fieldName }]
                            }
                        }]
                    }
                }]
            }
        };
    }

    /**
     * 필드 제한자들 빌드
     */
    private buildFieldModifiers(): any[] {
        return this.modifiers.map(modifier => ({
            children: {
                [modifier]: [{ image: modifier.toLowerCase() }]
            }
        }));
    }

    /**
     * 새로운 Builder 인스턴스 생성
     */
    public static create(): FieldMockBuilder {
        return new FieldMockBuilder();
    }

    /**
     * 자주 사용되는 패턴들을 위한 정적 메서드들
     */

    /**
     * private final String 필드
     */
    public static privateFinalString(name: string): any {
        return FieldMockBuilder.create()
            .withName(name)
            .withType('String')
            .asPrivate()
            .asFinal()
            .build();
    }

    /**
     * private final int 필드
     */
    public static privateFinalInt(name: string): any {
        return FieldMockBuilder.create()
            .withName(name)
            .withPrimitiveType('int')
            .asPrivate()
            .asFinal()
            .build();
    }

    /**
     * private static final 상수 필드
     */
    public static privateStaticFinalString(name: string): any {
        return FieldMockBuilder.create()
            .withName(name)
            .withType('String')
            .asPrivate()
            .asStatic()
            .asFinal()
            .build();
    }

    /**
     * @NonNull 어노테이션이 있는 필드 mock
     */
    public static withNonNullAnnotation(name: string, type: string = 'String'): any {
        const fieldMock = FieldMockBuilder.create()
            .withName(name)
            .withType(type)
            .asPrivate()
            .build();
        
        // @NonNull 어노테이션 추가
        fieldMock.children.fieldModifier.push({
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

        return fieldMock;
    }
} 