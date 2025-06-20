import * as assert from 'assert';
import * as vscode from 'vscode';
import { SpringBeanDetector } from '../../detectors/spring-bean-detector';
import { BeanDefinition, SpringAnnotationType } from '../../models/spring-types';
import { JavaSampleGenerator } from '../helpers/test-utils';

suite('SpringBeanDetector', () => {
    let detector: SpringBeanDetector;
    
    setup(() => {
        detector = new SpringBeanDetector();
    });

    suite('detectBeansInWorkspace', () => {
        test('should_detectServiceBean_when_serviceClassProvided', async () => {
            // Arrange
            const serviceContent = JavaSampleGenerator.serviceClass();
            const mockUri = vscode.Uri.parse('file:///src/UserService.java');
            
            // Act
            const beans = await detector.detectBeansInContent(serviceContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'UserService');
            assert.strictEqual(beans[0].beanName, 'userService');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.SERVICE);
            assert.strictEqual(beans[0].fullyQualifiedName, 'com.example.service.UserService');
        });

        test('should_detectComponentBean_when_componentClassProvided', async () => {
            // Arrange
            const componentContent = JavaSampleGenerator.componentClass();
            const mockUri = vscode.Uri.parse('file:///src/EmailValidator.java');
            
            // Act
            const beans = await detector.detectBeansInContent(componentContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'DataProcessor');
            assert.strictEqual(beans[0].beanName, 'dataProcessor');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.COMPONENT);
        });

        test('should_detectRepositoryBean_when_repositoryClassProvided', async () => {
            // Arrange
            const repositoryContent = JavaSampleGenerator.repositoryClass();
            const mockUri = vscode.Uri.parse('file:///src/UserRepository.java');
            
            // Act
            const beans = await detector.detectBeansInContent(repositoryContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'UserRepository');
            assert.strictEqual(beans[0].beanName, 'userRepository');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.REPOSITORY);
        });

        test('should_detectControllerBean_when_controllerClassProvided', async () => {
            // Arrange
            const controllerContent = JavaSampleGenerator.controllerClass();
            const mockUri = vscode.Uri.parse('file:///src/UserController.java');
            
            // Act
            const beans = await detector.detectBeansInContent(controllerContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'UserController');
            assert.strictEqual(beans[0].beanName, 'userController');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.CONTROLLER);
        });

        test('should_detectRestControllerBean_when_restControllerClassProvided', async () => {
            // Arrange
            const restControllerContent = JavaSampleGenerator.restControllerClass();
            const mockUri = vscode.Uri.parse('file:///src/ApiController.java');
            
            // Act
            const beans = await detector.detectBeansInContent(restControllerContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'ApiController');
            assert.strictEqual(beans[0].beanName, 'apiController');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.REST_CONTROLLER);
        });

        test('should_detectConfigurationBean_when_configurationClassProvided', async () => {
            // Arrange
            const configContent = JavaSampleGenerator.configurationOnlyClass();
            const mockUri = vscode.Uri.parse('file:///src/AppConfig.java');
            
            // Act
            const beans = await detector.detectBeansInContent(configContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].className, 'AppConfig');
            assert.strictEqual(beans[0].beanName, 'appConfig');
            assert.strictEqual(beans[0].annotationType, SpringAnnotationType.CONFIGURATION);
        });

        test('should_detectBeanMethods_when_configurationWithBeanMethodsProvided', async () => {
            // Arrange
            const configWithBeansContent = JavaSampleGenerator.configurationWithBeanMethods();
            const mockUri = vscode.Uri.parse('file:///src/DatabaseConfig.java');
            
            // Act
            const beans = await detector.detectBeansInContent(configWithBeansContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 3); // Configuration 클래스 + 2개 Bean 메소드
            
            // Configuration 클래스 검증
            const configBean = beans.find((b: BeanDefinition) => b.className === 'DatabaseConfig');
            assert.ok(configBean);
            assert.strictEqual(configBean.annotationType, SpringAnnotationType.CONFIGURATION);
            
            // Bean 메소드들 검증
            const dataSourceBean = beans.find((b: BeanDefinition) => b.beanName === 'dataSource');
            assert.ok(dataSourceBean);
            assert.strictEqual(dataSourceBean.className, 'DataSource');
            assert.strictEqual(dataSourceBean.annotationType, SpringAnnotationType.BEAN);
            
            const emfBean = beans.find((b: BeanDefinition) => b.beanName === 'entityManagerFactory');
            assert.ok(emfBean);
            assert.strictEqual(emfBean.className, 'EntityManagerFactory');
            assert.strictEqual(emfBean.annotationType, SpringAnnotationType.BEAN);
        });

        test('should_detectMultipleBeans_when_multipleAnnotatedClassesProvided', async () => {
            // Arrange
            const multipleBeansContent = JavaSampleGenerator.multipleBeansClass();
            const mockUri = vscode.Uri.parse('file:///src/Mixed.java');
            
            // Act
            const beans = await detector.detectBeansInContent(multipleBeansContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 2);
            
            const serviceBean = beans.find((b: BeanDefinition) => b.className === 'UserService');
            assert.ok(serviceBean);
            assert.strictEqual(serviceBean.annotationType, SpringAnnotationType.SERVICE);
            
            const repoBean = beans.find((b: BeanDefinition) => b.className === 'UserRepository');
            assert.ok(repoBean);
            assert.strictEqual(repoBean.annotationType, SpringAnnotationType.REPOSITORY);
        });

        test('should_returnEmptyArray_when_noSpringAnnotationsProvided', async () => {
            // Arrange
            const plainJavaContent = JavaSampleGenerator.plainJavaClass();
            const mockUri = vscode.Uri.parse('file:///src/PlainJavaClass.java');
            
            // Act
            const beans = await detector.detectBeansInContent(plainJavaContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 0);
        });

        test('should_handleParsingError_when_invalidJavaFileProvided', async () => {
            // Arrange
            const invalidContent = JavaSampleGenerator.invalidJavaFile();
            const mockUri = vscode.Uri.parse('file:///src/Invalid.java');
            
            // Act & Assert - should not throw
            const beans = await detector.detectBeansInContent(invalidContent, mockUri);
            assert.strictEqual(beans.length, 0);
        });

        test('should_detectCustomBeanName_when_annotationHasValueAttribute', async () => {
            // Arrange
            const customBeanNameContent = JavaSampleGenerator.customBeanNameService();
            const mockUri = vscode.Uri.parse('file:///src/UserService.java');
            
            // Act
            const beans = await detector.detectBeansInContent(customBeanNameContent, mockUri);
            
            // Assert
            assert.strictEqual(beans.length, 1);
            assert.strictEqual(beans[0].beanName, 'customUserService');
            assert.strictEqual(beans[0].className, 'UserService');
        });
    });

    suite('generateBeanName', () => {
        test('should_generateCamelCaseBeanName_when_classNameProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.generateBeanName('UserService'), 'userService');
            assert.strictEqual(detector.generateBeanName('EmailValidator'), 'emailValidator');
            assert.strictEqual(detector.generateBeanName('XMLParser'), 'xMLParser');
            assert.strictEqual(detector.generateBeanName('SimpleClass'), 'simpleClass');
        });

        test('should_handleSingleLetter_when_singleCharacterClassProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.generateBeanName('A'), 'a');
            assert.strictEqual(detector.generateBeanName('X'), 'x');
        });
    });

    suite('isSpringBeanAnnotation', () => {
        test('should_returnTrue_when_springBeanAnnotationProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.SERVICE), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.COMPONENT), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.REPOSITORY), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.CONTROLLER), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.REST_CONTROLLER), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.CONFIGURATION), true);
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.BEAN), true);
        });

        test('should_returnFalse_when_nonBeanAnnotationProvided', () => {
            // Act & Assert
            assert.strictEqual(detector.isSpringBeanAnnotation(SpringAnnotationType.AUTOWIRED), false);
        });
    });
}); 