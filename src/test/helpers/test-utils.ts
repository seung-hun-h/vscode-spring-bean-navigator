import * as vscode from 'vscode';
import { 
    ClassInfo, 
    FieldInfo, 
    AnnotationInfo, 
    SpringAnnotationType, 
    BeanDefinition,
    InjectionInfo,
    InjectionType
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