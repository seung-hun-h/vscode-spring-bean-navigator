/**
 * Base error class for Java parsing operations
 */
export class JavaParsingError extends Error {
    constructor(
        message: string, 
        public readonly cause?: Error,
        public readonly context?: string
    ) {
        super(message);
        this.name = 'JavaParsingError';
        
        if (cause && 'stack' in cause) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }
}

/**
 * CST (Concrete Syntax Tree) parsing error
 */
export class CSTParsingError extends JavaParsingError {
    constructor(
        message: string,
        public readonly fileName?: string,
        public readonly line?: number,
        public readonly column?: number,
        cause?: Error
    ) {
        super(message, cause, 'CST parsing');
        this.name = 'CSTParsingError';
    }
}

/**
 * Annotation parsing error
 */
export class AnnotationParsingError extends JavaParsingError {
    constructor(
        message: string,
        public readonly annotationName?: string,
        cause?: Error
    ) {
        super(message, cause, 'annotation parsing');
        this.name = 'AnnotationParsingError';
    }
}

/**
 * Field extraction error
 */
export class FieldExtractionError extends JavaParsingError {
    constructor(
        message: string,
        public readonly fieldName?: string,
        public readonly className?: string,
        cause?: Error
    ) {
        super(message, cause, 'field extraction');
        this.name = 'FieldExtractionError';
    }
}

/**
 * Class extraction error
 */
export class ClassExtractionError extends JavaParsingError {
    constructor(
        message: string,
        public readonly className?: string,
        cause?: Error
    ) {
        super(message, cause, 'class extraction');
        this.name = 'ClassExtractionError';
    }
}

/**
 * Position calculation error
 */
export class PositionCalculationError extends JavaParsingError {
    constructor(
        message: string,
        public readonly nodeName?: string,
        cause?: Error
    ) {
        super(message, cause, 'position calculation');
        this.name = 'PositionCalculationError';
    }
}

/**
 * Error handling utility class
 */
export class ErrorHandler {
    /**
     * Converts parsing errors to appropriate types
     * 
     * @param error - Original error
     * @param context - Error context
     * @returns Appropriate JavaParsingError type
     */
    static handleParsingError(error: unknown, context: string): JavaParsingError {
        if (error instanceof JavaParsingError) {
            return error;
        }
        
        if (error instanceof Error) {
            if (error.message.includes('parsing errors detected')) {
                return new CSTParsingError(
                    `CST parsing failed: ${error.message}`,
                    undefined,
                    this.extractLineNumber(error.message),
                    this.extractColumnNumber(error.message),
                    error
                );
            }
            
            if (error.message.includes('Cannot read properties')) {
                return new CSTParsingError(
                    `Tokenization failed: ${error.message}`,
                    undefined,
                    undefined,
                    undefined,
                    error
                );
            }
            
            return new JavaParsingError(`Error during ${context}: ${error.message}`, error, context);
        }
        
        return new JavaParsingError(`Unknown error during ${context}`, undefined, context);
    }

    /**
     * Logs errors safely
     * 
     * @param error - Error to log
     * @param additionalInfo - Additional information
     */
    static logError(error: JavaParsingError, additionalInfo?: Record<string, any>): void {
        const errorInfo = {
            type: error.name,
            message: error.message,
            context: error.context,
            cause: error.cause?.message,
            ...additionalInfo
        };
        
        console.error(`❌ ${error.name}:`, errorInfo);
        
        if (process.env.NODE_ENV === 'development' && error.stack) {
            console.debug('Stack trace:', error.stack);
        }
    }

    /**
     * Extracts line number from error message
     * 
     * @param message - Error message
     * @returns Line number or undefined
     */
    private static extractLineNumber(message: string): number | undefined {
        const lineMatch = message.match(/line:\s*(\d+)/);
        return lineMatch ? parseInt(lineMatch[1], 10) : undefined;
    }

    /**
     * Extracts column number from error message
     * 
     * @param message - Error message
     * @returns Column number or undefined
     */
    private static extractColumnNumber(message: string): number | undefined {
        const columnMatch = message.match(/column:\s*(\d+)/);
        return columnMatch ? parseInt(columnMatch[1], 10) : undefined;
    }

    /**
     * Creates user-friendly error messages
     * 
     * @param error - JavaParsingError instance
     * @returns User-friendly message
     */
    static createUserFriendlyMessage(error: JavaParsingError): string {
        if (error instanceof CSTParsingError) {
            if (error.line && error.column) {
                return `Java file parsing failed (line ${error.line}, column ${error.column}): Please check for syntax errors.`;
            }
            return 'Java file parsing failed. Please check the file syntax.';
        }
        
        if (error instanceof AnnotationParsingError) {
            return `Failed to parse @${error.annotationName || 'Unknown'} annotation.`;
        }
        
        if (error instanceof FieldExtractionError) {
            return `Failed to extract field '${error.fieldName || 'Unknown'}'.`;
        }
        
        if (error instanceof ClassExtractionError) {
            return `Failed to extract class '${error.className || 'Unknown'}'.`;
        }
        
        return error.message || 'An error occurred while processing the Java file.';
    }
} 