import * as vscode from 'vscode';
import { 
    BeanDefinition, 
    SpringAnnotationType, 
    ClassInfo, 
    InjectionInfo,
    JavaFileParseResult,
    AnnotationInfo,
    MethodInfo,
} from '../models/spring-types';
import { ConstructorInjectionDetector } from './constructor-injection-detector';
import { SetterInjectionDetector } from './setter-injection-detector';
import { AutowiredInjectionDetector } from './autowired-injection-detector';
import { LombokInjectionDetector } from './lombok-injection-detector';
import { BeanMethodInjectionDetector } from './bean-method-injection-detector';
import { PositionCalculator } from '../parsers/core/position-calculator';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Detects Spring Beans and creates Bean definitions.
 */
export class SpringBeanDetector {
    private constructorDetector: ConstructorInjectionDetector;
    private setterDetector: SetterInjectionDetector;
    private autowiredDetector: AutowiredInjectionDetector;
    private lombokDetector: LombokInjectionDetector;
    private beanMethodDetector: BeanMethodInjectionDetector;
    
    constructor() {
        this.constructorDetector = new ConstructorInjectionDetector();
        this.setterDetector = new SetterInjectionDetector();
        this.autowiredDetector = new AutowiredInjectionDetector(new PositionCalculator());
        this.lombokDetector = new LombokInjectionDetector();
        this.beanMethodDetector = new BeanMethodInjectionDetector();
    }

    /**
     * Detects Spring Beans from Java file parse result.
     * 
     * @param parseResult Java file parse result
     * @param fileUri File URI
     * @returns Detected Bean definitions
     */
    public detectBeansInParseResult(parseResult: JavaFileParseResult, fileUri: vscode.Uri): BeanDefinition[] {
        const beans: BeanDefinition[] = [];
        
        try {
            for (const classInfo of parseResult.classes) {
                const classBeans = this.extractBeansFromClass(classInfo, fileUri);
                beans.push(...classBeans);
            }
            
        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Detecting beans');
            ErrorHandler.logError(parsingError, { 
                fileUri: fileUri.toString(),
                classCount: parseResult.classes.length 
            });
            // Return empty array on error (test requirement)
        }
        
        return beans;
    }

    /**
     * Extracts Bean definitions from a class.
     * 
     * @param classInfo Parsed class information
     * @param fileUri File URI
     * @returns Bean definitions
     */
    private extractBeansFromClass(classInfo: ClassInfo, fileUri: vscode.Uri): BeanDefinition[] {
        const beans: BeanDefinition[] = [];
        
        for (const annotation of classInfo.annotations) {
            if (this.isSpringBeanAnnotation(annotation.type)) {
                const beanDefinition = this.createBeanDefinitionFromClass(classInfo, annotation.type, fileUri);
                beans.push(beanDefinition);
            }
        }
        
        const hasConfiguration = classInfo.annotations.some(
            annotation => annotation.type === SpringAnnotationType.CONFIGURATION
        );
        
        if (hasConfiguration) {
            const beanMethods = this.extractBeanMethods(classInfo, fileUri);
            beans.push(...beanMethods);
        }
        
        return beans;
    }

    /**
     * Creates Bean definition from a class.
     * 
     * @param classInfo Class information
     * @param annotationType Annotation type
     * @param fileUri File URI
     * @returns Bean definition
     */
    private createBeanDefinitionFromClass(
        classInfo: ClassInfo, 
        annotationType: SpringAnnotationType, 
        fileUri: vscode.Uri
    ): BeanDefinition {
        const className = classInfo.name;
        
        const customBeanName = this.extractCustomBeanName(classInfo, annotationType);
        const beanName = customBeanName || this.generateBeanName(className);
        
        const fullyQualifiedName = classInfo.fullyQualifiedName;
        
        const beanDefinition: BeanDefinition = {
            name: beanName,
            type: className,
            implementationClass: fullyQualifiedName,
            fileUri,
            position: classInfo.position,
            definitionType: 'class',
            annotation: annotationType,
            // Convenience properties
            beanName,
            className,
            annotationType,
            fullyQualifiedName
        };

        const interfaces = (classInfo as any).interfaces as string[] | undefined;
        if (interfaces && interfaces.length > 0) {
            (beanDefinition as any).interfaces = interfaces;
        }

        return beanDefinition;
    }

    /**
     * Extracts @Bean methods from @Configuration class.
     * 
     * @param classInfo Class information
     * @param fileUri File URI
     * @returns Bean definitions from @Bean methods
     */
    private extractBeanMethods(classInfo: ClassInfo, fileUri: vscode.Uri): BeanDefinition[] {
        const beans: BeanDefinition[] = [];
        
        if (classInfo.methods) {
            for (const method of classInfo.methods) {
                const beanAnnotation = method.annotations.find(
                    annotation => annotation.type === SpringAnnotationType.BEAN
                );
                
                if (beanAnnotation) {
                    const beanDefinition = this.createBeanDefinitionFromMethod(method, classInfo, fileUri);
                    beans.push(beanDefinition);
                }
            }
        }
        
        return beans;
    }
    
