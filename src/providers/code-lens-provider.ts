import * as vscode from 'vscode';
import { BeanResolver } from '../utils/bean-resolver';
import { SpringBeanDetector } from '../detectors/spring-bean-detector';
import { JavaFileParser } from '../parsers/java-file-parser';
import { InjectionInfo, BeanDefinition } from '../models/spring-types';

/**
 * Spring @Autowired 필드에 CodeLens를 제공하는 클래스
 */
export class SpringCodeLensProvider implements vscode.CodeLensProvider {
    private javaParser: JavaFileParser;
    
    constructor(
        private beanResolver: BeanResolver,
        private beanDetector: SpringBeanDetector
    ) {
        this.javaParser = new JavaFileParser();
    }

    /**
     * 문서에서 CodeLens를 제공합니다.
     * 
     * @param document - 분석할 문서
     * @param token - 취소 토큰
     * @returns CodeLens 배열
     */
    public async provideCodeLenses(
        document: vscode.TextDocument, 
        token?: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        // Java 파일이 아니면 빈 배열 반환
        if (!this.isJavaFile(document)) {
            return [];
        }
        const codeLenses: vscode.CodeLens[] = [];

        try {
            // Java 파일 파싱하여 @Autowired 필드 찾기
            const content = document.getText();
            console.log('📄 Java 파일 내용 길이:', content.length);
            
            const parseResult = await this.javaParser.parseJavaFile(document.uri, content);
            console.log('🔍 파싱 결과:', {
                errors: parseResult.errors.length,
                classes: parseResult.classes.length,
                injections: parseResult.injections.length
            });
            
            if (parseResult.errors.length > 0) {
                console.log('❌ 파싱 에러:', parseResult.errors);
                return [];
            }

            // 각 주입 정보에 대해 CodeLens 생성
            console.log('🎯 주입 정보들:', parseResult.injections);
            for (const injection of parseResult.injections) {
                console.log('🔧 CodeLens 생성 중:', {
                    targetType: injection.targetType,
                    targetName: injection.targetName,
                    position: {
                        line: injection.position.line,
                        character: injection.position.character
                    },
                    range: {
                        start: {
                            line: injection.range.start.line,
                            character: injection.range.start.character
                        },
                        end: {
                            line: injection.range.end.line,
                            character: injection.range.end.character
                        }
                    }
                });
                
                const codeLens = await this.createCodeLensForInjection(injection, document);
                if (codeLens) {
                    console.log('✅ CodeLens 생성됨:', {
                        range: {
                            start: {
                                line: codeLens.range.start.line,
                                character: codeLens.range.start.character
                            },
                            end: {
                                line: codeLens.range.end.line,
                                character: codeLens.range.end.character
                            }
                        },
                        command: codeLens.command?.title
                    });
                    codeLenses.push(codeLens);
                } else {
                    console.log('❌ CodeLens 생성 실패');
                }
            }

        } catch (error) {
            console.error('❌ CodeLens 제공 중 오류 발생:', error);
            // 에러 발생 시 빈 배열 반환
            return [];
        }

        console.log(`🎉 총 ${codeLenses.length}개 CodeLens 반환`);
        return codeLenses;
    }

    /**
     * CodeLens를 해결하여 명령어를 추가합니다.
     * 
     * @param codeLens - 해결할 CodeLens
     * @param token - 취소 토큰
     * @returns 해결된 CodeLens
     */
    public async resolveCodeLens(
        codeLens: vscode.CodeLens, 
        token?: vscode.CancellationToken
    ): Promise<vscode.CodeLens> {
        // 기본 구현에서는 이미 명령어가 설정되어 있음
        // 추가적인 해결 로직이 필요하면 여기에 구현
        return codeLens;
    }

