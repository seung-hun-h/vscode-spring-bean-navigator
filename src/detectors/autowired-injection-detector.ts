import * as vscode from 'vscode';
import { ClassInfo, SpringAnnotationType, InjectionInfo, InjectionType } from '../models/spring-types';
import { PositionCalculator } from '../parsers/core/position-calculator';
import { AbstractInjectionDetector } from './abstract-injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * Handles detection and processing of @Autowired annotation-based injections.
 */
export class AutowiredInjectionDetector extends AbstractInjectionDetector {
    private readonly positionCalculator: PositionCalculator;

    constructor(positionCalculator: PositionCalculator) {
        super();
        this.positionCalculator = positionCalculator;
    }

    protected getDetectorName(): string {
        return 'AutowiredInjectionDetector';
    }

    /**
     * Extracts injection information from fields annotated with @Autowired in a single class.
     * 
     * @param classInfo - Class information to analyze
     * @returns Injection information for @Autowired fields
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        if (!classInfo.fields || !Array.isArray(classInfo.fields)) {
            return injections;
        }

        for (const field of classInfo.fields) {
            if (!field || !field.annotations || !Array.isArray(field.annotations)) {
                continue;
            }

            const autowiredAnnotation = this.findAnnotation(
                field.annotations,
                annotation => annotation && annotation.type === SpringAnnotationType.AUTOWIRED
            );

            if (autowiredAnnotation) {
                const actualPosition = this.findFieldPositionInContent(classInfo, field.name, field.type);

                const injection: InjectionInfo = {
                    targetType: field.type,
                    injectionType: InjectionType.FIELD,
                    position: actualPosition || field.position,
                    range: new vscode.Range(
                        actualPosition || field.position,
                        new vscode.Position(
                            (actualPosition || field.position).line,
                            (actualPosition || field.position).character + field.name.length
                        )
                    ),
                    targetName: field.name,
                    // Will be set later by BeanResolver
                    resolvedBean: undefined,
                    candidateBeans: undefined
                };

                injections.push(injection);
            }
        }

        return injections;
    }

    /**
     * Finds the actual field position in the file content.
     * 
     * @param classInfo - Class information
     * @param fieldName - Field name
     * @param fieldType - Field type
     * @returns Field position or undefined if not found
     */
    private findFieldPositionInContent(classInfo: ClassInfo, fieldName: string, fieldType: string): vscode.Position | undefined {
        try {
            const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === classInfo.fileUri.toString());
            if (!document) {
                return undefined;
            }

            const content = document.getText();
            const lines = content.split('\n');

            return this.positionCalculator.findFieldPosition(fieldName, fieldType, lines);

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Finding field position');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                fieldName: fieldName || 'Unknown',
                fieldType: fieldType || 'Unknown'
            });
        }

        return undefined;
    }
} 