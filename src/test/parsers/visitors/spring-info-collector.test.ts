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
            
            const javaParser = await import('java-parser');
            const cst = javaParser.parse(source);
            
            // Act
            const collector = await createSpringInfoCollector(mockUri);
            
            // Debug: validateVisitor가 있는지 확인
            console.log('collector has validateVisitor:', typeof (collector as any).validateVisitor);
            console.log('collector has classDeclaration:', typeof (collector as any).classDeclaration);
            console.log('collector prototype:', Object.getPrototypeOf(collector));
            
            collector.visit(cst);
            
            // Assert
            assert.strictEqual(collector.classes.length, 1);
            assert.strictEqual(collector.classes[0].name, 'UserService');
        });

        test('should_extractPackageName_when_packageDeclarationExists', async () => {
            // Arrange
            const source = `package com.example.service;
            
            public class UserService {}`;
            
            const javaParser = await import('java-parser');
            const cst = javaParser.parse(source);
            
            // Act
            const collector = await createSpringInfoCollector(mockUri);
            collector.visit(cst);
            
            // Assert
            assert.strictEqual(collector.classes.length, 1);
            assert.strictEqual(collector.classes[0].packageName, 'com.example.service');
            assert.strictEqual(collector.classes[0].fullyQualifiedName, 'com.example.service.UserService');
        });

        test('should_extractServiceAnnotation_when_classHasServiceAnnotation', async () => {
            // Arrange
            const source = `package com.example.service;
            
            @Service
            public class UserService {}`;
            
            const javaParser = await import('java-parser');
            const cst = javaParser.parse(source);
            
            // Act
            const collector = await createSpringInfoCollector(mockUri);
            collector.visit(cst);
            
            // Assert
            assert.strictEqual(collector.classes.length, 1);
            assert.ok(collector.classes[0].annotations, 'annotations should be defined');
            assert.strictEqual(collector.classes[0].annotations.length, 1);
            assert.strictEqual(collector.classes[0].annotations[0].name, 'Service');
        });

        test('should_extractLocation_when_classDeclarationVisited', async () => {
            // Arrange
            const source = `public class UserService {}`.trim();
            
            const javaParser = await import('java-parser');
            const cst = javaParser.parse(source);
            
            // Act
            const collector = await createSpringInfoCollector(mockUri);
            collector.visit(cst);
            
            // Assert
            assert.strictEqual(collector.classes.length, 1);
            const classInfo = collector.classes[0];
            assert.ok(classInfo.position, 'Position should be defined');
            assert.strictEqual(classInfo.position.line, 0, 'Line should be 0 (0-indexed)');
            assert.strictEqual(classInfo.position.character, 13, 'Character should be 13 (0-indexed)');
            assert.ok(classInfo.range, 'Range should be defined');
            assert.strictEqual(classInfo.range.start.line, 0, 'Range start line should be 0');
            assert.strictEqual(classInfo.range.start.character, 7, 'Range start character should be 7');
            assert.strictEqual(classInfo.range.end.line, 0, 'Range end line should be 0');
            assert.strictEqual(classInfo.range.end.character, 27, 'Range end character should be 27');
        });
    });
}); 