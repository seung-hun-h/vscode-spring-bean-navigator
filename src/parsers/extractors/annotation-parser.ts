import { 
    AnnotationInfo, 
    SpringAnnotationType, 
    AnnotationNode,
    ElementValuePairListNode,
    ElementValuePairNode,
    CSTNode
} from '../../models/spring-types';
import { JAVA_PARSER_CONFIG, SPRING_ANNOTATION_NAMES, SPRING_ANNOTATION_PACKAGES, PARSING_CONSTANTS } from '../config/java-parser-config';
import { ErrorHandler, AnnotationParsingError } from '../core/parser-errors';
import { PositionCalculator } from '../core/position-calculator';

/**
 * Handles Java annotation parsing
 */
export class AnnotationParser {
    private readonly positionCalculator: PositionCalculator;

    constructor(positionCalculator?: PositionCalculator) {
        this.positionCalculator = positionCalculator || new PositionCalculator();
    }

    /**
     * Parses an annotation.
     * 
     * @param annotation - Annotation node
     * @param lines - Array of file lines
     * @returns Annotation information or undefined
     */
    public parseAnnotation(annotation: AnnotationNode, lines: string[]): AnnotationInfo | undefined {
        let annotationName: string | undefined;
        
        try {
            let parameters = new Map<string, string>();
            
            // Actual structure: annotation.children = ['At', 'typeName'] or ['At', 'typeName', 'LParen', 'elementValuePairList', 'RParen']
            if (annotation.children?.typeName?.[0]?.children?.Identifier?.[0]?.image) {
                annotationName = annotation.children.typeName[0].children.Identifier[0].image;
            } else {
                return undefined;
            }
            
            if (!annotationName) {
                return undefined;
            }

            if (!JAVA_PARSER_CONFIG.SPRING_ANNOTATIONS.has(annotationName)) {
                return undefined;
            }

            parameters = this.extractAnnotationParameters(annotation);

            const springAnnotationType = this.mapToSpringAnnotationType(annotationName);
            if (!springAnnotationType) {
                return undefined;
            }

            const position = this.positionCalculator.calculatePosition(annotation, lines);

            const annotationInfo: AnnotationInfo = {
                name: annotationName,
                type: springAnnotationType,
                line: position.line,
                column: position.character,
                parameters
            };

            return annotationInfo;
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                'Failed to parse annotation',
                annotationName,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
            return undefined;
        }
    }

