import {
    FieldInfo,
    SpringAnnotationType,
    ParameterInfo,
    VirtualConstructorInfo,
    LombokAnnotationInfo,
    LombokFieldAnalysis,
    LombokSimulationResult
} from '../../models/spring-types';
import { TestUtils } from './core-test-utils';

export class LombokMockHelper {
    
    /**
     * Creates mock Lombok annotation info
     */
    public static createLombokAnnotationInfo(
        type: SpringAnnotationType, 
        parameters?: Map<string, string>
    ): LombokAnnotationInfo {
        return {
            name: type.toString(),
            type: type,
            line: 3,
            column: 0,
            parameters: parameters || new Map(),
            lombokConfig: new Map([
                ['access', 'public'],
                ['staticName', '']
            ])
        };
    }

    /**
     * Creates mock virtual constructor info
     */
    public static createVirtualConstructorInfo(
        source: string, 
        parameters: ParameterInfo[],
        lombokType: SpringAnnotationType
    ): VirtualConstructorInfo {
        return {
            parameters: parameters,
            range: TestUtils.createRange(5, 4, 8, 5),
            lombokAnnotationType: lombokType,
            annotationSource: source,
            visibility: 'public',
            isVirtual: true,
            position: TestUtils.createPosition(5, 4)
        };
    }

    /**
     * Mock final field
     */
    public static createFinalFieldInfo(name: string, type: string, line: number): FieldInfo {
        return {
            name: name,
            type: type,
            position: TestUtils.createPosition(line, 4),
            range: TestUtils.createRange(line, 4, line, 50),
            annotations: [],
            visibility: 'private',
            isFinal: true,
            isStatic: false
        };
    }

    /**
     * @NonNull field mock
     */
    public static createNonNullFieldInfo(name: string, type: string, line: number): FieldInfo {
        return {
            name: name,
            type: type,
            position: TestUtils.createPosition(line, 4),
            range: TestUtils.createRange(line, 4, line, 50),
            annotations: [{
                name: 'NonNull',
                type: SpringAnnotationType.LOMBOK_NON_NULL,
                line: line - 1,
                column: 4
            }],
            visibility: 'private',
            isFinal: false,
            isStatic: false
        };
    }

    /**
     * static final field mock
     */
    public static createStaticFinalFieldInfo(name: string, type: string, line: number): FieldInfo {
        return {
            name: name,
            type: type,
            position: TestUtils.createPosition(line, 4),
            range: TestUtils.createRange(line, 4, line, 50),
            annotations: [],
            visibility: 'private',
            isFinal: true,
            isStatic: true // static final field not included in constructor
        };
    }
}