import { 
    ClassInfo, 
    InjectionInfo, 
    InjectionType 
} from '../models/spring-types';
import { AbstractInjectionDetector } from './abstract-injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Detects constructor injection patterns.
 * Supports both single constructor auto-injection (Spring Framework 5.0+) and @Autowired constructors.
 */
export class ConstructorInjectionDetector extends AbstractInjectionDetector {
    protected getDetectorName(): string {
        return 'ConstructorInjectionDetector';
    }

    /**
     * Detects constructor injections in a single class.
     * Handles both single constructor injection and @Autowired constructor injection.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected constructor injections
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        const singleConstructorInjections = this.detectSingleConstructorInjection(classInfo);
        injections.push(...singleConstructorInjections);

        // Avoid duplicates with single constructor injection
        if (singleConstructorInjections.length === 0) {
            const autowiredConstructorInjections = this.detectAutowiredConstructorInjection(classInfo);
            injections.push(...autowiredConstructorInjections);
        }

        return injections;
    }

    /**
     * Detects single constructor injection.
     * In Spring 5.0+, a single constructor is automatically injected without @Autowired annotation.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected constructor injections
     */
    public detectSingleConstructorInjection(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            if (!classInfo || !classInfo.constructors) {
                return injections;
            }

            // Process only when there is exactly one constructor
            if (classInfo.constructors.length === 1) {
                const constructor = classInfo.constructors[0];
                
                // Only consider as injection if there are parameters
                if (constructor.parameters && constructor.parameters.length > 0) {
                    for (const parameter of constructor.parameters) {
                        const injection: InjectionInfo = {
                            targetType: parameter.type,
                            targetName: parameter.name,
                            injectionType: InjectionType.CONSTRUCTOR,
                            position: parameter.position || constructor.position,
                            range: constructor.range
                        };
                        injections.push(injection);
                    }
                }
            }

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Detecting single constructor injection');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                constructorCount: classInfo?.constructors?.length || 0
            });
        }

        return injections;
    }

    /**
     * Detects @Autowired constructor injection.
     * When multiple constructors exist, finds and processes the constructor with @Autowired annotation.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected @Autowired constructor injections
     */
    public detectAutowiredConstructorInjection(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            if (!classInfo || !classInfo.constructors) {
                return injections;
            }

            const autowiredConstructor = classInfo.constructors.find(constructor => 
                constructor.hasAutowiredAnnotation
            );

            if (autowiredConstructor && autowiredConstructor.parameters) {
                for (const parameter of autowiredConstructor.parameters) {
                    const injection: InjectionInfo = {
                        targetType: parameter.type,
                        targetName: parameter.name,
                        injectionType: InjectionType.CONSTRUCTOR,
                        position: parameter.position || autowiredConstructor.position,
                        range: autowiredConstructor.range
                    };
                    injections.push(injection);
                }
            }

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Detecting @Autowired constructor injection');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                constructorCount: classInfo?.constructors?.length || 0
            });
        }

        return injections;
    }


} 