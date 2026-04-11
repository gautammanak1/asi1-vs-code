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

/**
 * VS Code host: chat UI in an editor-area webview in the **first column (left)** so the main editor
 * stays usable beside it when the layout splits.
 */
export class VscodeWebviewProvider extends WebviewProvider {
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
	 * Creates or shows the webview in the **left** editor column ({@link vscode.ViewColumn.One}).
	 */
	public async createOrShowWebviewPanel(preserveFocus = true): Promise<void> {
		if (this.webviewPanel) {
			this.webviewPanel.reveal(vscode.ViewColumn.One, preserveFocus);
			return;
		}

		this.webviewPanel = vscode.window.createWebviewPanel(
			VscodeWebviewProvider.PANEL_ID,
			VscodeWebviewProvider.PANEL_TITLE,
			vscode.ViewColumn.One,
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

		this.setWebviewMessageListener(this.webviewPanel.webview);

		this.webviewPanel.onDidChangeViewState(
			async (e) => {
				if (e.webviewPanel.visible) {
					await sendShowWebviewEvent(true);
				}
			},
			null,
			this.disposables,
		);

		this.webviewPanel.onDidDispose(
			async () => {
				this.webviewPanel = undefined;
				await this.dispose();
			},
			null,
			this.disposables,
		);

		vscode.workspace.onDidChangeConfiguration(
			async (e) => {
				if (e?.affectsConfiguration("Asi.mcpMarketplace.enabled")) {
					await this.controller.postStateToWebview();
				}
			},
			null,
			this.disposables,
		);

		this.controller.clearTask();

		Logger.log(
			"[VscodeWebviewProvider] Webview panel created in ViewColumn.One (left)",
		);
	}

	private setWebviewMessageListener(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			(message) => {
				this.handleWebviewMessage(message);
			},
			null,
			this.disposables,
		);
	}

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

	private async postMessageToWebview(
		message: ExtensionMessage,
	): Promise<boolean | undefined> {
		return this.webviewPanel?.webview.postMessage(message);
	}

	override async dispose() {
		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
		await super.dispose();
	}
}
