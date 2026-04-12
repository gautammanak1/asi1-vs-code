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

/** Must match `package.json` → `viewsContainers.activitybar[].id` */
const ACTIVITY_BAR_CONTAINER_ID = "fetch-coder-ActivityBar";

/**
 * Chat UI lives in the **primary sidebar** (activity bar container) — docked, resizable; does not use an editor column.
 */
export class VscodeWebviewProvider
	extends WebviewProvider
	implements vscode.WebviewViewProvider
{
	public static readonly SIDEBAR_ID = ExtensionRegistryInfo.views.Sidebar;
	public static readonly PANEL_ID = "fetch-coder.ChatPanel";

	private webviewView?: vscode.WebviewView;
	private extensionDisposables: vscode.Disposable[] = [];
	private configListenerRegistered = false;

	override getWebviewUrl(path: string) {
		const w = this.webviewView?.webview;
		if (!w) {
			throw new Error("Webview not initialized");
		}
		return w.asWebviewUri(vscode.Uri.file(path)).toString();
	}

	override getCspSource() {
		const w = this.webviewView?.webview;
		if (!w) {
			throw new Error("Webview not initialized");
		}
		return w.cspSource;
	}

	override isVisible() {
		return this.webviewView?.visible ?? false;
	}

	/** Editor webview panel is not used; chat is only in the sidebar view. */
	public getWebview(): vscode.WebviewPanel | undefined {
		return undefined;
	}

	public async resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): Promise<void> {
		this.webviewView = webviewView;
		const viewDisposables: vscode.Disposable[] = [];

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(HostProvider.get().extensionFsPath)],
		};

		webviewView.webview.onDidReceiveMessage(
			(message) => {
				void this.handleWebviewMessage(message as WebviewMessage);
			},
			undefined,
			viewDisposables,
		);

		webviewView.onDidChangeVisibility(
			() => {
				if (webviewView.visible) {
					void sendShowWebviewEvent(true);
				}
			},
			undefined,
			viewDisposables,
		);

		webviewView.webview.html =
			this.context.extensionMode === vscode.ExtensionMode.Development
				? await this.getHMRHtmlContent()
				: this.getHtmlContent();

		webviewView.onDidDispose(() => {
			vscode.Disposable.from(...viewDisposables).dispose();
			if (this.webviewView === webviewView) {
				this.webviewView = undefined;
			}
		});

		if (!this.configListenerRegistered) {
			this.configListenerRegistered = true;
			vscode.workspace.onDidChangeConfiguration(
				async (e) => {
					if (e?.affectsConfiguration("Asi.mcpMarketplace.enabled")) {
						await this.controller.postStateToWebview();
					}
				},
				undefined,
				this.extensionDisposables,
			);
		}

		this.controller.clearTask();

		Logger.log(
			"[VscodeWebviewProvider] Sidebar webview resolved (activity bar container)",
		);
	}

	/**
	 * Focuses the Fetch Coder activity-bar sidebar and shows the webview. Does not open an editor column.
	 */
	public async createOrShowWebviewPanel(preserveFocus = true): Promise<void> {
		await vscode.commands.executeCommand(
			`workbench.view.extension.${ACTIVITY_BAR_CONTAINER_ID}`,
		);
		this.webviewView?.show(preserveFocus);
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
		return this.webviewView?.webview.postMessage(message);
	}

	override async dispose() {
		while (this.extensionDisposables.length) {
			const x = this.extensionDisposables.pop();
			if (x) {
				x.dispose();
			}
		}
		await super.dispose();
	}
}
