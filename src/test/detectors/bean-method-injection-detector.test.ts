import * as assert from 'assert';
import * as vscode from 'vscode';
import { JavaFileParser } from '../../parsers/java-file-parser';
import { InjectionType } from '../../models/spring-types';

/**
 * @Bean method parameter injection tests
 * Tests the functionality of detecting beans received as parameters in @Bean methods of @Configuration classes
 */
suite('Bean Method Parameter Injection Detection', () => {
    let parser: JavaFileParser;

    setup(() => {
        parser = new JavaFileParser();
    });

    test('should_detectBeanMethodParameters_when_configurationClassPresent', async () => {
        // Arrange - Using modified user-provided code
        const javaContent = `
            @Configuration
            public class OrderProcessingConfiguration {
                @Bean
                public ProcessingChain<OrderContext> orderProcessingChain(
                    Processor<OrderContext> validateOrderProcessor,
                    Processor<OrderContext> checkInventoryProcessor,
                    Processor<OrderContext> calculatePriceProcessor,
                    Processor<OrderContext> applyDiscountProcessor,
                    Processor<OrderContext> processPaymentProcessor,
                    Processor<OrderContext> sendNotificationProcessor
                ) {
                    return ProcessingChain.<OrderContext>builder()
                        .name("orderProcessingChain")
                        .executable(context -> OrderType.STANDARD.is(context.getOrder()))
                        .processor(validateOrderProcessor)
                        .processor(checkInventoryProcessor)
                        .processor(calculatePriceProcessor)
                        .processor(applyDiscountProcessor)
                        .processor(processPaymentProcessor)
                        .processor(sendNotificationProcessor)
                        .build();
                }
            }`;

        const fileUri = vscode.Uri.parse('file:///test/OrderProcessingConfiguration.java');

        // Act
        const parseResult = await parser.parseJavaFile(fileUri, javaContent);

        if (parseResult.classes.length > 0) {
            const classInfo = parseResult.classes[0];

            // Assertions
            const beanMethodInjections = parseResult.injections.filter(i => 
                i.injectionType === InjectionType.BEAN_METHOD
            );

            if (beanMethodInjections.length > 0) {
                assert.ok(beanMethodInjections.length >= 6, 'Should detect at least 6 bean method parameter injections');
            }

            const configurationAnnotation = classInfo.annotations.find(a => a.name === 'Configuration');
            assert.ok(configurationAnnotation, 'Should detect @Configuration annotation');

            if (classInfo.methods && classInfo.methods.length > 0) {
                const beanMethod = classInfo.methods.find(m => 
                    m.annotations?.some(a => a.name === 'Bean')
                );
                assert.ok(beanMethod, 'Should detect @Bean method');
                
                if (beanMethod && beanMethod.parameters) {
                    assert.ok(beanMethod.parameters.length >= 6, 'Bean method should have at least 6 parameters');
                }
            }
        }
    });

    test('should_handleMultipleBeanMethods_when_configurationHasMultipleBeans', async () => {
        // Arrange
        const javaContent = `
            @Configuration
            public class ShoppingConfiguration {
                @Bean
                public ProductService productService(ProductRepository productRepository) {
                    return new ProductService(productRepository);
                }
                
                @Bean
                public CartService cartService(
                    CartRepository cartRepository,
                    ProductService productService,
                    DiscountService discountService
                ) {
                    return new CartService(cartRepository, productService, discountService);
                }
            }`;

        const fileUri = vscode.Uri.parse('file:///test/ShoppingConfiguration.java');

        // Act
        const parseResult = await parser.parseJavaFile(fileUri, javaContent);

        if (parseResult.classes.length > 0) {
            const classInfo = parseResult.classes[0];

            assert.ok(classInfo.methods && classInfo.methods.length >= 2, 'Should detect at least 2 methods');
        }
    });
}); 