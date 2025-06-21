import { ICSTNavigator } from '../interfaces/parser-interfaces';
import { ErrorHandler, CSTParsingError } from './parser-errors';

/**
 * CST(Concrete Syntax Tree) 탐색을 담당하는 클래스
 */
export class CSTNavigator implements ICSTNavigator {
    
    /**
     * CST에서 패키지 이름을 추출합니다.
     * 
     * @param cst - CST 루트 노드
     * @returns 패키지 이름 또는 undefined
     */
    public extractPackageName(cst: any): string | undefined {
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            if (ordinaryCompUnit?.children?.packageDeclaration) {
                const packageDecl = ordinaryCompUnit.children.packageDeclaration[0];
                if (packageDecl.children?.Identifier) {
                    // 실제 구조: packageDeclaration.children = ['Package', 'Identifier', 'Dot', 'Semicolon']
                    const identifiers = packageDecl.children.Identifier;
                    return identifiers.map((id: any) => id.image).join('.');
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                '패키지 이름 추출 실패',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        return undefined;
    }

    /**
     * CST에서 임포트 문들을 추출합니다.
     * 
     * @param cst - CST 루트 노드
     * @returns 임포트 문 배열
     */
    public extractImports(cst: any): string[] {
        const imports: string[] = [];
        
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            const importDeclarations = ordinaryCompUnit?.children?.importDeclaration;
            
            if (importDeclarations) {
                for (const importDecl of importDeclarations) {
                    const importName = this.extractImportName(importDecl);
                    if (importName) {
                        imports.push(importName);
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                '임포트 문 추출 실패',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return imports;
    }

    /**
     * CST에서 클래스 선언들을 찾습니다.
     * 
     * @param cst - CST 루트 노드
     * @returns 클래스 선언 노드 배열
     */
    public findClassDeclarations(cst: any): any[] {
        const classDeclarations: any[] = [];
        
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            const typeDeclarations = ordinaryCompUnit?.children?.typeDeclaration;
            
            if (typeDeclarations) {
                for (const typeDecl of typeDeclarations) {
                    if (typeDecl.children?.classDeclaration) {
                        classDeclarations.push(typeDecl.children.classDeclaration[0]);
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                '클래스 선언 찾기 실패',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return classDeclarations;
    }

    /**
     * 개별 임포트 이름을 추출합니다.
     * 
     * @param importDecl - 임포트 선언 노드
     * @returns 임포트 이름 또는 undefined
     */
    private extractImportName(importDecl: any): string | undefined {
        try {
            if (importDecl.children?.packageOrTypeName?.[0]?.children?.Identifier) {
                const identifiers = importDecl.children.packageOrTypeName[0].children.Identifier;
                return identifiers.map((id: any) => id.image).join('.');
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                '임포트 이름 추출 실패',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        return undefined;
    }
} 