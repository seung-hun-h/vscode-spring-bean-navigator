import * as assert from 'assert';
import * as vscode from 'vscode';
import { SpringCodeLensProvider } from '../../providers/code-lens-provider';
import { BeanResolver } from '../../utils/bean-resolver';
import { SpringBeanDetector } from '../../detectors/spring-bean-detector';
import { TestUtils } from '../helpers/test-utils';

suite('SpringCodeLensProvider', () => {
    let provider: SpringCodeLensProvider;
    let mockBeanResolver: BeanResolver;
    let mockBeanDetector: SpringBeanDetector;
    
    setup(() => {
        mockBeanResolver = new BeanResolver();
        mockBeanDetector = new SpringBeanDetector();
        provider = new SpringCodeLensProvider(mockBeanResolver, mockBeanDetector);
    });

    suite('isJavaFile', () => {
        test('should_returnTrue_when_javaFileProvided', () => {
            // Arrange
            const javaDocument = createDocumentWithLanguage('java');
            
            // Act
            const result = provider.isJavaFile(javaDocument);
            
            // Assert
            assert.strictEqual(result, true, 'Should return true for Java files');
        });

        test('should_returnFalse_when_nonJavaFileProvided', () => {
            // Arrange
            const textDocument = createDocumentWithLanguage('typescript');
            
            // Act
            const result = provider.isJavaFile(textDocument);
            
            // Assert
            assert.strictEqual(result, false, 'Should return false for non-Java files');
        });
    });

    suite('getBeanDisplayName', () => {
        test('should_returnSimpleName_when_shortClassName', () => {
            // Act
            const result = provider.getBeanDisplayName('UserService');
            
            // Assert
            assert.strictEqual(result, 'UserService', 'Should return simple class name');
        });

        test('should_returnSimpleName_when_fullyQualifiedName', () => {
            // Act
            const result = provider.getBeanDisplayName('com.example.service.UserService');
            
            // Assert
            assert.strictEqual(result, 'UserService', 'Should extract simple name from FQN');
        });
    });

    suite('provideCodeLenses - Basic', () => {
        test('should_returnEmptyArray_when_nonJavaFileProvided', async () => {
            // Arrange
            const document = createDocumentWithLanguage('typescript');
            
            // Act
            const codeLenses = await provider.provideCodeLenses(document);
            
            // Assert
            assert.ok(codeLenses);
            assert.strictEqual(codeLenses.length, 0, 'Should return empty array for non-Java files');
        });

        test('should_handleError_when_parsingFails', async () => {
            // Arrange
            const document = createDocumentWithContent('invalid java content {{{');
            
            // Act & Assert - should not throw
            const codeLenses = await provider.provideCodeLenses(document);
            assert.ok(codeLenses);
            assert.strictEqual(codeLenses.length, 0, 'Should return empty array on parsing error');
        });
    });
});

// Simplified helper functions
function createDocumentWithLanguage(languageId: string): vscode.TextDocument {
    return {
        languageId,
        getText: () => '',
        uri: vscode.Uri.file('/test/TestFile'),
    } as any;
}

function createDocumentWithContent(content: string): vscode.TextDocument {
    return {
        languageId: 'java',
        getText: () => content,
        uri: vscode.Uri.file('/test/TestFile.java'),
    } as any;
} 