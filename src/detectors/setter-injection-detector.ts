import { 
    ClassInfo, 
    MethodInfo, 
    InjectionInfo, 
    InjectionType,
    SpringAnnotationType
} from '../models/spring-types';
import { AbstractInjectionDetector } from './abstract-injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Detects setter injection patterns.
 * Supports Spring's @Autowired setter methods.
 */
export class SetterInjectionDetector extends AbstractInjectionDetector {
    protected getDetectorName(): string {
        return 'SetterInjectionDetector';
    }

    /**
     * Detects setter injections in a single class.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected setter injections
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        return this.detectSetterInjection(classInfo);
    }

    /**
     * Detects setter injections in a class.
     * Parameters of setter methods with @Autowired annotation are considered as injections.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected setter injections
     */
    public detectSetterInjection(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            if (!classInfo || !classInfo.methods) {
                return injections;
            }

            for (const method of classInfo.methods) {
                if (method.isSetterMethod && this.hasAutowiredAnnotation(method)) {
                    if (method.parameters && method.parameters.length > 0) {
                        for (const parameter of method.parameters) {
                            const injection: InjectionInfo = {
                                targetType: parameter.type,
                                targetName: parameter.name,
                                injectionType: InjectionType.SETTER,
                                position: parameter.position || method.position,
                                range: method.range
                            };
                            injections.push(injection);
                        }
                    }
                }
            }

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Detecting setter injection');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                methodCount: classInfo?.methods?.length || 0
            });
        }

        return injections;
    }



    /**
     * Checks if a method has @Autowired annotation.
     * 
     * @param method - Method information to check
     * @returns true if method has @Autowired annotation
     */
    private hasAutowiredAnnotation(method: MethodInfo): boolean {
        try {
            if (!method.annotations || method.annotations.length === 0) {
                return false;
            }

            return method.annotations.some(annotation => 
                annotation.type === SpringAnnotationType.AUTOWIRED ||
                annotation.name === 'Autowired'
            );

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Checking @Autowired annotation');
            ErrorHandler.logError(parsingError, { 
                methodName: method?.name || 'Unknown',
                annotationCount: method?.annotations?.length || 0
            });
            return false;
        }
    }
} 