import { ClassInfo, InjectionInfo } from '../models/spring-types';
import { InjectionDetector } from './injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Base class that abstracts common logic for all Injection Detectors.
 * Uses Template Method Pattern to provide common logic while allowing
 * concrete classes to implement specialized detection logic.
 */
export abstract class AbstractInjectionDetector implements InjectionDetector {
    
    /**
     * Returns the detector name for error logging purposes.
     * Must be overridden by concrete classes.
     */
    protected abstract getDetectorName(): string;

    /**
     * Detects injection information from a single class.
     * Concrete classes must implement their specialized detection logic.
     * 
     * @param classInfo - Class information to analyze
     * @returns Array of detected injection information
     */
    protected abstract detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[];

    /**
     * Detects injection information from all classes.
     * Uses Template Method Pattern to provide common logic.
     * 
     * @param classes - Array of class information to analyze
     * @returns Array of all detected injection information
     */
    public detectAllInjections(classes: ClassInfo[]): InjectionInfo[] {
        const allInjections: InjectionInfo[] = [];

        try {
            if (!this.validateInput(classes)) {
                return allInjections;
            }

            for (const classInfo of classes) {
                try {
                    if (!this.validateClassInfo(classInfo)) {
                        continue;
                    }

                    const classInjections = this.detectInjectionsForClass(classInfo);
                    
                    if (classInjections && classInjections.length > 0) {
                        allInjections.push(...classInjections);
                    }

                } catch (classError) {
                    this.handleClassProcessingError(classError, classInfo);
                    // Continue processing other classes even if one fails
                    continue;
                }
            }

        } catch (error) {
            this.handleOverallProcessingError(error, classes, allInjections);
        }

        return allInjections;
    }

    /**
     * Validates input parameters.
     * 
     * @param classes - Array of classes to validate
     * @returns true if input is valid
     */
    protected validateInput(classes: ClassInfo[]): boolean {
        if (!classes || !Array.isArray(classes) || classes.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * Validates individual class information.
     * 
     * @param classInfo - Class information to validate
     * @returns true if class information is valid
     */
    protected validateClassInfo(classInfo: ClassInfo): boolean {
        return classInfo != null && typeof classInfo === 'object';
    }

    /**
     * Handles errors that occur during individual class processing.
     * 
     * @param error - The error that occurred
     * @param classInfo - Class information being processed
     */
    protected handleClassProcessingError(error: any, classInfo: ClassInfo): void {
        const parsingError = ErrorHandler.handleParsingError(
            error, 
            `${this.getDetectorName()} - Individual class processing`
        );
        ErrorHandler.logError(parsingError, { 
            detectorName: this.getDetectorName(),
            className: classInfo?.name || 'Unknown',
            classFileUri: classInfo?.fileUri?.toString() || 'Unknown'
        });
    }

    /**
     * Handles errors that occur during overall processing.
     * 
     * @param error - The error that occurred
     * @param classes - Array of classes being processed
     * @param allInjections - Injections collected so far
     */
    protected handleOverallProcessingError(
        error: any, 
        classes: ClassInfo[], 
        allInjections: InjectionInfo[]
    ): void {
        const parsingError = ErrorHandler.handleParsingError(
            error, 
            `${this.getDetectorName()} - Overall detection processing`
        );
        ErrorHandler.logError(parsingError, { 
            detectorName: this.getDetectorName(),
            totalClasses: classes?.length || 0,
            processedInjections: allInjections.length,
            errorLocation: 'Overall processing phase'
        });
    }

    /**
     * Helper method to find an annotation matching a predicate.
     * 
     * @param annotations - Array of annotations to search
     * @param predicate - Search condition function
     * @returns First annotation matching the predicate or undefined
     */
    protected findAnnotation<T>(
        annotations: T[], 
        predicate: (annotation: T) => boolean
    ): T | undefined {
        if (!annotations || !Array.isArray(annotations)) {
            return undefined;
        }
        return annotations.find(predicate);
    }

    /**
     * Checks if an array is null or empty.
     * 
     * @param array - Array to check
     * @returns true if array is null or empty
     */
    protected isNullOrEmpty<T>(array: T[]): boolean {
        return !array || !Array.isArray(array) || array.length === 0;
    }
} 