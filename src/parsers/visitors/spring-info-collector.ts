import * as vscode from 'vscode';
import { ClassInfo } from '../../models/spring-types';

// java-parser의 타입을 위한 인터페이스
let BaseJavaCstVisitorWithDefaults: any;

/**
 * Spring 정보를 수집하는 Visitor 클래스
 * java-parser의 CST를 순회하며 Spring 관련 정보를 추출합니다.
 */
export class SpringInfoCollector {
    private static isInitialized = false;
    
    // 수집된 클래스 정보
    public classes: ClassInfo[] = [];

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

    /**
     * CST를 방문합니다.
     */
    visit(cst: any): any {
        // BaseJavaCstVisitorWithDefaults의 visit 메서드 호출
        return (BaseJavaCstVisitorWithDefaults.prototype.visit as any).call(this, cst);
    }

    /**
     * 클래스 선언을 방문합니다.
     */
    classDeclaration(ctx: any): void { 
        // 클래스 이름 추출
        if (ctx.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image) {
            const className = ctx.normalClassDeclaration[0].children.typeIdentifier[0].children.Identifier[0].image;
            
            this.classes.push({
                name: className,
                packageName: undefined,
                fullyQualifiedName: className,
                fileUri: this.fileUri,
                position: new vscode.Position(0, 0),
                range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
                annotations: [],
                fields: [],
                imports: []
            });
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