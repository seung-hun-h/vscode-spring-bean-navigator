import * as assert from 'assert';
import * as vscode from 'vscode';
import { BeanResolver } from '../utils/bean-resolver';
import { SpringBeanDetector } from '../detectors/spring-bean-detector';
import { SpringCodeLensProvider } from '../providers/code-lens-provider';
import { JavaFileParser } from '../parsers/java-file-parser';
import { BeanDefinition, SpringAnnotationType } from '../models/spring-types';

suite('🚀 Extension Integration Test Suite', () => {

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

	suite('📊 전체 워크플로우 테스트', () => {
		test('should_BeanResolver_기본_동작_확인', () => {
			// 수동으로 Bean 정의 생성 (실제 BeanDefinition 구조에 맞춰)
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

			// Bean 등록
			beanResolver.addBeanDefinition(testBean);

			// 검증
			assert.strictEqual(beanResolver.getBeanCount(), 1, 'Bean이 1개 등록되어야 함');

			const foundByName = beanResolver.findBeanByName('userService');
			assert.ok(foundByName, 'Bean 이름으로 찾기 성공');
			assert.strictEqual(foundByName.className, 'UserService');

			const foundByType = beanResolver.findBeansByType('UserService');
			assert.strictEqual(foundByType.length, 1, 'Bean 타입으로 찾기 성공');
		});

		test('should_다중_Bean_처리_정상_동작', () => {
			// 여러 Bean 정의 생성
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

			// 모든 Bean 등록
			beans.forEach(bean => beanResolver.addBeanDefinition(bean));

			// 검증
			assert.strictEqual(beanResolver.getBeanCount(), 3, '3개의 Bean이 등록되어야 함');

			// 각각 찾기 테스트
			assert.ok(beanResolver.findBeanByName('userService'), 'UserService 찾기 성공');
			assert.ok(beanResolver.findBeanByName('userRepository'), 'UserRepository 찾기 성공');
			assert.ok(beanResolver.findBeanByName('userController'), 'UserController 찾기 성공');

			// 전체 Bean 목록 확인
			const allBeans = beanResolver.getAllBeans();
			assert.strictEqual(allBeans.length, 3, '전체 Bean 목록이 3개여야 함');
		});

		test('should_Bean_해결_로직_정상_동작', () => {
			// 테스트용 Bean 정의들
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

			// Bean 해결 테스트
			const resolution = beanResolver.resolveBeanForInjection('OrderService');

			assert.ok(resolution.resolved, '단일 Bean 해결 성공');
			assert.strictEqual(resolution.resolved?.className, 'OrderService');
			assert.strictEqual(resolution.candidates.length, 1, '후보가 1개여야 함');

			// 존재하지 않는 타입 테스트
			const noResolution = beanResolver.resolveBeanForInjection('NonExistentService');
			assert.strictEqual(noResolution.resolved, undefined, '존재하지 않는 Bean은 undefined');
			assert.strictEqual(noResolution.candidates.length, 0, '후보가 0개여야 함');
		});

		test('should_인터페이스_구현체_매칭_동작', () => {
			// 인터페이스 구현체 Bean 정의 (interfaces 속성 포함)
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

			// 인터페이스 정보 추가 (BeanResolver에서 처리할 수 있도록)
			(implBean as any).interfaces = ['UserRepository'];

			beanResolver.addBeanDefinition(implBean);

			// 인터페이스 타입으로 구현체 검색
			const foundByInterface = beanResolver.findBeansByType('UserRepository');
			assert.strictEqual(foundByInterface.length, 1, '인터페이스 타입으로 구현체를 찾을 수 있어야 함');
			assert.strictEqual(foundByInterface[0].className, 'UserRepositoryImpl');
		});
	});

	suite('🔧 생성자/Setter 주입 통합 테스트', () => {

		test('should_생성자주입_전체워크플로우_성공_when_단일생성자존재', async () => {
			// Arrange: 의존성 Bean들 등록
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

			// 단일 생성자가 있는 Java 서비스 클래스
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

			// Act: 전체 워크플로우 실행
			// 1. Java 파일 파싱
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			assert.strictEqual(parseResult.errors.length, 0, '파싱 에러가 없어야 함');
			assert.strictEqual(parseResult.classes.length, 1, '클래스가 1개 파싱되어야 함');

			// 2. 주입 패턴 탐지
			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 2, '생성자 매개변수 2개가 탐지되어야 함');

			const userRepoInjection = injections.find(inj => inj.targetType === 'UserRepository');
			const emailServiceInjection = injections.find(inj => inj.targetType === 'EmailService');

			assert.ok(userRepoInjection, 'UserRepository 주입이 탐지되어야 함');
			assert.strictEqual(userRepoInjection.injectionType, 'constructor', '생성자 주입 타입이어야 함');

			assert.ok(emailServiceInjection, 'EmailService 주입이 탐지되어야 함');
			assert.strictEqual(emailServiceInjection.injectionType, 'constructor', '생성자 주입 타입이어야 함');

			// 3. CodeLens 생성
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 2, '2개의 CodeLens가 생성되어야 함');

			// 4. Bean 해결 확인
			const userRepoCodeLens = codeLenses.find(cl => cl.command?.title.includes('UserRepository'));
			const emailServiceCodeLens = codeLenses.find(cl => cl.command?.title.includes('EmailService'));

			assert.ok(userRepoCodeLens, 'UserRepository CodeLens가 생성되어야 함');
			assert.strictEqual(userRepoCodeLens.command?.command, 'spring-bean-navigator.goToBean');

			assert.ok(emailServiceCodeLens, 'EmailService CodeLens가 생성되어야 함');
			assert.strictEqual(emailServiceCodeLens.command?.command, 'spring-bean-navigator.goToBean');

		});

		test('should_Autowired생성자주입_전체워크플로우_성공_when_다중생성자존재', async () => {
			// Arrange: 의존성 Bean들 등록
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

			// @Autowired 생성자가 있는 Java 서비스 클래스
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

			// Act: 전체 워크플로우 실행
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			assert.strictEqual(parseResult.errors.length, 0, '파싱 에러가 없어야 함');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 2, '@Autowired 생성자 매개변수 2개가 탐지되어야 함');

			// @Autowired 생성자의 매개변수들만 탐지되어야 함
			const constructorInjections = injections.filter(inj => inj.injectionType === 'constructor');
			assert.strictEqual(constructorInjections.length, 2, '생성자 주입이 2개여야 함');

			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 2, '2개의 CodeLens가 생성되어야 함');

		});

		test('should_Setter주입_전체워크플로우_성공_when_AutowiredSetter존재', async () => {
			// Arrange: 의존성 Bean들 등록
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

			// @Autowired setter가 있는 Java 서비스 클래스
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

			// Act: 전체 워크플로우 실행
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			assert.strictEqual(parseResult.errors.length, 0, '파싱 에러가 없어야 함');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 2, 'Setter 주입 2개가 탐지되어야 함');

			// Setter 주입들 검증
			const setterInjections = injections.filter(inj => inj.injectionType === 'setter');
			assert.strictEqual(setterInjections.length, 2, 'Setter 주입이 2개여야 함');

			const emailSetterInjection = setterInjections.find(inj => inj.targetType === 'EmailService');
			const userRepoSetterInjection = setterInjections.find(inj => inj.targetType === 'UserRepository');

			assert.ok(emailSetterInjection, 'EmailService setter 주입이 탐지되어야 함');
			assert.ok(userRepoSetterInjection, 'UserRepository setter 주입이 탐지되어야 함');

			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 2, '2개의 CodeLens가 생성되어야 함');

		});

		test('should_혼합주입_전체워크플로우_성공_when_필드생성자Setter조합', async () => {
			// Arrange: 의존성 Bean들 등록
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

			// 필드, 생성자, setter 주입이 혼합된 Java 서비스 클래스
			const javaContent = `
				@Service
				public class UserService {
					@Autowired
					private UserRepository userRepository; // 필드 주입
					
					private final EmailService emailService; // 생성자 주입
					private PaymentGateway paymentGateway; // Setter 주입
					
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

			// Act: 전체 워크플로우 실행
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			assert.strictEqual(parseResult.errors.length, 0, '파싱 에러가 없어야 함');

			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 3, '3가지 주입 방식이 모두 탐지되어야 함');

			// 각 주입 타입별 검증
			const fieldInjection = injections.find(inj => inj.injectionType === 'field');
			const constructorInjection = injections.find(inj => inj.injectionType === 'constructor');
			const setterInjection = injections.find(inj => inj.injectionType === 'setter');

			assert.ok(fieldInjection, '필드 주입이 탐지되어야 함');
			assert.strictEqual(fieldInjection.targetType, 'UserRepository');

			assert.ok(constructorInjection, '생성자 주입이 탐지되어야 함');
			assert.strictEqual(constructorInjection.targetType, 'EmailService');

			assert.ok(setterInjection, 'Setter 주입이 탐지되어야 함');
			assert.strictEqual(setterInjection.targetType, 'PaymentGateway');

			// CodeLens 생성 검증
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 3, '3개의 CodeLens가 생성되어야 함');

			// 각 CodeLens가 올바른 Bean을 가리키는지 확인
			const userRepoCodeLens = codeLenses.find(cl => cl.command?.title.includes('UserRepository'));
			const emailServiceCodeLens = codeLenses.find(cl => cl.command?.title.includes('EmailService'));
			const paymentGatewayCodeLens = codeLenses.find(cl => cl.command?.title.includes('PaymentGateway'));

			assert.ok(userRepoCodeLens, 'UserRepository CodeLens가 생성되어야 함');
			assert.ok(emailServiceCodeLens, 'EmailService CodeLens가 생성되어야 함');
			assert.ok(paymentGatewayCodeLens, 'PaymentGateway CodeLens가 생성되어야 함');

		});

		test('should_다중후보Bean_처리워크플로우_성공_when_인터페이스에_다중구현체존재', async () => {
			// Arrange: 같은 인터페이스의 다중 구현체 Bean들 등록
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

			// 인터페이스 정보 추가
			(jpaImpl as any).interfaces = ['NotificationService'];
			(smsImpl as any).interfaces = ['NotificationService'];

			beanResolver.addBeanDefinition(jpaImpl);
			beanResolver.addBeanDefinition(smsImpl);

			// 인터페이스 타입으로 주입받는 서비스 클래스
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

			// Act: 전체 워크플로우 실행
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 1, '생성자 주입이 1개 탐지되어야 함');

			const notificationInjection = injections[0];
			assert.strictEqual(notificationInjection.targetType, 'NotificationService');

			// CodeLens 생성 시 다중 후보 처리 확인
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 1, '1개의 CodeLens가 생성되어야 함');

			const codeLens = codeLenses[0];
			assert.ok(codeLens.command?.title.includes('Multiple candidates'), '다중 후보 메시지를 표시해야 함');
			assert.strictEqual(codeLens.command?.command, 'spring-bean-navigator.selectBean');
			assert.strictEqual(codeLens.command?.arguments?.[0].length, 2, '2개의 후보가 전달되어야 함');

		});

		test('should_Bean미발견_처리워크플로우_성공_when_존재하지않는Bean타입', async () => {

			// Arrange: 의존성 Bean을 등록하지 않음
			// beanResolver에 Bean을 추가하지 않아서 찾을 수 없는 상황 생성

			// 존재하지 않는 Bean 타입을 주입받는 서비스 클래스
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

			// Act: 전체 워크플로우 실행
			const parseResult = await javaParser.parseJavaFile(mockDocument.uri, javaContent);
			const injections = parseResult.injections;
			assert.strictEqual(injections.length, 1, '생성자 주입이 1개 탐지되어야 함');

			const unknownInjection = injections[0];
			assert.strictEqual(unknownInjection.targetType, 'UnknownService');

			// CodeLens 생성 시 Bean 미발견 처리 확인
			const codeLenses = await codeLensProvider.provideCodeLenses(mockDocument);
			assert.strictEqual(codeLenses.length, 1, '1개의 CodeLens가 생성되어야 함');

			const codeLens = codeLenses[0];
			assert.ok(codeLens.command?.title.includes('Bean not found'), 'Bean 미발견 메시지를 표시해야 함');
			assert.strictEqual(codeLens.command?.command, 'spring-bean-navigator.beanNotFound');
			assert.strictEqual(codeLens.command?.arguments?.[0], 'UnknownService', 'Bean 타입이 전달되어야 함');

		});
	});

	suite('성능 및 안정성 테스트', () => {

		test('should_대량_Bean_처리_성능_확인', () => {

			const startTime = Date.now();

			// 1000개의 Bean 생성 및 등록
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

			// 검증
			assert.strictEqual(beanResolver.getBeanCount(), 1000, '1000개의 Bean이 등록되어야 함');
			assert.ok(processingTime < 5000, `처리 시간이 5초 미만이어야 함 (실제: ${processingTime}ms)`);

			// 검색 성능 테스트
			const searchStart = Date.now();
			const foundBean = beanResolver.findBeanByName('testBean500');
			const searchEnd = Date.now();
			const searchTime = searchEnd - searchStart;

			assert.ok(foundBean, 'Bean 검색 성공');
			assert.ok(searchTime < 100, `검색 시간이 100ms 미만이어야 함 (실제: ${searchTime}ms)`);

		});

		test('should_에러_상황_견고성_확인', () => {

			// null/undefined 입력 테스트
			const nullResult = beanResolver.findBeanByName(null as any);
			const undefinedResult = beanResolver.findBeanByName(undefined as any);
			const emptyResult = beanResolver.findBeanByName('');
			const spaceResult = beanResolver.findBeanByName('   ');

			assert.strictEqual(nullResult, undefined, 'null 입력 시 undefined 반환');
			assert.strictEqual(undefinedResult, undefined, 'undefined 입력 시 undefined 반환');
			assert.strictEqual(emptyResult, undefined, '빈 문자열 입력 시 undefined 반환');
			assert.strictEqual(spaceResult, undefined, '공백 문자열 입력 시 undefined 반환');

			// 타입별 검색에서도 유사한 테스트
			const nullTypeResults = beanResolver.findBeansByType(null as any);
			const emptyTypeResults = beanResolver.findBeansByType('');

			assert.strictEqual(nullTypeResults.length, 0, 'null 타입 검색 시 빈 배열 반환');
			assert.strictEqual(emptyTypeResults.length, 0, '빈 타입 검색 시 빈 배열 반환');

		});

		test('should_메모리_효율성_확인', () => {

			// Bean 추가
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
			assert.strictEqual(beanResolver.getBeanCount(), 1, 'Bean 추가 후 개수 확인');

			// 캐시 클리어
			beanResolver.clearCache();
			assert.strictEqual(beanResolver.getBeanCount(), 0, '캐시 클리어 후 Bean 개수가 0이어야 함');

			// 클리어 후 검색 테스트
			const notFound = beanResolver.findBeanByName('cacheTestBean');
			assert.strictEqual(notFound, undefined, '캐시 클리어 후에는 Bean을 찾을 수 없어야 함');

		});
	});

	suite('실제 시나리오 테스트', () => {

		test('should_Extension_초기화_시뮬레이션_성공', () => {

			// Extension 활성화 시나리오 시뮬레이션
			// 1. 컴포넌트들이 올바르게 생성되는지 확인
			assert.ok(beanResolver, 'BeanResolver 생성 성공');
			assert.ok(beanDetector, 'SpringBeanDetector 생성 성공');
			assert.ok(codeLensProvider, 'SpringCodeLensProvider 생성 성공');
			assert.ok(javaParser, 'JavaFileParser 생성 성공');

			// 2. 초기 상태 확인
			assert.strictEqual(beanResolver.getBeanCount(), 0, '초기 Bean 개수가 0이어야 함');

			// 3. Provider 간 의존성 확인
			// (SpringCodeLensProvider가 BeanResolver와 SpringBeanDetector를 받는지)
			// 이는 생성자에서 이미 확인됨

		});

		test('should_전형적인_Spring_Boot_시나리오_시뮬레이션', () => {

			// 시나리오: Spring Boot 프로젝트에서 Service와 Repository가 있는 상황

			// 1. Repository Bean 등록 (프로젝트 스캔 결과)
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

			// 2. Service Bean 등록
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

			// 3. 사용자가 Service에서 Repository 주입을 원하는 상황 시뮬레이션
			const injectionResolution = beanResolver.resolveBeanForInjection('ProductRepository');

			assert.ok(injectionResolution.resolved, 'Repository Bean 해결 성공');
			assert.strictEqual(injectionResolution.resolved?.name, 'productRepository');
			assert.strictEqual(injectionResolution.candidates.length, 1, '후보가 1개');

			// 4. CodeLens 표시를 위한 정보 생성 시뮬레이션
			const targetBean = injectionResolution.resolved!;
			const navigationInfo = {
				title: `Go to ${targetBean.className}`,
				uri: targetBean.fileUri,
				position: targetBean.position
			};

			assert.strictEqual(navigationInfo.title, 'Go to ProductRepository');
			assert.ok(navigationInfo.uri.fsPath.includes('ProductRepository.java'));

		});

		test('should_다중_구현체_후보_처리_시뮬레이션', () => {

			// 같은 인터페이스의 여러 구현체 상황
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

			// 인터페이스 정보 추가
			(jpaImpl as any).interfaces = ['UserRepository'];
			(mongoImpl as any).interfaces = ['UserRepository'];

			beanResolver.addBeanDefinition(jpaImpl);
			beanResolver.addBeanDefinition(mongoImpl);

			// 인터페이스 타입으로 검색하면 두 구현체 모두 반환
			const multipleResolution = beanResolver.resolveBeanForInjection('UserRepository');

			assert.strictEqual(multipleResolution.resolved, undefined, '다중 후보 시 자동 해결 안됨');
			assert.strictEqual(multipleResolution.candidates.length, 2, '2개의 후보가 있어야 함');

			const candidateNames = multipleResolution.candidates.map(c => c.className).sort();
			assert.deepStrictEqual(candidateNames, ['UserRepositoryJpaImpl', 'UserRepositoryMongoImpl']);

		});
	});
}); 