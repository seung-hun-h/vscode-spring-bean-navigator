import { ErrorHandler, CSTParsingError } from './parser-errors';

/**
 * CST(Concrete Syntax Tree) 탐색을 담당하는 클래스
 */
export class CSTNavigator {
    
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
            // 일반적인 import 구조 처리
            if (importDecl.children?.packageOrTypeName?.[0]?.children?.Identifier) {
                const identifiers = importDecl.children.packageOrTypeName[0].children.Identifier;
                let importName = identifiers.map((id: any) => id.image).join('.');
                
                // wildcard import 처리 (import lombok.*;)
                if (importDecl.children?.Star) {
                    importName += '.*';
                }
                
                return importName;
            }
            
            // 대안적인 구조 처리 (경우에 따라 다른 구조일 수 있음)
            // import 문 전체에서 식별자와 * 기호를 찾기
            const allTokens = this.extractAllTokensFromImport(importDecl);
            if (allTokens.length > 0) {
                let importName = '';
                for (let i = 0; i < allTokens.length; i++) {
                    const token = allTokens[i];
                    if (token === '*') {
                        importName += '.*';
                    } else if (token === '.') {
                        if (i < allTokens.length - 1 && allTokens[i + 1] === '*') {
                            // . 다음에 *가 오면 .만 추가하고 다음 루프에서 *를 처리
                            importName += '.';
                        } else {
                            importName += '.';
                        }
                    } else if (token !== 'import' && token !== ';') {
                        // import 키워드와 세미콜론은 제외
                        if (importName && !importName.endsWith('.')) {
                            importName += '.';
                        }
                        importName += token;
                    }
                }
                
                if (importName) {
                    return importName;
                }
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

    /**
     * import 노드에서 모든 토큰들을 추출합니다.
     * 
     * @param importDecl - 임포트 선언 노드
     * @returns 추출된 토큰 배열
     */
    private extractAllTokensFromImport(importDecl: any): string[] {
        const tokens: string[] = [];
        
        try {
            this.collectTokensRecursively(importDecl, tokens);
        } catch (error) {
            const cstError = new CSTParsingError(
                '토큰 재귀 수집 실패',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
        
        return tokens;
    }

    /**
     * CST 노드에서 재귀적으로 모든 토큰을 수집합니다.
     * 
     * @param node - 탐색할 노드
     * @param tokens - 수집된 토큰을 저장할 배열
     */
    private collectTokensRecursively(node: any, tokens: string[]): void {
        if (!node) {
            return;
        }
        
        try {
            // 노드가 토큰(image 속성이 있는 리프 노드)인 경우
            if (node.image && typeof node.image === 'string') {
                tokens.push(node.image);
                return;
            }
            
            // 자식 노드들을 재귀적으로 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            this.collectTokensRecursively(child, tokens);
                        }
                    }
                }
            }
        } catch (error) {
            const cstError = new CSTParsingError(
                '토큰 재귀 수집 실패',
                undefined,
                undefined,
                undefined,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(cstError);
        }
    }
} 