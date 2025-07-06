import { 
    ClassInfo, 
    FieldInfo,
    ParameterInfo,
    SpringAnnotationType, 
    VirtualConstructorInfo,
    LombokSimulationResult,
    LombokFieldAnalysis,
    InjectionInfo,
    InjectionType,
    AnnotationInfo
} from '../models/spring-types';
import { AbstractInjectionDetector } from './abstract-injection-detector';

/**
 * Detects Lombok annotation-based dependency injection.
 * Simulates Lombok constructors generated at compile time to provide injection information.
 */
export class LombokInjectionDetector extends AbstractInjectionDetector {
    protected getDetectorName(): string {
        return 'LombokInjectionDetector';
    }

    /**
     * Detects Lombok-based dependency injections in a single class.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected Lombok injections
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        const requiredArgsInjections = this.detectRequiredArgsConstructorInjections(classInfo);
        injections.push(...requiredArgsInjections);

        const allArgsInjections = this.detectAllArgsConstructorInjections(classInfo);
        injections.push(...allArgsInjections);

        return injections;
    }

    /**
     * Detects injection information from @RequiredArgsConstructor.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected injections
     */
    public detectRequiredArgsConstructorInjections(classInfo: ClassInfo): InjectionInfo[] {
        const virtualConstructor = this.detectRequiredArgsConstructor(classInfo);
        if (!virtualConstructor) {
            return [];
        }

        return this.convertVirtualConstructorToInjections(virtualConstructor, classInfo);
    }

    /**
     * Detects injection information from @AllArgsConstructor.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected injections
     */
    public detectAllArgsConstructorInjections(classInfo: ClassInfo): InjectionInfo[] {
        const virtualConstructor = this.detectAllArgsConstructor(classInfo);
        if (!virtualConstructor) {
            return [];
        }

        return this.convertVirtualConstructorToInjections(virtualConstructor, classInfo);
    }

    /**
     * Converts virtual constructor information to injection information.
     * 
     * @param virtualConstructor - Virtual constructor information
     * @param classInfo - Class information
     * @returns Array of converted injections
     */
    private convertVirtualConstructorToInjections(
        virtualConstructor: VirtualConstructorInfo, 
        classInfo: ClassInfo
    ): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        for (const parameter of virtualConstructor.parameters) {
            const correspondingField = classInfo.fields.find(field => 
                field.name === parameter.name && field.type === parameter.type
            );

            const injection: InjectionInfo = {
                targetType: parameter.type,
                targetName: parameter.name,
                injectionType: InjectionType.CONSTRUCTOR_LOMBOK,
                position: correspondingField?.position || parameter.position || classInfo.position,
                range: correspondingField?.range || classInfo.range
            };

            injections.push(injection);
        }

