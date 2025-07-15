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
    
    // 현재 파일의 패키지명
    private currentPackageName: string | undefined;

    constructor(private fileUri: vscode.Uri) {
        // validateVisitor는 프로토타입 설정 후에 호출됨
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
        return BaseJavaCstVisitorWithDefaults.prototype.visit.call(this, cst);
    }

    /**
     * 패키지 선언을 방문합니다.
     */
    packageDeclaration(ctx: any) {
        // 패키지명 추출
        const identifiers = ctx.Identifier;
        if (identifiers) {
            this.currentPackageName = identifiers.map((id: any) => id.image).join('.');
        }
    }

    /**
     * 클래스 선언을 방문합니다.
     */
    classDeclaration(ctx: any) {
        // normalClassDeclaration이 없으면 리턴
        if (!ctx.normalClassDeclaration || ctx.normalClassDeclaration.length === 0) {
            return;
        }
        
        const normalClass = ctx.normalClassDeclaration[0];
        
        // 클래스 이름 추출
        const className = normalClass.children.typeIdentifier[0].children.Identifier[0].image;
        
        // 어노테이션 추출
        const annotations: any[] = [];
        if (ctx.classModifier) {
            ctx.classModifier.forEach((modifier: any) => {
                if (modifier.children.annotation) {
                    modifier.children.annotation.forEach((annotation: any) => {
                        const annotationName = annotation.children.typeName[0].children.Identifier[0].image;
                        annotations.push({
                            name: annotationName
                        });
                    });
                }
            });
        }
        
        const classInfo: ClassInfo = {
            name: className,
            packageName: this.currentPackageName,
            fullyQualifiedName: this.currentPackageName ? `${this.currentPackageName}.${className}` : className,
            annotations: annotations,
            fields: [],
            methods: [],
            constructors: [],
            imports: [],
            position: new vscode.Position(0, 0),
            range: new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(0, 0)
            ),
            fileUri: this.fileUri
        };
        
        this.classes.push(classInfo);
    }
}

// SpringInfoCollector를 BaseJavaCstVisitorWithDefaults의 프로토타입과 연결
export async function createSpringInfoCollector(fileUri: vscode.Uri): Promise<SpringInfoCollector> {
    await SpringInfoCollector.initialize();
    
    const collector = new SpringInfoCollector(fileUri);
    
    // 프로토타입 체인 설정
    Object.setPrototypeOf(collector, BaseJavaCstVisitorWithDefaults.prototype);
    
    // SpringInfoCollector의 메서드들을 collector에 바인딩
    collector.packageDeclaration = SpringInfoCollector.prototype.packageDeclaration.bind(collector);
    collector.classDeclaration = SpringInfoCollector.prototype.classDeclaration.bind(collector);
    
    // validateVisitor 호출 (npm 문서 예시 참고)
    if (typeof (collector as any).validateVisitor === 'function') {
        (collector as any).validateVisitor();
    }
    
    return collector;
} 