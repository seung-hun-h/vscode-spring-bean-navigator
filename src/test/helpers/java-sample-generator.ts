/**
 * Java file sample generator for testing
 */
export class JavaSampleGenerator {
    
    /**
     * Simple Java class with @Autowired field
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
                    // implementation
                }
            }
        `.trim();
    }

    /**
     * Java class with multiple @Autowired fields
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
                    // implementation
                }
            }
        `.trim();
    }

    /**
     * Java class without @Autowired
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
     * Java class with @Component annotation
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
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Invalid Java file with syntax errors (for parsing error tests)
     */
    public static invalidJavaFile(): string {
        return `
        package com.example;

        import org.springframework.stereotype.Service

        @Service  // missing semicolon
        public class InvalidService {
            @Autowired
            private SomeService someService  // missing semicolon
            
            public void method() {
                // missing closing brace
            
        }
        `.trim();
    }

    /**
     * Empty Java file
     */
    public static emptyJavaFile(): string {
        return '';
    }

    /**
     * Java class with @Repository annotation
     */
    public static repositoryClass(): string {
        return `
        package com.example.repository;

        import org.springframework.stereotype.Repository;

        @Repository
        public class UserRepository {
            
            public void findById(Long id) {
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Java class with @Configuration and @Bean
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
     * Java class with @Service annotation (for Spring Bean detection)
     */
    public static serviceClass(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service
        public class UserService {
            public void saveUser() {
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Java class with @Controller annotation
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
     * Java class with @RestController annotation
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
     * Java class with only @Configuration annotation
     */
    public static configurationOnlyClass(): string {
        return `
        package com.example.config;

        import org.springframework.context.annotation.Configuration;

        @Configuration
        public class AppConfig {
            // configuration class
        }
        `.trim();
    }

    /**
     * Java class with @Configuration and @Bean methods
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
     * Java class with multiple Spring Bean annotations
     */
    public static multipleBeansClass(): string {
        return `
        package com.example.mixed;

        import org.springframework.stereotype.Service;
        import org.springframework.stereotype.Repository;

        @Service
        public class UserService {
            // service implementation
        }

        @Repository
        class UserRepository {
            // repository implementation
        }
        `.trim();
    }

    /**
     * Plain Java class without Spring annotations
     */
    public static plainJavaClass(): string {
        return `
        package com.example.plain;

        public class PlainJavaClass {
            public void doSomething() {
                // plain Java class
            }
        }
        `.trim();
    }

    /**
     * Service class with custom Bean name
     */
    public static customBeanNameService(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;

        @Service("customUserService")
        public class UserService {
            // implementation
        }
        `.trim();
    }

    /**
     * Single constructor injection (Spring 5.0+ @Autowired omitted)
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
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Multiple constructors with @Autowired
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
                // default constructor
            }
            
            @Autowired
            public PaymentService(UserRepository userRepository, PaymentGateway paymentGateway) {
                this.userRepository = userRepository;
                this.paymentGateway = paymentGateway;
            }
            
            public void processPayment() {
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Setter injection (@Autowired setter method)
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
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Mixed injection (field + constructor + setter)
     */
    public static mixedInjection(): string {
        return `
        package com.example.service;

        import org.springframework.stereotype.Service;
        import org.springframework.beans.factory.annotation.Autowired;

        @Service
        public class UserService {
            @Autowired
            private UserRepository userRepository; // field injection
            
            private final EmailService emailService; // constructor injection
            private SmsService smsService; // setter injection
            
            public UserService(EmailService emailService) {
                this.emailService = emailService;
            }
            
            @Autowired
            public void setSmsService(SmsService smsService) {
                this.smsService = smsService;
            }
            
            public void processUser() {
                // implementation
            }
        }
        `.trim();
    }

    /**
     * Complex constructor injection (multiple annotations, generic type)
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
     * Complex setter injection (multiple annotations, generic type)
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