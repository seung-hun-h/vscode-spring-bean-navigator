import { InjectionInfo, InjectionType, ClassInfo, SpringAnnotationType } from '../models/spring-types';
import { AbstractInjectionDetector } from './abstract-injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Detects @Bean method parameter injections.
 * Identifies Spring injection points from @Bean method parameters in @Configuration classes.
 */
export class BeanMethodInjectionDetector extends AbstractInjectionDetector {
    protected getDetectorName(): string {
        return 'BeanMethodInjectionDetector';
    }

    /**
     * Detects Bean method parameter injections in a single class.
     * Called by AbstractInjectionDetector's Template Method Pattern.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected Bean method parameter injections
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        return this.detectInjections(classInfo);
    }

    /**
     * Detects @Bean method parameter injections in a class.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected Bean method parameter injections
     */
    public detectInjections(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            if (!this.isConfigurationClass(classInfo)) {
                return injections;
            }

            if (!classInfo.methods || classInfo.methods.length === 0) {
                return injections;
            }

            for (const method of classInfo.methods) {
                if (!this.isBeanMethod(method)) {
                    continue;
                }

                if (method.parameters && method.parameters.length > 0) {
                    for (const parameter of method.parameters) {
                        const injection: InjectionInfo = {
                            targetType: parameter.type,
                            targetName: parameter.name,
                            injectionType: InjectionType.BEAN_METHOD,
                            position: parameter.position || method.position,
                            range: parameter.range || method.range
                        };

                        injections.push(injection);
                    }
                }
            }

            return injections;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Detecting Bean method parameter injections');
            ErrorHandler.logError(parsingError, {
                detectorName: this.getDetectorName(),
                className: classInfo.name,
                methodCount: classInfo.methods?.length || 0
            });
            return injections;
        }
    }

    /**
     * Checks if a class is a @Configuration class.
     * 
     * @param classInfo - Class information to check
     * @returns Whether the class is a @Configuration class
     */
    private isConfigurationClass(classInfo: ClassInfo): boolean {
        if (!classInfo.annotations || classInfo.annotations.length === 0) {
            return false;
        }

        return classInfo.annotations.some(annotation => 
            annotation.type === SpringAnnotationType.CONFIGURATION
        );
    }

    /**
     * Checks if a method is a @Bean method.
     * 
     * @param method - Method information to check
     * @returns Whether the method is a @Bean method
     */
    private isBeanMethod(method: any): boolean {
        if (!method.annotations || method.annotations.length === 0) {
            return false;
        }

        return method.annotations.some((annotation: any) => 
            annotation.type === SpringAnnotationType.BEAN
        );
    }

    /**
     * Validates Bean method parameter injection.
     * 
     * @param classInfo - Class information
     * @returns Validation result
     */
    public validateInjection(classInfo: ClassInfo): boolean {
        try {
            if (!this.isConfigurationClass(classInfo)) {
                return false;
            }

            if (!classInfo.methods || classInfo.methods.length === 0) {
                return false;
            }

            const beanMethods = classInfo.methods.filter(method => this.isBeanMethod(method));
            return beanMethods.length > 0;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Validating Bean method injection');
            ErrorHandler.logError(parsingError, {
                detectorName: this.getDetectorName(),
                className: classInfo.name
            });
            return false;
        }
    }

    /**
     * Generates debugging information.
     * 
     * @param classInfo - Class information
     * @returns Debugging information
     */
    public getDebugInfo(classInfo: ClassInfo): any {
        const isConfiguration = this.isConfigurationClass(classInfo);
        const beanMethods = classInfo.methods?.filter(method => this.isBeanMethod(method)) || [];
        const totalParameters = beanMethods.reduce((sum, method) => sum + (method.parameters?.length || 0), 0);

        return {
            isConfigurationClass: isConfiguration,
            totalMethods: classInfo.methods?.length || 0,
            beanMethodCount: beanMethods.length,
            totalBeanMethodParameters: totalParameters,
            beanMethods: beanMethods.map(method => ({
                name: method.name,
                parameterCount: method.parameters?.length || 0,
                parameters: method.parameters?.map(p => ({ name: p.name, type: p.type })) || []
            }))
        };
    }
} 