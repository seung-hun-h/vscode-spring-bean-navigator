import * as vscode from 'vscode';
import { 
    ClassInfo, 
    FieldInfo, 
    AnnotationInfo, 
    SpringAnnotationType, 
    BeanDefinition, 
    InjectionInfo, 
    InjectionType,
    ParameterInfo
} from '../../models/spring-types';

/**
 * Core test utility class providing basic helper methods
 */
export class TestUtils {
    
    /**
     * Creates a mock URI for testing
     */
    public static createMockUri(path: string = '/test/TestClass.java'): vscode.Uri {
        return vscode.Uri.file(path);
    }

    /**
     * Creates a test Position
     */
    public static createPosition(line: number = 0, character: number = 0): vscode.Position {
        return new vscode.Position(line, character);
    }

    /**
     * Creates a test Range
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
     * Creates test annotation info
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
     * Creates test field info
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
     * Creates test class info
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
     * Creates test Bean definition
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
            // Convenience properties
            beanName: name,
            className,
            annotationType: SpringAnnotationType.SERVICE,
            fullyQualifiedName
        };
    }

    /**
     * Creates ParameterInfo object
     */
    public static createParameterInfo(
        name: string = 'testParam',
        type: string = 'TestType',
        line: number = 1,
        column: number = 4
    ): ParameterInfo {
        return {
            name,
            type,
            position: this.createPosition(line, column)
        };
    }
} 