    /**
     * 주입 정보를 기반으로 CodeLens를 생성합니다.
     * 
     * @param injection - 주입 정보
     * @param document - 문서
     * @returns 생성된 CodeLens 또는 undefined
     */
    private async createCodeLensForInjection(
        injection: InjectionInfo, 
        document: vscode.TextDocument
    ): Promise<vscode.CodeLens | undefined> {
        // Bean 해결 시도
        const resolutionResult = this.beanResolver.resolveBeanForInjection(injection.targetType);
        
        let title: string;
        let command: string;
        let args: any[] = [];

        if (resolutionResult.resolved) {
            // 단일 Bean이 해결된 경우
            const beanName = this.getBeanDisplayName(resolutionResult.resolved.type);
            title = `→ Go to Bean: ${beanName}`;
            command = 'spring-bean-navigator.goToBean';
            args = [resolutionResult.resolved];
            
        } else if (resolutionResult.candidates.length > 1) {
            // 다중 후보가 있는 경우
            title = `→ Multiple candidates (${resolutionResult.candidates.length})`;
            command = 'spring-bean-navigator.selectBean';
            args = [resolutionResult.candidates];
            
        } else {
            // Bean을 찾을 수 없는 경우
            title = `→ Bean not found: ${injection.targetType}`;
            command = 'spring-bean-navigator.beanNotFound';
            args = [injection.targetType];
        }

        return new vscode.CodeLens(injection.range, {
            title,
            command,
            arguments: args
        });
    }

    /**
     * 문서가 Java 파일인지 확인합니다.
     * 
     * @param document - 확인할 문서
     * @returns Java 파일 여부
     */
    public isJavaFile(document: vscode.TextDocument): boolean {
        return document.languageId === 'java';
    }

    /**
     * Bean의 표시 이름을 생성합니다.
     * 
     * @param beanType - Bean 타입 (전체 클래스명 또는 단순 클래스명)
     * @returns 표시할 Bean 이름
     */
    public getBeanDisplayName(beanType: string): string {
        // 패키지명이 포함된 경우 클래스명만 추출
        const lastDotIndex = beanType.lastIndexOf('.');
        if (lastDotIndex >= 0) {
            return beanType.substring(lastDotIndex + 1);
        }
        return beanType;
    }

    /**
     * BeanResolver에 Bean 정의들을 업데이트합니다.
     * 
     * @param workspaceFolder - 워크스페이스 폴더
     */
    public async updateBeanDefinitions(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
        try {
            // 워크스페이스에서 Java 파일들 찾기
            const javaFiles = await vscode.workspace.findFiles(
                new vscode.RelativePattern(workspaceFolder, '**/*.java'),
                '**/node_modules/**'
            );

            // 기존 캐시 클리어
            this.beanResolver.clearCache();

            // 각 Java 파일에서 Bean 정의 추출
            for (const fileUri of javaFiles) {
                try {
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    const content = document.getText();
                    
                    // Spring Bean 탐지
                    const beans = await this.beanDetector.detectBeansInContent(content, fileUri);
                    
                    // BeanResolver에 추가
                    for (const bean of beans) {
                        this.beanResolver.addBeanDefinition(bean);
                    }
                } catch (fileError) {
                    console.warn(`파일 처리 실패: ${fileUri.fsPath}`, fileError);
                    // 개별 파일 실패는 무시하고 계속 진행
                }
            }

            console.log(`Bean 정의 업데이트 완료: ${this.beanResolver.getBeanCount()}개 Bean 발견`);
            
        } catch (error) {
            console.error('Bean 정의 업데이트 실패:', error);
        }
    }

    /**
     * 특정 파일의 Bean 정의를 업데이트합니다.
     * 
     * @param document - 업데이트할 문서
     */
    public async updateFileBean(document: vscode.TextDocument): Promise<void> {
        if (!this.isJavaFile(document)) {
            return;
        }

        try {
            const content = document.getText();
            const beans = await this.beanDetector.detectBeansInContent(content, document.uri);
            
            // 해당 파일의 기존 Bean들을 제거하고 새로 추가
            // (현재 구현에서는 단순히 덮어쓰기)
            for (const bean of beans) {
                this.beanResolver.addBeanDefinition(bean);
            }
            
        } catch (error) {
            console.warn(`파일 Bean 업데이트 실패: ${document.uri.fsPath}`, error);
        }
    }
} 