        return injections;
    }

    /**
     * Detects and creates virtual constructor for @RequiredArgsConstructor annotation.
     * Simulates a constructor with final fields and @NonNull fields as parameters.
     * 
     * @param classInfo - Class information to analyze
     * @returns Virtual constructor information or undefined
     */
    public detectRequiredArgsConstructor(classInfo: ClassInfo): VirtualConstructorInfo | undefined {
        if (!classInfo) {
            throw new Error('ClassInfo cannot be null');
        }

        const requiredArgsAnnotation = classInfo.annotations.find(
            annotation => annotation.type === SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR
        );

        if (!requiredArgsAnnotation) {
            return undefined;
        }

        const finalFields = classInfo.fields.filter(field => 
            field.isFinal && !field.isStatic
        );

        const nonNullFields = classInfo.fields.filter(field => 
            !field.isFinal && !field.isStatic &&
            field.annotations.some(annotation => 
                annotation.type === SpringAnnotationType.LOMBOK_NON_NULL
            )
        );

        const requiredFields = [...finalFields, ...nonNullFields];
        const parameters: ParameterInfo[] = requiredFields.map(field => ({
            name: field.name,
            type: field.type,
            position: field.position
        }));

        const visibility = this.extractLombokAccessLevel(requiredArgsAnnotation) || 'public';

        const virtualConstructor: VirtualConstructorInfo = {
            parameters: parameters,
            range: classInfo.range,
            lombokAnnotationType: SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR,
            annotationSource: 'RequiredArgsConstructor',
            visibility: visibility,
            isVirtual: true,
            position: classInfo.position
        };

        return virtualConstructor;
    }

    /**
     * Detects and creates virtual constructor for @AllArgsConstructor annotation.
     * Simulates a constructor with all fields as parameters (excluding static fields).
     * 
     * @param classInfo - Class information to analyze
     * @returns Virtual constructor information or undefined
     */
    public detectAllArgsConstructor(classInfo: ClassInfo): VirtualConstructorInfo | undefined {
        if (!classInfo) {
            throw new Error('ClassInfo cannot be null');
        }

        const allArgsAnnotation = classInfo.annotations.find(
            annotation => annotation.type === SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR
        );

        if (!allArgsAnnotation) {
            return undefined;
        }

        const allFields = classInfo.fields.filter(field => !field.isStatic);

        const parameters: ParameterInfo[] = allFields.map(field => ({
            name: field.name,
            type: field.type,
            position: field.position
        }));

        const visibility = this.extractLombokAccessLevel(allArgsAnnotation) || 'public';

        const virtualConstructor: VirtualConstructorInfo = {
            parameters: parameters,
            range: classInfo.range,
            lombokAnnotationType: SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR,
            annotationSource: 'AllArgsConstructor',
            visibility: visibility,
            isVirtual: true,
            position: classInfo.position
        };

        return virtualConstructor;
    }

    /**
     * Comprehensively analyzes Lombok annotations in a class to simulate virtual constructors.
     * 
     * @param classInfo - Class information to analyze
     * @returns Lombok simulation result
     */
    public simulateLombokGeneration(classInfo: ClassInfo): LombokSimulationResult {
        try {
            if (!classInfo) {
                return this.createFailedResult(['ClassInfo not provided']);
            }

            const virtualConstructors: VirtualConstructorInfo[] = [];
            const fieldAnalysisList: LombokFieldAnalysis[] = [];
            const errors: string[] = [];

            for (const annotation of classInfo.annotations) {
                if (annotation.type && annotation.type.toString().includes('INVALID')) {
                    errors.push(`Invalid annotation type: ${annotation.type}`);
                }
            }

            const requiredArgsConstructor = this.detectRequiredArgsConstructor(classInfo);
            if (requiredArgsConstructor) {
                virtualConstructors.push(requiredArgsConstructor);
            }

            const allArgsConstructor = this.detectAllArgsConstructor(classInfo);
            if (allArgsConstructor) {
                virtualConstructors.push(allArgsConstructor);
            }

            const fieldAnalysis: LombokFieldAnalysis = {
                requiredArgsFields: this.extractRequiredArgsFields(classInfo),
                allArgsFields: this.extractAllArgsFields(classInfo),
                classInfo: classInfo
            };
            fieldAnalysisList.push(fieldAnalysis);

            return {
                virtualConstructors: virtualConstructors,
                fieldAnalysis: fieldAnalysisList,
                isSuccess: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            return this.createFailedResult([`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        }
    }

    /**
     * Extracts access level from Lombok annotation.
     * 
     * @param annotation - Lombok annotation information
     * @returns Access level string or undefined
     */
    private extractLombokAccessLevel(annotation: AnnotationInfo): string | undefined {
        if (annotation.parameters && annotation.parameters.has('access')) {
            const accessValue = annotation.parameters.get('access');
            if (accessValue === 'PROTECTED' || accessValue === 'protected') {
                return 'protected';
            }
            if (accessValue === 'PRIVATE' || accessValue === 'private') {
                return 'private';
            }
            if (accessValue === 'PACKAGE' || accessValue === 'package') {
                return '';
            }
        }
        return 'public';
    }

    /**
     * Extracts fields to be included in @RequiredArgsConstructor.
     * 
     * @param classInfo - Class information
     * @returns Final and @NonNull fields
     */
    private extractRequiredArgsFields(classInfo: ClassInfo): FieldInfo[] {
        const finalFields = classInfo.fields.filter(field => 
            field.isFinal && !field.isStatic
        );

        const nonNullFields = classInfo.fields.filter(field => 
            !field.isFinal && !field.isStatic &&
            field.annotations.some(annotation => 
                annotation.type === SpringAnnotationType.LOMBOK_NON_NULL
            )
        );

        return [...finalFields, ...nonNullFields];
    }

    /**
     * Extracts fields to be included in @AllArgsConstructor.
     * 
     * @param classInfo - Class information
     * @returns All non-static fields
     */
    private extractAllArgsFields(classInfo: ClassInfo): FieldInfo[] {
        return classInfo.fields.filter(field => !field.isStatic);
    }

    /**
     * Creates a failed simulation result.
     * 
     * @param errors - Error messages
     * @returns Failed result
     */
    private createFailedResult(errors: string[]): LombokSimulationResult {
        return {
            virtualConstructors: [],
            fieldAnalysis: [],
            isSuccess: false,
            errors: errors
        };
    }
} 