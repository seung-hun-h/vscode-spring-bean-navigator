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
 * Called when the extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
	try {
		// Initialize core components
		initializeComponents();

		// Register providers
		registerProviders(context);

		// Register commands
		registerCommands(context);

		// Register event listeners
		registerEventListeners(context);

		// Load initial bean definitions
		loadInitialBeanDefinitions();

		vscode.window.showInformationMessage('Spring Bean Navigator has been activated!');

	} catch (error) {
		const parsingError = ErrorHandler.handleParsingError(error, 'Extension activation');
		ErrorHandler.logError(parsingError, { 
			vscodeVersion: vscode.version,
			workspaceFolders: vscode.workspace.workspaceFolders?.length || 0
		});
		vscode.window.showErrorMessage(`Failed to activate Spring Bean Navigator: ${error}`);
	}
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate() {
	if (beanResolver) {
		beanResolver.clearCache();
	}
}

/**
 * Initialize core components.
 */
function initializeComponents(): void {
	// Create bean resolver
	beanResolver = new BeanResolver();
	
	// Create Spring bean detector
	beanDetector = new SpringBeanDetector();
	
	// Create CodeLens provider
	codeLensProvider = new SpringCodeLensProvider(beanResolver, beanDetector);
	
	// Create navigation provider
	navigationProvider = new SpringNavigationProvider();
}

/**
 * Register VSCode providers.
 */
function registerProviders(context: vscode.ExtensionContext): void {
	// Register CodeLens provider (only for Java files)
	const codeLensDisposable = vscode.languages.registerCodeLensProvider(
		{ language: 'java', scheme: 'file' },
		codeLensProvider
	);
	
	context.subscriptions.push(codeLensDisposable);
}

/**
 * Register extension commands.
 */
function registerCommands(context: vscode.ExtensionContext): void {
	// Register navigation provider commands
	navigationProvider.registerCommands(context);
	
	// Register additional commands
	const refreshCommand = vscode.commands.registerCommand(
		'spring-bean-navigator.refresh',
		async () => {
			await refreshBeanDefinitions();
			vscode.window.showInformationMessage('Spring bean definitions have been refreshed.');
		}
	);
	
	const showBeanCountCommand = vscode.commands.registerCommand(
		'spring-bean-navigator.showBeanCount',
		() => {
			const count = beanResolver.getBeanCount();
			vscode.window.showInformationMessage(`Found Spring Beans: ${count}`);
		}
	);
	
	context.subscriptions.push(refreshCommand);
	context.subscriptions.push(showBeanCountCommand);
}

/**
 * Register event listeners for file changes etc.
 */
function registerEventListeners(context: vscode.ExtensionContext): void {
	// Update bean definitions when files are saved
	const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
		if (document.languageId === 'java') {
			await codeLensProvider.updateFileBean(document);
		}
	});
	
	// Reload everything when workspace folders change
	const onFoldersChangedDisposable = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
		await refreshBeanDefinitions();
	});
	
	// Update bean definitions when files are created/deleted
	const onFilesChangedDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('spring-bean-navigator')) {
			refreshBeanDefinitions();
		}
	});
	
	context.subscriptions.push(onSaveDisposable);
	context.subscriptions.push(onFoldersChangedDisposable);
	context.subscriptions.push(onFilesChangedDisposable);
}

/**
 * Load initial bean definitions.
 */
async function loadInitialBeanDefinitions(): Promise<void> {
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		try {
			// Load bean definitions from the first workspace folder
			const workspaceFolder = vscode.workspace.workspaceFolders[0];
			await codeLensProvider.updateBeanDefinitions(workspaceFolder);
		} catch (error) {
			const parsingError = ErrorHandler.handleParsingError(error, 'Initial bean definition loading');
			ErrorHandler.logError(parsingError, { 
				workspaceFoldersCount: vscode.workspace.workspaceFolders?.length || 0,
				firstWorkspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.toString() || 'None'
			});
		}
	}
}

/**
 * Refresh bean definitions.
 */
async function refreshBeanDefinitions(): Promise<void> {
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		try {
			// Refresh bean definitions from all workspace folders
			for (const workspaceFolder of vscode.workspace.workspaceFolders) {
				await codeLensProvider.updateBeanDefinitions(workspaceFolder);
			}
			
		} catch (error) {
			const parsingError = ErrorHandler.handleParsingError(error, 'Bean definition refresh');
			ErrorHandler.logError(parsingError, { 
				workspaceFoldersCount: vscode.workspace.workspaceFolders?.length || 0,
				allWorkspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.toString()) || []
			});
		}
	}
}
