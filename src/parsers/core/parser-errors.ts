/**
 * Java 파싱 관련 에러들을 정의하는 모듈
 */

/**
 * Java 파싱 과정에서 발생하는 기본 에러 클래스
 */
export class JavaParsingError extends Error {
    constructor(
        message: string, 
        public readonly cause?: Error,
        public readonly context?: string
    ) {
        super(message);
        this.name = 'JavaParsingError';
        
        // Error 체인 설정
        if (cause && 'stack' in cause) {
            this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
        }
    }
}

/**
 * CST(Concrete Syntax Tree) 파싱 실패 에러
 */
export class CSTParsingError extends JavaParsingError {
    constructor(
        message: string,
        public readonly fileName?: string,
        public readonly line?: number,
        public readonly column?: number,
        cause?: Error
    ) {
        super(message, cause, 'CST 파싱');
        this.name = 'CSTParsingError';
    }
}

/**
 * 어노테이션 파싱 실패 에러
 */
export class AnnotationParsingError extends JavaParsingError {
    constructor(
        message: string,
        public readonly annotationName?: string,
        cause?: Error
    ) {
        super(message, cause, '어노테이션 파싱');
        this.name = 'AnnotationParsingError';
    }
}

/**
 * 필드 추출 실패 에러
 */
export class FieldExtractionError extends JavaParsingError {
    constructor(
        message: string,
        public readonly fieldName?: string,
        public readonly className?: string,
        cause?: Error
    ) {
        super(message, cause, '필드 추출');
        this.name = 'FieldExtractionError';
    }
}

/**
 * 클래스 추출 실패 에러
 */
export class ClassExtractionError extends JavaParsingError {
    constructor(
        message: string,
        public readonly className?: string,
        cause?: Error
    ) {
        super(message, cause, '클래스 추출');
        this.name = 'ClassExtractionError';
    }
}

/**
 * 위치 계산 실패 에러
 */
export class PositionCalculationError extends JavaParsingError {
    constructor(
        message: string,
        public readonly nodeName?: string,
        cause?: Error
    ) {
        super(message, cause, '위치 계산');
        this.name = 'PositionCalculationError';
    }
}

/**
 * 에러 처리를 위한 유틸리티 클래스
 */
export class ErrorHandler {
    /**
     * 파싱 에러를 적절한 타입으로 변환합니다.
     * 
     * @param error - 원본 에러
     * @param context - 에러 발생 컨텍스트
     * @returns 적절한 타입의 JavaParsingError
     */
    static handleParsingError(error: unknown, context: string): JavaParsingError {
        if (error instanceof JavaParsingError) {
            return error;
        }
        
        if (error instanceof Error) {
            // java-parser 라이브러리의 에러 메시지 패턴 확인
            if (error.message.includes('parsing errors detected')) {
                return new CSTParsingError(
                    `CST 파싱 실패: ${error.message}`,
                    undefined,
                    this.extractLineNumber(error.message),
                    this.extractColumnNumber(error.message),
                    error
                );
            }
            
            // chevrotain lexer 에러 패턴 확인
            if (error.message.includes('Cannot read properties')) {
                return new CSTParsingError(
                    `토큰화 실패: ${error.message}`,
                    undefined,
                    undefined,
                    undefined,
                    error
                );
            }
            
            return new JavaParsingError(`${context} 중 오류 발생: ${error.message}`, error, context);
        }
        
        return new JavaParsingError(`${context} 중 알 수 없는 오류 발생`, undefined, context);
    }

    /**
     * 안전한 방식으로 에러를 로깅합니다.
     * 
     * @param error - 로깅할 에러
     * @param additionalInfo - 추가 정보
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
        
        // 스택 트레이스는 디버그 모드에서만 출력
        if (process.env.NODE_ENV === 'development' && error.stack) {
            console.debug('스택 트레이스:', error.stack);
        }
    }

    /**
     * 에러 메시지에서 라인 번호를 추출합니다.
     * 
     * @param message - 에러 메시지
     * @returns 라인 번호 또는 undefined
     */
    private static extractLineNumber(message: string): number | undefined {
        const lineMatch = message.match(/line:\s*(\d+)/);
        return lineMatch ? parseInt(lineMatch[1], 10) : undefined;
    }

    /**
     * 에러 메시지에서 컬럼 번호를 추출합니다.
     * 
     * @param message - 에러 메시지
     * @returns 컬럼 번호 또는 undefined
     */
    private static extractColumnNumber(message: string): number | undefined {
        const columnMatch = message.match(/column:\s*(\d+)/);
        return columnMatch ? parseInt(columnMatch[1], 10) : undefined;
    }

    /**
     * 사용자 친화적인 에러 메시지를 생성합니다.
     * 
     * @param error - JavaParsingError 인스턴스
     * @returns 사용자 친화적인 메시지
     */
    static createUserFriendlyMessage(error: JavaParsingError): string {
        if (error instanceof CSTParsingError) {
            if (error.line && error.column) {
                return `Java 파일 파싱 실패 (라인 ${error.line}, 컬럼 ${error.column}): 문법 오류가 있는지 확인해주세요.`;
            }
            return 'Java 파일 파싱에 실패했습니다. 파일 문법을 확인해주세요.';
        }
        
        if (error instanceof AnnotationParsingError) {
            return `@${error.annotationName || 'Unknown'} 어노테이션 파싱에 실패했습니다.`;
        }
        
        if (error instanceof FieldExtractionError) {
            return `필드 '${error.fieldName || 'Unknown'}' 추출에 실패했습니다.`;
        }
        
        if (error instanceof ClassExtractionError) {
            return `클래스 '${error.className || 'Unknown'}' 추출에 실패했습니다.`;
        }
        
        return error.message || 'Java 파일 처리 중 오류가 발생했습니다.';
    }
} 