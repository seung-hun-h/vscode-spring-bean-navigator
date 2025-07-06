import * as assert from 'assert';
import * as vscode from 'vscode';
import { BeanResolver } from '../utils/bean-resolver';
import { SpringBeanDetector } from '../detectors/spring-bean-detector';
import { SpringCodeLensProvider } from '../providers/code-lens-provider';
import { JavaFileParser } from '../parsers/java-file-parser';
import { BeanDefinition, SpringAnnotationType } from '../models/spring-types';

suite('Extension Integration Test Suite', () => {

	let beanResolver: BeanResolver;
	let beanDetector: SpringBeanDetector;
	let codeLensProvider: SpringCodeLensProvider;
	let javaParser: JavaFileParser;

	setup(() => {
		beanResolver = new BeanResolver();
		beanDetector = new SpringBeanDetector();
		codeLensProvider = new SpringCodeLensProvider(beanResolver, beanDetector);
		javaParser = new JavaFileParser();
	});

	teardown(() => {
		beanResolver?.clearCache();
	});

	suite('Full Workflow Tests', () => {
		test('should_verifyBeanResolverBasicOperation', () => {
			// Arrange
			const testBean: BeanDefinition = {
				name: 'userService',
				type: 'UserService',
				implementationClass: 'com.example.service.UserService',
				fileUri: vscode.Uri.file('/test/UserService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'userService',
				className: 'UserService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.UserService'
			};

			// Act
			beanResolver.addBeanDefinition(testBean);

			// Assert
			assert.strictEqual(beanResolver.getBeanCount(), 1, 'Should register 1 bean');

			const foundByName = beanResolver.findBeanByName('userService');
			assert.ok(foundByName, 'Should find bean by name');
			assert.strictEqual(foundByName.className, 'UserService');

			const foundByType = beanResolver.findBeansByType('UserService');
			assert.strictEqual(foundByType.length, 1, 'Should find bean by type');
		});

		test('should_handleMultipleBeansCorrectly', () => {
			// Arrange
			const beans: BeanDefinition[] = [
				{
					name: 'userService',
					type: 'UserService',
					implementationClass: 'com.example.service.UserService',
					fileUri: vscode.Uri.file('/test/UserService.java'),
					position: new vscode.Position(0, 0),
					definitionType: 'class',
					annotation: SpringAnnotationType.SERVICE,
					beanName: 'userService',
					className: 'UserService',
					annotationType: SpringAnnotationType.SERVICE,
					fullyQualifiedName: 'com.example.service.UserService'
				},
				{
					name: 'userRepository',
					type: 'UserRepository',
					implementationClass: 'com.example.repository.UserRepository',
					fileUri: vscode.Uri.file('/test/UserRepository.java'),
					position: new vscode.Position(0, 0),
					definitionType: 'class',
					annotation: SpringAnnotationType.REPOSITORY,
					beanName: 'userRepository',
					className: 'UserRepository',
					annotationType: SpringAnnotationType.REPOSITORY,
					fullyQualifiedName: 'com.example.repository.UserRepository'
				},
				{
					name: 'userController',
					type: 'UserController',
					implementationClass: 'com.example.controller.UserController',
					fileUri: vscode.Uri.file('/test/UserController.java'),
					position: new vscode.Position(0, 0),
					definitionType: 'class',
					annotation: SpringAnnotationType.CONTROLLER,
					beanName: 'userController',
					className: 'UserController',
					annotationType: SpringAnnotationType.CONTROLLER,
					fullyQualifiedName: 'com.example.controller.UserController'
				}
			];

			// Act
			beans.forEach(bean => beanResolver.addBeanDefinition(bean));

			// Assert
			assert.strictEqual(beanResolver.getBeanCount(), 3, 'Should register 3 beans');

			assert.ok(beanResolver.findBeanByName('userService'), 'Should find UserService');
			assert.ok(beanResolver.findBeanByName('userRepository'), 'Should find UserRepository');
			assert.ok(beanResolver.findBeanByName('userController'), 'Should find UserController');

			const allBeans = beanResolver.getAllBeans();
			assert.strictEqual(allBeans.length, 3, 'Should have 3 beans in total');
		});

		test('should_resolveBeans_when_beanDefinitionsExist', () => {
			// Arrange
			const serviceBean: BeanDefinition = {
				name: 'orderService',
				type: 'OrderService',
				implementationClass: 'com.example.service.OrderService',
				fileUri: vscode.Uri.file('/test/OrderService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'orderService',
				className: 'OrderService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.OrderService'
			};

			beanResolver.addBeanDefinition(serviceBean);

			// Act
			const resolution = beanResolver.resolveBeanForInjection('OrderService');

			assert.ok(resolution.resolved, 'Should resolve single bean');
			assert.strictEqual(resolution.resolved?.className, 'OrderService');
			assert.strictEqual(resolution.candidates.length, 1, 'Should have 1 candidate');

			// Assert
			const noResolution = beanResolver.resolveBeanForInjection('NonExistentService');
			assert.strictEqual(noResolution.resolved, undefined, 'Non-existent bean should be undefined');
			assert.strictEqual(noResolution.candidates.length, 0, 'Should have 0 candidates');
		});

		test('should_matchInterfaceImplementation', () => {
			// Arrange
			const implBean: BeanDefinition = {
				name: 'userRepositoryImpl',
				type: 'UserRepositoryImpl',
				implementationClass: 'com.example.repository.impl.UserRepositoryImpl',
				fileUri: vscode.Uri.file('/test/UserRepositoryImpl.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepositoryImpl',
				className: 'UserRepositoryImpl',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.impl.UserRepositoryImpl'
			};

			(implBean as any).interfaces = ['UserRepository'];

			// Act
			beanResolver.addBeanDefinition(implBean);

			// Assert
			const foundByInterface = beanResolver.findBeansByType('UserRepository');
			assert.strictEqual(foundByInterface.length, 1, 'Should find implementation by interface type');
			assert.strictEqual(foundByInterface[0].className, 'UserRepositoryImpl');
		});
	});

	suite('Constructor and Setter Injection Integration Tests', () => {

		test('should_completeConstructorInjectionWorkflow_when_singleConstructorExists', async () => {
			// Arrange: Register dependency Beans
			const userRepositoryBean: BeanDefinition = {
				name: 'userRepository',
				type: 'UserRepository',
				implementationClass: 'com.example.repository.UserRepository',
				fileUri: vscode.Uri.file('/test/UserRepository.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepository',
				className: 'UserRepository',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.UserRepository'
			};

			const emailServiceBean: BeanDefinition = {
				name: 'emailService',
				type: 'EmailService',
				implementationClass: 'com.example.service.EmailService',
				fileUri: vscode.Uri.file('/test/EmailService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'emailService',
				className: 'EmailService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.EmailService'
			};

			beanResolver.addBeanDefinition(userRepositoryBean);
			beanResolver.addBeanDefinition(emailServiceBean);

			const javaContent = `
				@Service
				public class OrderService {
					private final UserRepository userRepository;
					private final EmailService emailService;
					
					public OrderService(UserRepository userRepository, EmailService emailService) {
						this.userRepository = userRepository;
						this.emailService = emailService;
					}
				}`;

			const mockDocument = {
				uri: vscode.Uri.file('/test/OrderService.java'),
				getText: () => javaContent,
				languageId: 'java'
			} as vscode.TextDocument;

			// Act
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);

			// Assert
			assert.strictEqual(parseResult.errors.length, 0, 'Should have no parsing errors');
			assert.strictEqual(parseResult.classes.length, 1, 'Should parse 1 class');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 2, 'Should detect 2 constructor parameters');

			const userRepoInjection = injections.find(inj => inj.targetType === 'UserRepository');
			const emailServiceInjection = injections.find(inj => inj.targetType === 'EmailService');

			assert.ok(userRepoInjection, 'Should detect UserRepository injection');
			assert.strictEqual(userRepoInjection.injectionType, 'constructor', 'Should be constructor injection type');

			assert.ok(emailServiceInjection, 'Should detect EmailService injection');
			assert.strictEqual(emailServiceInjection.injectionType, 'constructor', 'Should be constructor injection type');

			// Act
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 2, 'Should create 2 CodeLenses');

			// Assert
			const userRepoCodeLens = codeLenses.find(cl => cl.command?.title.includes('userRepository'));
			const emailServiceCodeLens = codeLenses.find(cl => cl.command?.title.includes('emailService'));

			assert.ok(userRepoCodeLens, 'Should create UserRepository CodeLens');
			assert.strictEqual(userRepoCodeLens.command?.command, 'spring-bean-navigator.goToBean');

			assert.ok(emailServiceCodeLens, 'Should create EmailService CodeLens');
			assert.strictEqual(emailServiceCodeLens.command?.command, 'spring-bean-navigator.goToBean');

		});

		test('should_completeAutowiredConstructorInjectionWorkflow_when_multipleConstructorsExist', async () => {
			// Arrange: Register dependency Beans
			const userRepositoryBean: BeanDefinition = {
				name: 'userRepository',
				type: 'UserRepository',
				implementationClass: 'com.example.repository.UserRepository',
				fileUri: vscode.Uri.file('/test/UserRepository.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepository',
				className: 'UserRepository',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.UserRepository'
			};

			const paymentGatewayBean: BeanDefinition = {
				name: 'paymentGateway',
				type: 'PaymentGateway',
				implementationClass: 'com.example.gateway.PaymentGateway',
				fileUri: vscode.Uri.file('/test/PaymentGateway.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.COMPONENT,
				beanName: 'paymentGateway',
				className: 'PaymentGateway',
				annotationType: SpringAnnotationType.COMPONENT,
				fullyQualifiedName: 'com.example.gateway.PaymentGateway'
			};

			beanResolver.addBeanDefinition(userRepositoryBean);
			beanResolver.addBeanDefinition(paymentGatewayBean);

			
			const javaContent = `
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

			const mockDocument = {
				uri: vscode.Uri.file('/test/PaymentService.java'),
				getText: () => javaContent,
				languageId: 'java'
			} as vscode.TextDocument;

			// Act: Execute full workflow
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);

			// Assert
			assert.strictEqual(parseResult.errors.length, 0, 'Should have no parsing errors');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 2, 'Should detect 2 @Autowired constructor parameters');

			// Only @Autowired constructor parameters should be detected
			const constructorInjections = injections.filter(inj => inj.injectionType === 'constructor');
			assert.strictEqual(constructorInjections.length, 2, 'Should have 2 constructor injections');

			// Act
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);

			// Assert
			assert.strictEqual(codeLenses.length, 2, 'Should create 2 CodeLenses');

		});

		test('should_completeSetterInjectionWorkflow_when_autowiredSetterExists', async () => {
			// Arrange: Register dependency Beans
			const emailServiceBean: BeanDefinition = {
				name: 'emailService',
				type: 'EmailService',
				implementationClass: 'com.example.service.EmailService',
				fileUri: vscode.Uri.file('/test/EmailService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'emailService',
				className: 'EmailService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.EmailService'
			};

			const userRepositoryBean: BeanDefinition = {
				name: 'userRepository',
				type: 'UserRepository',
				implementationClass: 'com.example.repository.UserRepository',
				fileUri: vscode.Uri.file('/test/UserRepository.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepository',
				className: 'UserRepository',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.UserRepository'
			};

			beanResolver.addBeanDefinition(emailServiceBean);
			beanResolver.addBeanDefinition(userRepositoryBean);

			// Java service class with @Autowired setter
			const javaContent = `
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

			const mockDocument = {
				uri: vscode.Uri.file('/test/UserService.java'),
				getText: () => javaContent,
				languageId: 'java'
			} as vscode.TextDocument;

			// Act: Execute full workflow
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			assert.strictEqual(parseResult.errors.length, 0, 'Should have no parsing errors');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 2, 'Should detect 2 setter injections');

			// Verify setter injections
			const setterInjections = injections.filter(inj => inj.injectionType === 'setter');
			assert.strictEqual(setterInjections.length, 2, 'Should have 2 setter injections');

			const emailSetterInjection = setterInjections.find(inj => inj.targetType === 'EmailService');
			const userRepoSetterInjection = setterInjections.find(inj => inj.targetType === 'UserRepository');

			assert.ok(emailSetterInjection, 'Should detect EmailService setter injection');
			assert.ok(userRepoSetterInjection, 'Should detect UserRepository setter injection');

			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 2, 'Should create 2 CodeLenses');

		});

		test('should_completeMixedInjectionWorkflow_when_fieldConstructorSetterCombined', async () => {
			// Arrange: Register dependency Beans
			const userRepositoryBean: BeanDefinition = {
				name: 'userRepository',
				type: 'UserRepository',
				implementationClass: 'com.example.repository.UserRepository',
				fileUri: vscode.Uri.file('/test/UserRepository.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepository',
				className: 'UserRepository',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.UserRepository'
			};

			const emailServiceBean: BeanDefinition = {
				name: 'emailService',
				type: 'EmailService',
				implementationClass: 'com.example.service.EmailService',
				fileUri: vscode.Uri.file('/test/EmailService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'emailService',
				className: 'EmailService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.EmailService'
			};

			const paymentGatewayBean: BeanDefinition = {
				name: 'paymentGateway',
				type: 'PaymentGateway',
				implementationClass: 'com.example.gateway.PaymentGateway',
				fileUri: vscode.Uri.file('/test/PaymentGateway.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.COMPONENT,
				beanName: 'paymentGateway',
				className: 'PaymentGateway',
				annotationType: SpringAnnotationType.COMPONENT,
				fullyQualifiedName: 'com.example.gateway.PaymentGateway'
			};

			beanResolver.addBeanDefinition(userRepositoryBean);
			beanResolver.addBeanDefinition(emailServiceBean);
			beanResolver.addBeanDefinition(paymentGatewayBean);

			// Java service class with mixed field, constructor, and setter injection
			const javaContent = `
				@Service
				public class UserService {
					@Autowired
					private UserRepository userRepository; // field injection
					
					private final EmailService emailService; // constructor injection
					private PaymentGateway paymentGateway; // setter injection
					
					public UserService(EmailService emailService) {
						this.emailService = emailService;
					}
					
					@Autowired
					public void setPaymentGateway(PaymentGateway paymentGateway) {
						this.paymentGateway = paymentGateway;
					}
				}`;

			const mockDocument = {
				uri: vscode.Uri.file('/test/UserService.java'),
				getText: () => javaContent,
				languageId: 'java'
			} as vscode.TextDocument;

			// Act: Execute full workflow
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			assert.strictEqual(parseResult.errors.length, 0, 'Should have no parsing errors');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 3, 'Should detect all 3 injection types');

			// Verify each injection type
			const fieldInjection = injections.find(inj => inj.injectionType === 'field');
			const constructorInjection = injections.find(inj => inj.injectionType === 'constructor');
			const setterInjection = injections.find(inj => inj.injectionType === 'setter');

			assert.ok(fieldInjection, 'Should detect field injection');
			assert.strictEqual(fieldInjection.targetType, 'UserRepository');

			assert.ok(constructorInjection, 'Should detect constructor injection');
			assert.strictEqual(constructorInjection.targetType, 'EmailService');

			assert.ok(setterInjection, 'Should detect setter injection');
			assert.strictEqual(setterInjection.targetType, 'PaymentGateway');

			// Verify CodeLens creation
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 3, 'Should create 3 CodeLenses');

			// Verify each CodeLens points to correct Bean
			const userRepoCodeLens = codeLenses.find(cl => cl.command?.title.includes('userRepository'));
			const emailServiceCodeLens = codeLenses.find(cl => cl.command?.title.includes('emailService'));
			const paymentGatewayCodeLens = codeLenses.find(cl => cl.command?.title.includes('paymentGateway'));

			assert.ok(userRepoCodeLens, 'Should create UserRepository CodeLens');
			assert.ok(emailServiceCodeLens, 'Should create EmailService CodeLens');
			assert.ok(paymentGatewayCodeLens, 'Should create PaymentGateway CodeLens');

		});

		test('should_handleMultipleCandidateBeansWorkflow_when_interfaceHasMultipleImplementations', async () => {
			// Arrange: Register multiple implementation Beans of same interface
			const jpaImpl: BeanDefinition = {
				name: 'notificationServiceJpa',
				type: 'EmailNotificationService',
				implementationClass: 'com.example.service.EmailNotificationService',
				fileUri: vscode.Uri.file('/test/EmailNotificationService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'notificationServiceJpa',
				className: 'EmailNotificationService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.EmailNotificationService'
			};

			const smsImpl: BeanDefinition = {
				name: 'notificationServiceSms',
				type: 'SmsNotificationService',
				implementationClass: 'com.example.service.SmsNotificationService',
				fileUri: vscode.Uri.file('/test/SmsNotificationService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'notificationServiceSms',
				className: 'SmsNotificationService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.SmsNotificationService'
			};

			// Add interface information
			(jpaImpl as any).interfaces = ['NotificationService'];
			(smsImpl as any).interfaces = ['NotificationService'];

			beanResolver.addBeanDefinition(jpaImpl);
			beanResolver.addBeanDefinition(smsImpl);

			// Service class injecting by interface type
			const javaContent = `
@Service
public class UserService {
    private final NotificationService notificationService;
    
    public UserService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }
}`;

			const mockDocument = {
				uri: vscode.Uri.file('/test/UserService.java'),
				getText: () => javaContent,
				languageId: 'java'
			} as vscode.TextDocument;

			// Act: Execute full workflow
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 1, 'Should detect 1 constructor injection');

			const notificationInjection = injections[0];
			assert.strictEqual(notificationInjection.targetType, 'NotificationService');

			// Verify multiple candidate handling in CodeLens creation
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 1, 'Should create 1 CodeLens');

			const codeLens = codeLenses[0];
			assert.ok(codeLens.command?.title.includes('Multiple candidates'), 'Should display multiple candidates message');
			assert.strictEqual(codeLens.command?.command, 'spring-bean-navigator.selectBean');
			assert.strictEqual(codeLens.command?.arguments?.[0].length, 2, 'Should pass 2 candidates');

		});

		test('should_handleBeanNotFoundWorkflow_when_beanTypeDoesNotExist', async () => {

			// Arrange: Do not register dependency Bean
			// No beans added to beanResolver to create not found situation

			// Service class injecting non-existent Bean type
			const javaContent = `
@Service
public class UserService {
    private final UnknownService unknownService;
    
    public UserService(UnknownService unknownService) {
        this.unknownService = unknownService;
    }
}`;

			const mockDocument = {
				uri: vscode.Uri.file('/test/UserService.java'),
				getText: () => javaContent,
				languageId: 'java'
			} as vscode.TextDocument;

			// Act: Execute full workflow
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 1, 'Should detect 1 constructor injection');

			const unknownInjection = injections[0];
			assert.strictEqual(unknownInjection.targetType, 'UnknownService');

			// Verify Bean not found handling in CodeLens creation (no CodeLens when Bean not found)
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 0, 'Should not create CodeLens when Bean not found');

		});
	});

	suite('Performance and Stability Tests', () => {

		test('should_handleLargeBeanVolume_performanceCheck', () => {

			const startTime = Date.now();

			// Create and register 1000 beans
			for (let i = 0; i < 1000; i++) {
				const bean: BeanDefinition = {
					name: `testBean${i}`,
					type: `TestService${i}`,
					implementationClass: `com.example.service.TestService${i}`,
					fileUri: vscode.Uri.file(`/test/TestService${i}.java`),
					position: new vscode.Position(0, 0),
					definitionType: 'class',
					annotation: SpringAnnotationType.SERVICE,
					beanName: `testBean${i}`,
					className: `TestService${i}`,
					annotationType: SpringAnnotationType.SERVICE,
					fullyQualifiedName: `com.example.service.TestService${i}`
				};

				beanResolver.addBeanDefinition(bean);
			}

			const endTime = Date.now();
			const processingTime = endTime - startTime;

			// Verify
			assert.strictEqual(beanResolver.getBeanCount(), 1000, 'Should register 1000 beans');
			assert.ok(processingTime < 5000, `Processing time should be under 5 seconds (actual: ${processingTime}ms)`);

			// Test search performance
			const searchStart = Date.now();
			const foundBean = beanResolver.findBeanByName('testBean500');
			const searchEnd = Date.now();
			const searchTime = searchEnd - searchStart;

			assert.ok(foundBean, 'Bean search should succeed');
			assert.ok(searchTime < 100, `Search time should be under 100ms (actual: ${searchTime}ms)`);

		});

		test('should_handleErrorSituationsRobustly', () => {

			// Test null/undefined input
			const nullResult = beanResolver.findBeanByName(null as any);
			const undefinedResult = beanResolver.findBeanByName(undefined as any);
			const emptyResult = beanResolver.findBeanByName('');
			const spaceResult = beanResolver.findBeanByName('   ');

			assert.strictEqual(nullResult, undefined, 'Should return undefined for null input');
			assert.strictEqual(undefinedResult, undefined, 'Should return undefined for undefined input');
			assert.strictEqual(emptyResult, undefined, 'Should return undefined for empty string');
			assert.strictEqual(spaceResult, undefined, 'Should return undefined for whitespace string');

			// Similar tests for type-based search
			const nullTypeResults = beanResolver.findBeansByType(null as any);
			const emptyTypeResults = beanResolver.findBeansByType('');

			assert.strictEqual(nullTypeResults.length, 0, 'Should return empty array for null type search');
			assert.strictEqual(emptyTypeResults.length, 0, 'Should return empty array for empty type search');

		});

		test('should_verifyMemoryEfficiency', () => {

			// Add Bean
			const testBean: BeanDefinition = {
				name: 'cacheTestBean',
				type: 'CacheTestService',
				implementationClass: 'com.example.CacheTestService',
				fileUri: vscode.Uri.file('/test/CacheTestService.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'cacheTestBean',
				className: 'CacheTestService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.CacheTestService'
			};

			beanResolver.addBeanDefinition(testBean);
			assert.strictEqual(beanResolver.getBeanCount(), 1, 'Should have 1 bean after addition');

			// Clear cache
			beanResolver.clearCache();
			assert.strictEqual(beanResolver.getBeanCount(), 0, 'Should have 0 beans after cache clear');

			// Test search after clear
			const notFound = beanResolver.findBeanByName('cacheTestBean');
			assert.strictEqual(notFound, undefined, 'Should not find bean after cache clear');

		});
	});

	suite('Real Scenario Tests', () => {

		test('should_simulateExtensionInitializationSuccessfully', () => {

			// Simulate extension activation scenario
			// 1. Verify components are created correctly
			assert.ok(beanResolver, 'BeanResolver should be created');
			assert.ok(beanDetector, 'SpringBeanDetector should be created');
			assert.ok(codeLensProvider, 'SpringCodeLensProvider should be created');
			assert.ok(javaParser, 'JavaFileParser should be created');

			// 2. Verify initial state
			assert.strictEqual(beanResolver.getBeanCount(), 0, 'Initial bean count should be 0');

			// 3. Verify provider dependencies
			// (SpringCodeLensProvider receives BeanResolver and SpringBeanDetector)
			// This is already verified in constructor

		});

		test('should_simulateTypicalSpringBootScenario', () => {

			// Scenario: Spring Boot project with Service and Repository

			// 1. Register Repository Bean (project scan result)
			const repositoryBean: BeanDefinition = {
				name: 'productRepository',
				type: 'ProductRepository',
				implementationClass: 'com.example.repository.ProductRepository',
				fileUri: vscode.Uri.file('/src/main/java/repository/ProductRepository.java'),
				position: new vscode.Position(5, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'productRepository',
				className: 'ProductRepository',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.ProductRepository'
			};

			// 2. Register Service Bean
			const serviceBean: BeanDefinition = {
				name: 'productService',
				type: 'ProductService',
				implementationClass: 'com.example.service.ProductService',
				fileUri: vscode.Uri.file('/src/main/java/service/ProductService.java'),
				position: new vscode.Position(8, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.SERVICE,
				beanName: 'productService',
				className: 'ProductService',
				annotationType: SpringAnnotationType.SERVICE,
				fullyQualifiedName: 'com.example.service.ProductService'
			};

			beanResolver.addBeanDefinition(repositoryBean);
			beanResolver.addBeanDefinition(serviceBean);

			// 3. Simulate user wanting Repository injection in Service
			const injectionResolution = beanResolver.resolveBeanForInjection('ProductRepository');

			assert.ok(injectionResolution.resolved, 'Should resolve Repository Bean');
			assert.strictEqual(injectionResolution.resolved?.name, 'productRepository');
			assert.strictEqual(injectionResolution.candidates.length, 1, 'Should have 1 candidate');

			// 4. Simulate CodeLens display information generation
			const targetBean = injectionResolution.resolved!;
			const navigationInfo = {
				title: `Go to ${targetBean.className}`,
				uri: targetBean.fileUri,
				position: targetBean.position
			};

			assert.strictEqual(navigationInfo.title, 'Go to ProductRepository');
			assert.ok(navigationInfo.uri.fsPath.includes('ProductRepository.java'));

		});

		test('should_simulateMultipleImplementationCandidateHandling', () => {

			// Multiple implementations of same interface
			const jpaImpl: BeanDefinition = {
				name: 'userRepositoryJpa',
				type: 'UserRepositoryJpaImpl',
				implementationClass: 'com.example.repository.jpa.UserRepositoryJpaImpl',
				fileUri: vscode.Uri.file('/src/main/java/repository/jpa/UserRepositoryJpaImpl.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepositoryJpa',
				className: 'UserRepositoryJpaImpl',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.jpa.UserRepositoryJpaImpl'
			};

			const mongoImpl: BeanDefinition = {
				name: 'userRepositoryMongo',
				type: 'UserRepositoryMongoImpl',
				implementationClass: 'com.example.repository.mongo.UserRepositoryMongoImpl',
				fileUri: vscode.Uri.file('/src/main/java/repository/mongo/UserRepositoryMongoImpl.java'),
				position: new vscode.Position(0, 0),
				definitionType: 'class',
				annotation: SpringAnnotationType.REPOSITORY,
				beanName: 'userRepositoryMongo',
				className: 'UserRepositoryMongoImpl',
				annotationType: SpringAnnotationType.REPOSITORY,
				fullyQualifiedName: 'com.example.repository.mongo.UserRepositoryMongoImpl'
			};

			// Add interface information
			(jpaImpl as any).interfaces = ['UserRepository'];
			(mongoImpl as any).interfaces = ['UserRepository'];

			beanResolver.addBeanDefinition(jpaImpl);
			beanResolver.addBeanDefinition(mongoImpl);

			// Search by interface type returns both implementations
			const multipleResolution = beanResolver.resolveBeanForInjection('UserRepository');

			assert.strictEqual(multipleResolution.resolved, undefined, 'Should not auto-resolve with multiple candidates');
			assert.strictEqual(multipleResolution.candidates.length, 2, 'Should have 2 candidates');

			const candidateNames = multipleResolution.candidates.map(c => c.className).sort();
			assert.deepStrictEqual(candidateNames, ['UserRepositoryJpaImpl', 'UserRepositoryMongoImpl']);

		});
	});
}); 