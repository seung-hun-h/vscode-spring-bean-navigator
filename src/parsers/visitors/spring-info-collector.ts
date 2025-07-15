import * as vscode from 'vscode';

// java-parser의 타입을 위한 인터페이스
let BaseJavaCstVisitorWithDefaults: any;

/**
 * Spring 정보를 수집하는 Visitor 클래스
 * java-parser의 CST를 순회하며 Spring 관련 정보를 추출합니다.
 */
export class SpringInfoCollector {
    private static isInitialized = false;

    constructor(private fileUri: vscode.Uri) {
    }

    /**
     * java-parser 모듈을 동적으로 로드합니다.
     */
    static async initialize() {
        if (!this.isInitialized) {
            const javaParser = await import('java-parser');
            BaseJavaCstVisitorWithDefaults = javaParser.BaseJavaCstVisitorWithDefaults;
            this.isInitialized = true;
        }
    }
}

// SpringInfoCollector를 BaseJavaCstVisitorWithDefaults의 프로토타입과 연결
export async function createSpringInfoCollector(fileUri: vscode.Uri): Promise<SpringInfoCollector> {
    await SpringInfoCollector.initialize();
    
    // 프로토타입 체인 설정
    Object.setPrototypeOf(SpringInfoCollector.prototype, BaseJavaCstVisitorWithDefaults.prototype);
    
    const collector = new SpringInfoCollector(fileUri);
    
    // validateVisitor 메서드 호출 (BaseJavaCstVisitorWithDefaults 요구사항)
    if (typeof (collector as any).validateVisitor === 'function') {
        (collector as any).validateVisitor();
    }
    
    return collector;
} 