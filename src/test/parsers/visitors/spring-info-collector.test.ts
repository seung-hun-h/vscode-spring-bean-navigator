import * as assert from 'assert';
import * as vscode from 'vscode';
import { SpringInfoCollector, createSpringInfoCollector } from '../../../parsers/visitors/spring-info-collector';
import { TestUtils } from '../../helpers/core-test-utils';

suite('SpringInfoCollector', () => {
    let mockUri: vscode.Uri;
    let BaseJavaCstVisitorWithDefaults: any;

    setup(async () => {
        mockUri = TestUtils.createMockUri('/test/UserService.java');
        // Dynamic import of java-parser
        const javaParser = await import('java-parser');
        BaseJavaCstVisitorWithDefaults = javaParser.BaseJavaCstVisitorWithDefaults;
    });

    suite('Basic Structure', () => {
        test('should_extendBaseJavaCstVisitorWithDefaults_when_instantiated', async () => {
            // Arrange & Act
            const collector = await createSpringInfoCollector(mockUri);

            // Assert
            assert.ok(collector instanceof BaseJavaCstVisitorWithDefaults, 
                'SpringInfoCollector should extend BaseJavaCstVisitorWithDefaults');
        });
    });
}); 