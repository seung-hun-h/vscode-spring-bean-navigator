// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BeanResolver } from './utils/bean-resolver';
import { SpringBeanDetector } from './detectors/spring-bean-detector';
import { SpringCodeLensProvider } from './providers/code-lens-provider';
import { SpringNavigationProvider } from './providers/navigation-provider';
import { ErrorHandler } from './parsers/core/parser-errors';

let beanResolver: BeanResolver;
let beanDetector: SpringBeanDetector;
let codeLensProvider: SpringCodeLensProvider;
let navigationProvider: SpringNavigationProvider;

/**
 * Extension이 활성화될 때 호출됩니다.
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('=== Spring Bean Navigator Extension 활성화 시작 ===');
	console.log('VSCode 버전:', vscode.version);
	console.log('Extension 경로:', context.extensionPath);
	console.log('워크스페이스 폴더:', vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath));

	try {
		// 핵심 컴포넌트들 초기화
		initializeComponents();

		// Provider들 등록
		registerProviders(context);

		// 명령어들 등록
		registerCommands(context);

		// 이벤트 리스너 등록
		registerEventListeners(context);

		// 초기 Bean 정의 로드
		loadInitialBeanDefinitions();

		console.log('=== Spring Bean Navigator Extension 활성화 완료! ===');
		vscode.window.showInformationMessage('🚀 Spring Bean Navigator가 활성화되었습니다!');

	} catch (error) {
		const parsingError = ErrorHandler.handleParsingError(error, 'Extension 활성화');
		ErrorHandler.logError(parsingError, { 
			vscodeVersion: vscode.version,
			workspaceFolders: vscode.workspace.workspaceFolders?.length || 0
		});
		vscode.window.showErrorMessage(`Spring Bean Navigator 활성화 실패: ${error}`);
	}
}

/**
 * Extension이 비활성화될 때 호출됩니다.
 */
export function deactivate() {
	console.log('Spring Bean Navigator Extension 비활성화됨');
	
	// 리소스 정리
	if (beanResolver) {
		beanResolver.clearCache();
	}
}

/**
 * 핵심 컴포넌트들을 초기화합니다.
 */
function initializeComponents(): void {
	console.log('컴포넌트 초기화 중...');
	
	// Bean 해결자 생성
	beanResolver = new BeanResolver();
	
	// Spring Bean 탐지기 생성
	beanDetector = new SpringBeanDetector();
	
	// CodeLens Provider 생성
	codeLensProvider = new SpringCodeLensProvider(beanResolver, beanDetector);
	
	// Navigation Provider 생성
	navigationProvider = new SpringNavigationProvider();
	
	console.log('컴포넌트 초기화 완료');
}

/**
 * VSCode Provider들을 등록합니다.
 */
function registerProviders(context: vscode.ExtensionContext): void {
	console.log('Provider 등록 중...');
	
	// CodeLens Provider 등록 (Java 파일에만 적용)
	const codeLensDisposable = vscode.languages.registerCodeLensProvider(
		{ language: 'java', scheme: 'file' },
		codeLensProvider
	);
	
	context.subscriptions.push(codeLensDisposable);
	console.log('CodeLens Provider 등록 완료');
}

/**
 * 확장 프로그램 명령어들을 등록합니다.
 */
function registerCommands(context: vscode.ExtensionContext): void {
	console.log('명령어 등록 중...');
	
	// Navigation Provider의 명령어들 등록
	navigationProvider.registerCommands(context);
	
	// 추가 명령어들 등록
	const refreshCommand = vscode.commands.registerCommand(
		'spring-bean-navigator.refresh',
		async () => {
			await refreshBeanDefinitions();
			vscode.window.showInformationMessage('Spring Bean 정의가 새로고침되었습니다.');
		}
	);
	
	const showBeanCountCommand = vscode.commands.registerCommand(
		'spring-bean-navigator.showBeanCount',
		() => {
			const count = beanResolver.getBeanCount();
			vscode.window.showInformationMessage(`발견된 Spring Bean: ${count}개`);
		}
	);
	
	context.subscriptions.push(refreshCommand);
	context.subscriptions.push(showBeanCountCommand);
	
	console.log('명령어 등록 완료');
}

/**
 * 파일 변경 등의 이벤트 리스너들을 등록합니다.
 */
function registerEventListeners(context: vscode.ExtensionContext): void {
	console.log('이벤트 리스너 등록 중...');
	
	// 파일 저장 시 Bean 정의 업데이트
	const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
		if (document.languageId === 'java') {
			await codeLensProvider.updateFileBean(document);
			console.log(`Bean 정의 업데이트: ${document.fileName}`);
		}
	});
	
	// 워크스페이스 폴더 변경 시 전체 재로드
	const onFoldersChangedDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
		await refreshBeanDefinitions();
		console.log('워크스페이스 변경으로 Bean 정의 재로드');
	});
	
	// 파일 생성/삭제 시 Bean 정의 업데이트
	const onFilesChangedDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('spring-bean-navigator')) {
			refreshBeanDefinitions();
			console.log('설정 변경으로 Bean 정의 재로드');
		}
	});
	
	context.subscriptions.push(onSaveDisposable);
	context.subscriptions.push(onFoldersChangedDisposable);
	context.subscriptions.push(onFilesChangedDisposable);
	
	console.log('이벤트 리스너 등록 완료');
}

/**
 * 초기 Bean 정의들을 로드합니다.
 */
async function loadInitialBeanDefinitions(): Promise<void> {
	console.log('초기 Bean 정의 로드 중...');
	
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		try {
			// 첫 번째 워크스페이스 폴더에서 Bean 정의 로드
			const workspaceFolder = vscode.workspace.workspaceFolders[0];
			await codeLensProvider.updateBeanDefinitions(workspaceFolder);
			
			            const beanCount = beanResolver.getBeanCount();
            console.log(`초기 Bean 정의 로드 완료: ${beanCount}개 Bean 발견`);
			
		} catch (error) {
			const parsingError = ErrorHandler.handleParsingError(error, '초기 Bean 정의 로드');
			ErrorHandler.logError(parsingError, { 
				workspaceFoldersCount: vscode.workspace.workspaceFolders?.length || 0,
				firstWorkspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.toString() || 'None'
			});
		}
	} else {
		console.log('워크스페이스 폴더가 없어 Bean 정의를 로드하지 않음');
	}
}

/**
 * Bean 정의들을 새로고침합니다.
 */
async function refreshBeanDefinitions(): Promise<void> {
	console.log('Bean 정의 새로고침 중...');
	
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		try {
			// 모든 워크스페이스 폴더에서 Bean 정의 새로고침
			for (const workspaceFolder of vscode.workspace.workspaceFolders) {
				await codeLensProvider.updateBeanDefinitions(workspaceFolder);
			}
			
			const beanCount = beanResolver.getBeanCount();
			console.log(`Bean 정의 새로고침 완료: ${beanCount}개 Bean 발견`);
			
		} catch (error) {
			const parsingError = ErrorHandler.handleParsingError(error, 'Bean 정의 새로고침');
			ErrorHandler.logError(parsingError, { 
				workspaceFoldersCount: vscode.workspace.workspaceFolders?.length || 0,
				allWorkspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.toString()) || []
			});
		}
	}
}