    /**
     * Extracts annotation parameters.
     * 
     * @param annotation - Annotation node
     * @returns Parameter map
     */
    public extractAnnotationParameters(annotation: AnnotationNode): Map<string, string> {
        const parameters = new Map<string, string>();
        
        try {
            // @Service("value") single value format
            if (annotation.children?.LParen && annotation.children?.StringLiteral) {
                const value = annotation.children.StringLiteral[0].image;
                const cleanValue = value.replace(/["']/g, '');
                parameters.set('value', cleanValue);
                return parameters;
            }
            
            if (annotation.children?.elementValuePairList) {
                // TODO: Parse more complex parameter structures
                const pairListParams = this.extractElementValuePairList(annotation.children.elementValuePairList[0]);
                pairListParams.forEach((value, key) => parameters.set(key, value));
                return parameters;
            }
            
            const literals = this.findStringLiterals(annotation);
            if (literals.length > 0) {
                parameters.set('value', literals[0]);
            }
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                'Failed to extract annotation parameters',
                this.getAnnotationName(annotation),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return parameters;
    }

    /**
     * Maps string to SpringAnnotationType using constants.
     * 
     * @param annotationName - Annotation name
     * @returns SpringAnnotationType or undefined
     */
    private mapToSpringAnnotationType(annotationName: string): SpringAnnotationType | undefined {
        switch (annotationName) {
            // Spring Framework annotations
            case SPRING_ANNOTATION_NAMES.COMPONENT: return SpringAnnotationType.COMPONENT;
            case SPRING_ANNOTATION_NAMES.SERVICE: return SpringAnnotationType.SERVICE;
            case SPRING_ANNOTATION_NAMES.REPOSITORY: return SpringAnnotationType.REPOSITORY;
            case SPRING_ANNOTATION_NAMES.CONTROLLER: return SpringAnnotationType.CONTROLLER;
            case SPRING_ANNOTATION_NAMES.REST_CONTROLLER: return SpringAnnotationType.REST_CONTROLLER;
            case SPRING_ANNOTATION_NAMES.CONFIGURATION: return SpringAnnotationType.CONFIGURATION;
            case SPRING_ANNOTATION_NAMES.BEAN: return SpringAnnotationType.BEAN;
            case SPRING_ANNOTATION_NAMES.AUTOWIRED: return SpringAnnotationType.AUTOWIRED;
            case SPRING_ANNOTATION_NAMES.QUALIFIER: return SpringAnnotationType.QUALIFIER;
            case SPRING_ANNOTATION_NAMES.VALUE: return SpringAnnotationType.VALUE;
            // Lombok annotations
            case SPRING_ANNOTATION_NAMES.REQUIRED_ARGS_CONSTRUCTOR: return SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR;
            case SPRING_ANNOTATION_NAMES.ALL_ARGS_CONSTRUCTOR: return SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR;
            case SPRING_ANNOTATION_NAMES.NO_ARGS_CONSTRUCTOR: return SpringAnnotationType.LOMBOK_NO_ARGS_CONSTRUCTOR;
            case SPRING_ANNOTATION_NAMES.DATA: return SpringAnnotationType.LOMBOK_DATA;
            case SPRING_ANNOTATION_NAMES.LOMBOK_VALUE: return SpringAnnotationType.LOMBOK_VALUE;
            case SPRING_ANNOTATION_NAMES.SLF4J: return SpringAnnotationType.LOMBOK_SLF4J;
            case SPRING_ANNOTATION_NAMES.NON_NULL: return SpringAnnotationType.LOMBOK_NON_NULL;
            case SPRING_ANNOTATION_NAMES.NONNULL: return SpringAnnotationType.LOMBOK_NON_NULL;  // JSR-305 javax.annotation.Nonnull
            default: return undefined;
        }
    }

    /**
     * Extracts key-value pairs from elementValuePairList.
     * 
     * @param pairList - elementValuePairList node
     * @returns Parameter map
     */
    private extractElementValuePairList(pairList: ElementValuePairListNode): Map<string, string> {
        const parameters = new Map<string, string>();
        
        try {
            if (pairList.children?.elementValuePair) {
                const pairs = pairList.children.elementValuePair;
                
                for (const pair of pairs) {
                    const key = this.extractElementKey(pair);
                    const value = this.extractElementValue(pair);
                    
                    if (key && value) {
                        parameters.set(key, value);
                    }
                }
            }
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                'Failed to extract elementValuePairList',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return parameters;
    }

    /**
     * Extracts key from elementValuePair.
     * 
     * @param pair - elementValuePair node
     * @returns Key string or undefined
     */
    private extractElementKey(pair: ElementValuePairNode): string | undefined {
        try {
            if (pair.children?.Identifier?.[0]?.image) {
                return pair.children.Identifier[0].image;
            }
        } catch (error) {
            ErrorHandler.logError(new AnnotationParsingError(
                'Failed to extract element key',
                undefined,
                error instanceof Error ? error : undefined
            ));
        }
        
        return undefined;
    }

    /**
     * Extracts value from elementValuePair.
     * 
     * @param pair - elementValuePair node
     * @returns Value string or undefined
     */
    private extractElementValue(pair: ElementValuePairNode): string | undefined {
        try {
            if (pair.children?.elementValue?.[0]) {
                const elementValue = pair.children.elementValue[0];
                
                if (elementValue.children?.conditionalExpression?.[0]?.children?.StringLiteral) {
                    const value = elementValue.children.conditionalExpression[0].children.StringLiteral[0].image;
                    return value.replace(/["']/g, '');
                }
                
                // Handle other value types for extensibility
                const literals = this.findStringLiterals(elementValue);
                if (literals.length > 0) {
                    return literals[0];
                }
            }
        } catch (error) {
            ErrorHandler.logError(new AnnotationParsingError(
                'Failed to extract element value',
                undefined,
                error instanceof Error ? error : undefined
            ));
        }
        
        return undefined;
    }

    /**
     * Recursively finds all string literals in a node.
     * 
     * @param node - Node to search
     * @returns Array of string literals
     */
    private findStringLiterals(node: CSTNode): string[] {
        const literals: string[] = [];
        
        try {
            if (node?.image && typeof node.image === 'string' && (node.image.startsWith('"') || node.image.startsWith("'"))) {
                literals.push(node.image.replace(/["']/g, ''));
            }
            
            if (node?.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            literals.push(...this.findStringLiterals(child));
                        }
                    }
                }
            }
        } catch (error) {
            ErrorHandler.logError(new AnnotationParsingError(
                'Failed to find string literals',
                undefined,
                error instanceof Error ? error : undefined
            ));
        }
        
        return literals;
    }

    /**
     * Extracts annotation name from annotation node.
     * 
     * @param annotation - Annotation node
     * @returns Annotation name or 'Unknown'
     */
    private getAnnotationName(annotation: AnnotationNode): string {
        try {
            if (annotation?.children?.typeName?.[0]?.children?.Identifier?.[0]?.image) {
                return annotation.children.typeName[0].children.Identifier[0].image;
            }
        } catch (error) {
            // Skip error logging to prevent excessive logs
        }
        
        return 'Unknown';
    }

    /**
     * Checks if annotation is of specific type.
     * 
     * @param annotation - Annotation node
     * @param targetType - Type to check
     * @returns true if annotation is of target type
     */
    public isAnnotationType(annotation: AnnotationNode, targetType: SpringAnnotationType): boolean {
        try {
            const annotationInfo = this.parseAnnotation(annotation, []);
            return annotationInfo?.type === targetType;
        } catch (error) {
            return false;
        }
    }

    /**
     * Finds annotation by type in annotation array.
     * 
     * @param annotations - Array of annotation info
     * @param targetType - Type to find
     * @returns Annotation of target type or undefined
     */
    public findAnnotationByType(annotations: AnnotationInfo[], targetType: SpringAnnotationType): AnnotationInfo | undefined {
        return annotations.find(annotation => annotation.type === targetType);
    }

    /**
     * Checks if annotation has specific parameter.
     * 
     * @param annotation - Annotation info
     * @param paramName - Parameter name
     * @returns Parameter value or undefined
     */
    public getAnnotationParameter(annotation: AnnotationInfo, paramName: string): string | undefined {
        return annotation.parameters?.get(paramName);
    }

    /**
     * Detects specific annotation in lines (for method/constructor annotation detection).
     * 
     * @param lines - Java file lines
     * @param startLineIndex - Line index to start detection
     * @param annotationType - Annotation type to find
     * @param maxLookupLines - Maximum lines to search (default: ANNOTATION_LOOKUP_MAX_LINES)
     * @returns true if annotation found
     */
    public detectAnnotationInLines(
        lines: string[], 
        startLineIndex: number, 
        annotationType: SpringAnnotationType,
        maxLookupLines: number = PARSING_CONSTANTS.ANNOTATION_LOOKUP_MAX_LINES
    ): boolean {
        try {
            // Search backwards from start line
            for (let i = startLineIndex; i >= 0 && i >= startLineIndex - maxLookupLines; i--) {
                const line = lines[i].trim();
                
                // @Autowired pattern matching using constants
                if (annotationType === SpringAnnotationType.AUTOWIRED) {
                    const autowiredPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_NAMES.AUTOWIRED}\\b`);
                    const autowiredFullPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_PACKAGES.AUTOWIRED_FULL.replace('.', '\\.')}\\b`);
                    if (autowiredPattern.test(line) || autowiredFullPattern.test(line)) {
                        return true;
                    }
                }
                
                // Lombok annotations using constants
                if (annotationType === SpringAnnotationType.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR) {
                    const requiredArgsPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_NAMES.REQUIRED_ARGS_CONSTRUCTOR}\\b`);
                    const requiredArgsFullPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_PACKAGES.LOMBOK_REQUIRED_ARGS_CONSTRUCTOR_FULL.replace('.', '\\.')}\\b`);
                    if (requiredArgsPattern.test(line) || requiredArgsFullPattern.test(line)) {
                        return true;
                    }
                }
                
                if (annotationType === SpringAnnotationType.LOMBOK_ALL_ARGS_CONSTRUCTOR) {
                    const allArgsPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_NAMES.ALL_ARGS_CONSTRUCTOR}\\b`);
                    const allArgsFullPattern = new RegExp(`^\\s*@${SPRING_ANNOTATION_PACKAGES.LOMBOK_ALL_ARGS_CONSTRUCTOR_FULL.replace('.', '\\.')}\\b`);
                    if (allArgsPattern.test(line) || allArgsFullPattern.test(line)) {
                        return true;
                    }
                }
                
                // Skip empty lines and comments
                if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                    continue;
                }
                
                // Continue checking for other annotations
                if (line.startsWith('@')) {
                    continue;
                }
                
                // Stop when actual code is found
                if (line && (line.includes('{') || line.includes('}') || line.includes(';') || 
                           line.includes('public ') || line.includes('private ') || line.includes('protected '))) {
                    break;
                }
            }
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                'Failed to detect annotation in lines',
                annotationType.toString(),
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return false;
    }

    /**
     * Extracts all method annotations from lines.
     * 
     * @param lines - Java file lines
     * @param methodLineIndex - Method line index
     * @param maxLookupLines - Maximum lines to search (default: ANNOTATION_LOOKUP_MAX_LINES)
     * @returns Array of extracted annotation info
     */
    public extractMethodAnnotationsFromLines(
        lines: string[], 
        methodLineIndex: number,
        maxLookupLines: number = PARSING_CONSTANTS.ANNOTATION_LOOKUP_MAX_LINES
    ): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            for (let i = methodLineIndex - 1; i >= 0 && i >= methodLineIndex - maxLookupLines; i--) {
                const line = lines[i].trim();
                
                if (line.startsWith('@')) {
                    const annotationMatch = line.match(/@(\w+)/);
                    if (annotationMatch) {
                        const annotationName = annotationMatch[1];
                        
                        const annotationType = this.mapToSpringAnnotationType(annotationName);
                        if (annotationType) {
                            annotations.push({
                                name: annotationName,
                                type: annotationType,
                                line: i,
                                column: 0,
                                parameters: new Map() // Skip parameter extraction in line parsing
                            });
                        }
                    }
                }
                
                // Stop when actual code is found (not annotation or comment)
                if (line && !line.startsWith('@') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && line !== '') {
                    break;
                }
            }
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                'Failed to extract method annotations',
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
        }
        
        return annotations;
    }
}  