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

    suite('Class Declaration Visitor', () => {
        test('should_extractClassName_when_classDeclarationVisited', async () => {
            // Arrange
            const source = 'public class UserService {}';
            const { parse } = await import('java-parser');
            const cst = parse(source);
            const collector = await createSpringInfoCollector(mockUri);

            // Act
            collector.visit(cst);

            // Assert
            assert.strictEqual((collector as any).classes.length, 1, 'Should extract one class');
            assert.strictEqual((collector as any).classes[0].name, 'UserService', 'Should extract correct class name');
        });

        test('should_extractPackageName_when_packageDeclarationExists', async () => {
            // Arrange
            const source = `package com.example.service;
            
            public class UserService {}`;
            const { parse } = await import('java-parser');
            const cst = parse(source);
            const collector = await createSpringInfoCollector(mockUri);

            // Act
            collector.visit(cst);

            // Assert
            assert.strictEqual((collector as any).classes.length, 1, 'Should extract one class');
            assert.strictEqual((collector as any).classes[0].packageName, 'com.example.service', 
                'Should extract correct package name');
            assert.strictEqual((collector as any).classes[0].fullyQualifiedName, 'com.example.service.UserService', 
                'Should construct correct fully qualified name');
        });
    });
}); 