    /**
     * Creates Bean definition from @Bean method.
     * 
     * @param method Method information
     * @param classInfo Class information
     * @param fileUri File URI
     * @returns Bean definition
     */
    private createBeanDefinitionFromMethod(
        method: MethodInfo, 
        classInfo: ClassInfo, 
        fileUri: vscode.Uri
    ): BeanDefinition {
        const beanAnnotation = method.annotations.find(
            annotation => annotation.type === SpringAnnotationType.BEAN
        );
        
        const customBeanName = beanAnnotation ? this.extractCustomBeanNameFromAnnotation(beanAnnotation) : undefined;
        const beanName = customBeanName || this.generateBeanName(method.name);
        
        const beanDefinition: BeanDefinition = {
            name: beanName,
            type: method.returnType || 'Object',
            implementationClass: method.returnType || 'Object',
            fileUri,
            position: method.position,
            definitionType: 'method',
            annotation: SpringAnnotationType.BEAN,
            beanName,
            className: method.returnType || 'Object',
            annotationType: SpringAnnotationType.BEAN,
            fullyQualifiedName: method.returnType || 'Object'
        };

        return beanDefinition;
    }
    
    /**
     * Extracts custom Bean name from annotation.
     * 
     * @param annotation Annotation information
     * @returns Custom Bean name or undefined
     */
    private extractCustomBeanNameFromAnnotation(annotation: AnnotationInfo): string | undefined {
        if (annotation && annotation.parameters) {
            const value = annotation.parameters.get('value') || annotation.parameters.get('name');
            if (value) {
                return value.replace(/["']/g, '');
            }
        }
        
        return undefined;
    }

    /**
     * Extracts custom Bean name from annotation.
     * 
     * @param classInfo Class information
     * @param annotationType Annotation type
     * @returns Custom Bean name or undefined
     */
    private extractCustomBeanName(classInfo: ClassInfo, annotationType: SpringAnnotationType): string | undefined {
        const annotation = classInfo.annotations.find(ann => ann.type === annotationType);
        
        if (annotation && annotation.parameters) {
            const value = annotation.parameters.get('value') || annotation.parameters.get('name');
            if (value) {
                return value.replace(/["']/g, '');
            }
        }
        
        return undefined;
    }

    /**
     * Generates Bean name from class name.
     * Spring's default rule: lowercase first letter
     * 
     * @param className Class name
     * @returns Bean name
     */
    public generateBeanName(className: string): string {
        if (!className || className.length === 0) {
            return '';
        }
        
        if (className.length === 1) {
            return className.toLowerCase();
        }
        
        return className.charAt(0).toLowerCase() + className.slice(1);
    }

    /**
     * Checks if the given annotation defines a Spring Bean.
     * 
     * @param annotationType Annotation type
     * @returns Whether it's a Bean annotation
     */
    public isSpringBeanAnnotation(annotationType: SpringAnnotationType): boolean {
        const beanAnnotations = new Set([
            SpringAnnotationType.COMPONENT,
            SpringAnnotationType.SERVICE,
            SpringAnnotationType.REPOSITORY,
            SpringAnnotationType.CONTROLLER,
            SpringAnnotationType.REST_CONTROLLER,
            SpringAnnotationType.CONFIGURATION,
            SpringAnnotationType.BEAN
        ]);
        
        return beanAnnotations.has(annotationType);
    }

    /**
     * Detects all types of injections in a class (field + constructor + setter).
     * 
     * @param classInfo Class information to analyze
     * @returns All detected injections
     */
    public detectAllInjectionTypes(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        if (!classInfo) {
            return injections;
        }

        try {
            // 1. Field injection detection (@Autowired fields)
            const fieldInjections = this.autowiredDetector.detectAllInjections([classInfo]);
            injections.push(...fieldInjections);

            // 2. Constructor injection detection
            const constructorInjections = this.constructorDetector.detectAllInjections([classInfo]);
            injections.push(...constructorInjections);

            // 3. Setter injection detection
            const setterInjections = this.setterDetector.detectAllInjections([classInfo]);
            injections.push(...setterInjections);

            // 4. Lombok injection detection
            const lombokInjections = this.lombokDetector.detectAllInjections([classInfo]);
            injections.push(...lombokInjections);

            // 5. Bean method parameter injection detection
            const beanMethodInjections = this.beanMethodDetector.detectInjections(classInfo);
            injections.push(...beanMethodInjections);

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Detecting injections');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                fullyQualifiedName: classInfo?.fullyQualifiedName 
            });
        }

        return injections;
    }

    /**
     * Detects all injections in multiple classes.
     * 
     * @param classes Classes to analyze
     * @returns All detected injections
     */
    public detectAllInjectionsInClasses(classes: ClassInfo[]): InjectionInfo[] {
        const allInjections: InjectionInfo[] = [];

        if (!classes || !Array.isArray(classes)) {
            return allInjections;
        }

        for (const classInfo of classes) {
            const classInjections = this.detectAllInjectionTypes(classInfo);
            allInjections.push(...classInjections);
        }

        return allInjections;
    }
} 