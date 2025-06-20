import * as vscode from 'vscode';
import { BeanDefinition, BeanQuickPickItem, BeanDisplayInfo, SpringAnnotationType } from '../models/spring-types';

/**
 * Spring Bean 네비게이션을 담당하는 클래스
 * 
 * CodeLens 클릭 시 Bean 구현체로 이동하거나 다중 후보 선택 UI를 제공합니다.
 */
export class SpringNavigationProvider {

    /**
     * Bean 정의 파일로 이동합니다.
     * 
     * @param bean - 이동할 Bean 정의
     */
    public async goToBean(bean: BeanDefinition): Promise<void> {
        try {
            // Bean 파일 열기
            const document = await vscode.workspace.openTextDocument(bean.fileUri);
            
            // Bean 위치로 이동하며 파일 표시
            const selection = new vscode.Range(bean.position, bean.position);
            await vscode.window.showTextDocument(document, {
                selection,
                viewColumn: vscode.ViewColumn.Active
            });

        } catch (error) {
            console.error('Bean 파일 열기 실패:', error);
            
            const errorMessage = `Bean 파일을 열 수 없습니다: ${this.getBeanDisplayInfo(bean.implementationClass).className}`;
            await vscode.window.showErrorMessage(errorMessage);
        }
    }

    /**
     * 다중 Bean 후보 중에서 사용자가 선택할 수 있도록 QuickPick을 표시합니다.
     * 
     * @param candidates - Bean 후보들
     */
    public async selectBean(candidates: BeanDefinition[]): Promise<void> {
        if (candidates.length === 0) {
            return;
        }

        // QuickPick 아이템 생성
        const items: BeanQuickPickItem[] = candidates.map(bean => this.createQuickPickItem(bean));

        // QuickPick 표시
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `${candidates.length}개의 Bean 후보 중 선택하세요`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        // 사용자가 선택한 Bean으로 이동
        if (selected) {
            await this.goToBean(selected.bean);
        }
    }

    /**
     * Bean을 찾을 수 없다는 정보 메시지를 표시합니다.
     * 
     * @param beanType - 찾을 수 없는 Bean 타입
     */
    public async showBeanNotFound(beanType: string): Promise<void> {
        const message = `Bean을 찾을 수 없습니다: ${beanType}`;
        await vscode.window.showInformationMessage(message);
    }

    /**
     * Bean 정의를 QuickPick 아이템으로 변환합니다.
     * 
     * @param bean - Bean 정의
     * @returns QuickPick 아이템
     */
    public createQuickPickItem(bean: BeanDefinition): BeanQuickPickItem {
        const displayInfo = this.getBeanDisplayInfo(bean.implementationClass);
        
        return {
            label: `$(symbol-class) ${displayInfo.className}`,
            description: `Bean: ${bean.name}`,
            detail: displayInfo.packageName || '(default package)',
            bean: bean
        };
    }

    /**
     * 전체 클래스명에서 표시 정보를 추출합니다.
     * 
     * @param fullyQualifiedName - 전체 클래스명
     * @returns Bean 표시 정보
     */
    public getBeanDisplayInfo(fullyQualifiedName: string): BeanDisplayInfo {
        const lastDotIndex = fullyQualifiedName.lastIndexOf('.');
        
        if (lastDotIndex >= 0) {
            return {
                className: fullyQualifiedName.substring(lastDotIndex + 1),
                packageName: fullyQualifiedName.substring(0, lastDotIndex)
            };
        } else {
            return {
                className: fullyQualifiedName,
                packageName: ''
            };
        }
    }

    /**
     * 명령어 핸들러들을 등록합니다.
     * 
     * @param context - Extension context
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Bean으로 이동 명령어
        const goToBeanCommand = vscode.commands.registerCommand(
            'spring-bean-navigator.goToBean',
            async (bean: BeanDefinition) => {
                await this.goToBean(bean);
            }
        );

        // Bean 선택 명령어
        const selectBeanCommand = vscode.commands.registerCommand(
            'spring-bean-navigator.selectBean',
            async (candidates: BeanDefinition[]) => {
                await this.selectBean(candidates);
            }
        );

        // Bean을 찾을 수 없음 명령어
        const beanNotFoundCommand = vscode.commands.registerCommand(
            'spring-bean-navigator.beanNotFound',
            async (beanType: string) => {
                await this.showBeanNotFound(beanType);
            }
        );

        // Context에 명령어 등록
        context.subscriptions.push(goToBeanCommand);
        context.subscriptions.push(selectBeanCommand);
        context.subscriptions.push(beanNotFoundCommand);
    }

    /**
     * Bean 정의에서 파일 경로를 추출합니다.
     * 
     * @param bean - Bean 정의
     * @returns 파일 경로 문자열
     */
    private getFilePath(bean: BeanDefinition): string {
        return bean.fileUri.fsPath;
    }

    /**
     * Bean의 위치 정보를 포맷합니다.
     * 
     * @param bean - Bean 정의
     * @returns 위치 정보 문자열
     */
    private formatBeanLocation(bean: BeanDefinition): string {
        const fileName = this.getFilePath(bean).split('/').pop() || 'Unknown';
        return `${fileName}:${bean.position.line + 1}:${bean.position.character + 1}`;
    }

    /**
     * Bean의 어노테이션 타입을 표시용 문자열로 변환합니다.
     * 
     * @param bean - Bean 정의
     * @returns 어노테이션 타입 문자열
     */
    private getAnnotationDisplayName(bean: BeanDefinition): string {
        switch (bean.annotation) {
            case SpringAnnotationType.SERVICE: return '@Service';
            case SpringAnnotationType.COMPONENT: return '@Component';
            case SpringAnnotationType.REPOSITORY: return '@Repository';
            case SpringAnnotationType.CONTROLLER: return '@Controller';
            case SpringAnnotationType.REST_CONTROLLER: return '@RestController';
            case SpringAnnotationType.CONFIGURATION: return '@Configuration';
            case SpringAnnotationType.BEAN: return '@Bean';
            default: return '@Unknown';
        }
    }
} 