import { AnnotationInfo } from '../../models/spring-types';

/**
 * Utility class for classifying Java methods based on their signatures and patterns.
 * Helps identify special method types like setters, getters, and Bean methods.
 */
export class MethodClassifyUtils {
    
    private static readonly SETTER_PREFIX = 'set';
    private static readonly SETTER_PREFIX_LENGTH = 3;
    
    /**
     * Determines if a method is a setter based on naming pattern and parameter count.
     * 
     * @param methodName - Name of the method
     * @param parameterCount - Number of parameters
     * @returns True if method follows setter pattern
     */
    static isSetterMethod(methodName: string, parameterCount: number): boolean {
        // Setter pattern: starts with 'set' followed by uppercase letter
        if (!methodName.startsWith(this.SETTER_PREFIX) || methodName.length <= this.SETTER_PREFIX_LENGTH) {
            return false;
        }
        
        // Check if the character after 'set' is uppercase
        const fourthChar = methodName.charAt(this.SETTER_PREFIX_LENGTH);
        const isUppercase = fourthChar === fourthChar.toUpperCase() && fourthChar !== fourthChar.toLowerCase();
        
        return isUppercase && parameterCount > 0;
    }
    
    /**
     * Determines if a method is a Bean method based on its annotations.
     * 
     * @param annotations - Method annotations
     * @returns True if method has @Bean annotation
     */
    static isBeanMethod(annotations: AnnotationInfo[]): boolean {
        return annotations.some(annotation => annotation.name === 'Bean');
    }
} 