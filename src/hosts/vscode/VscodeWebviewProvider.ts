import { sendShowWebviewEvent } from "@core/controller/ui/subscribeToShowWebview";
import { WebviewProvider } from "@core/webview";
import * as vscode from "vscode";
import {
	handleGrpcRequest,
	handleGrpcRequestCancel,
} from "@/core/controller/grpc-handler";
import { HostProvider } from "@/hosts/host-provider";
import { ExtensionRegistryInfo } from "@/registry";
import type { ExtensionMessage } from "@/shared/ExtensionMessage";
import { Logger } from "@/shared/services/Logger";
import { WebviewMessage } from "@/shared/WebviewMessage";

export class VscodeWebviewProvider extends WebviewProvider {
	// Used in package.json as the view's id. This value cannot be changed due to how vscode caches
	// views based on their id, and updating the id would break existing instances of the extension.
	public static readonly SIDEBAR_ID = ExtensionRegistryInfo.views.Sidebar;
	public static readonly PANEL_ID = "fetch-coder.ChatPanel";
	public static readonly PANEL_TITLE = "Fetch Coder";

	private webviewPanel?: vscode.WebviewPanel;
	private disposables: vscode.Disposable[] = [];

	override getWebviewUrl(path: string) {
		if (!this.webviewPanel) {
			throw new Error("Webview panel not initialized");
		}
		const uri = this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(path));
		return uri.toString();
	}

	override getCspSource() {
		if (!this.webviewPanel) {
			throw new Error("Webview panel not initialized");
		}
		return this.webviewPanel.webview.cspSource;
	}

	override isVisible() {
		return this.webviewPanel?.visible || false;
	}

	public getWebview(): vscode.WebviewPanel | undefined {
		return this.webviewPanel;
	}

	/**
	 * Creates or shows the webview panel on the RIGHT side (ViewColumn.Two)
	 * This positions it like GitHub Copilot Chat
	 *
	 * @returns A promise that resolves when the webview has been fully initialized
	 */
	public async createOrShowWebviewPanel(): Promise<void> {
		// If panel already exists, show it
		if (this.webviewPanel) {
			this.webviewPanel.reveal(vscode.ViewColumn.Two);
			return;
		}

		// Create new webview panel on the RIGHT side (ViewColumn.Two)
		this.webviewPanel = vscode.window.createWebviewPanel(
			VscodeWebviewProvider.PANEL_ID,
			VscodeWebviewProvider.PANEL_TITLE,
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.file(HostProvider.get().extensionFsPath),
				],
				retainContextWhenHidden: true,
			},
		);

		this.webviewPanel.webview.html =
			this.context.extensionMode === vscode.ExtensionMode.Development
				? await this.getHMRHtmlContent()
				: this.getHtmlContent();

		// Sets up an event listener to listen for messages passed from the webview context
		// and executes code based on the message that is received
		this.setWebviewMessageListener(this.webviewPanel.webview);

		// Listen for panel visibility changes
		this.webviewPanel.onDidChangeViewState(
			async (e) => {
				if (e.webviewPanel.visible) {
					// Panel becoming visible should not steal editor focus
					await sendShowWebviewEvent(true);
				}
			},
			null,
			this.disposables,
		);

		// Listen for when the panel is disposed
		this.webviewPanel.onDidDispose(
			async () => {
				this.webviewPanel = undefined;
				await this.dispose();
			},
			null,
			this.disposables,
		);

		// Listen for configuration changes
		vscode.workspace.onDidChangeConfiguration(
			async (e) => {
				if (e && e.affectsConfiguration("Asi.mcpMarketplace.enabled")) {
					// Update state when marketplace tab setting changes
					await this.controller.postStateToWebview();
				}
			},
			null,
			this.disposables,
		);

		// if the extension is starting a new session, clear previous task state
		this.controller.clearTask();

		Logger.log(
			"[VscodeWebviewProvider] Webview panel created on RIGHT side (ViewColumn.Two)",
		);
	}

	/**
	 * Sets up an event listener to listen for messages passed from the webview context and
	 * executes code based on the message that is received.
	 *
	 * IMPORTANT: When passing methods as callbacks in JavaScript/TypeScript, the method's
	 * 'this' context can be lost. This happens because the method is passed as a
	 * standalone function reference, detached from its original object.
	 *
	 * The Problem:
	 * Doing: webview.onDidReceiveMessage(this.controller.handleWebviewMessage)
	 * Would cause 'this' inside handleWebviewMessage to be undefined or wrong,
	 * leading to "TypeError: this.setUserInfo is not a function"
	 *
	 * The Solution:
	 * We wrap the method call in an arrow function, which:
	 * 1. Preserves the lexical scope's 'this' binding
	 * 2. Ensures handleWebviewMessage is called as a method on the controller instance
	 * 3. Maintains access to all controller methods and properties
	 *
	 * Alternative solutions could use .bind() or making handleWebviewMessage an arrow
	 * function property, but this approach is clean and explicit.
	 *
	 * @param webview The webview instance to attach the message listener to
	 */
	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message) => {
				this.handleWebviewMessage(message);
			},
			null,
			this.disposables,
		);
	}

	/**
	 * Sets up an event listener to listen for messages passed from the webview context and
	 * executes code based on the message that is received.
	 *
	 * @param webview A reference to the extension webview
	 */
	async handleWebviewMessage(message: WebviewMessage) {
		const postMessageToWebview = (response: ExtensionMessage) =>
			this.postMessageToWebview(response);

		switch (message.type) {
			case "grpc_request": {
				if (message.grpc_request) {
					await handleGrpcRequest(
						this.controller,
						postMessageToWebview,
						message.grpc_request,
					);
				}
				break;
			}
			case "grpc_request_cancel": {
				if (message.grpc_request_cancel) {
					await handleGrpcRequestCancel(
						postMessageToWebview,
						message.grpc_request_cancel,
					);
				}
				break;
			}
			default: {
				Logger.error(
					"Received unhandled WebviewMessage type:",
					JSON.stringify(message),
				);
			}
		}
	}

	/**
	 * Sends a message from the extension to the webview.
	 *
	 * @param message - The message to send to the webview
	 * @returns A thenable that resolves to a boolean indicating success, or undefined if the webview is not available
	 */
	private async postMessageToWebview(
		message: ExtensionMessage,
	): Promise<boolean | undefined> {
		return this.webviewPanel?.webview.postMessage(message);
	}

	override async dispose() {
		// WebviewView doesn't have a dispose method, it's managed by VSCode
		// We just need to clean up our disposables
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
		super.dispose();
	}
}
