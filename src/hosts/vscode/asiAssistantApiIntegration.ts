import * as vscode from "vscode"
import type { VscodeWebviewProvider } from "./VscodeWebviewProvider"

const DEFAULT_BASE = "https://api.asi1.ai/v1"
const DEFAULT_MODEL = "asi1"

/**
 * Mirrors desktop `asi-assistant`: User Settings keys `asiAssistant.apiKey` / `baseUrl` / `model`
 * plus Command Palette flows `Asi.insertApiKey` and `asiAssistant.insertApiKey`.
 */
export function registerAsiAssistantApiIntegration(context: vscode.ExtensionContext, webview: VscodeWebviewProvider): void {
	const runSetApiKey = async () => {
		const key = await vscode.window.showInputBox({
			title: "ASI:One API Key",
			password: true,
			placeHolder: "Paste your API key",
			ignoreFocusOut: true,
		})
		if (key === undefined) {
			return
		}

		const baseUrl =
			(await vscode.window.showInputBox({
				title: "API Base URL",
				value: DEFAULT_BASE,
				placeHolder: DEFAULT_BASE,
				ignoreFocusOut: true,
			})) ?? DEFAULT_BASE

		const model =
			(await vscode.window.showInputBox({
				title: "Model ID",
				value: DEFAULT_MODEL,
				placeHolder: DEFAULT_MODEL,
				ignoreFocusOut: true,
			})) ?? DEFAULT_MODEL

		const conf = vscode.workspace.getConfiguration("asiAssistant")
		await conf.update("apiKey", key, vscode.ConfigurationTarget.Global)
		await conf.update("baseUrl", baseUrl, vscode.ConfigurationTarget.Global)
		await conf.update("model", model, vscode.ConfigurationTarget.Global)

		await applyToFetchCoderState(webview, { apiKey: key, baseUrl, model })
		void vscode.window.showInformationMessage("ASI:One API key and endpoints saved for Fetch Coder.")
	}

	context.subscriptions.push(vscode.commands.registerCommand("Asi.insertApiKey", runSetApiKey))
	context.subscriptions.push(vscode.commands.registerCommand("asiAssistant.insertApiKey", runSetApiKey))

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("asiAssistant")) {
				void syncAsiAssistantSettingsIntoFetchCoder(webview)
			}
		}),
	)

	void syncAsiAssistantSettingsIntoFetchCoder(webview)
}

async function applyToFetchCoderState(
	webview: VscodeWebviewProvider,
	opts: { apiKey?: string; baseUrl?: string; model?: string },
): Promise<void> {
	const { apiKey, baseUrl, model } = opts
	webview.controller.stateManager.setApiConfiguration({
		...(apiKey !== undefined && apiKey !== "" ? { openAiApiKey: apiKey } : {}),
		...(baseUrl !== undefined && baseUrl !== "" ? { openAiBaseUrl: baseUrl } : {}),
		...(model !== undefined && model !== "" ? { planModeOpenAiModelId: model, actModeOpenAiModelId: model } : {}),
		planModeApiProvider: "openai",
		actModeApiProvider: "openai",
	})
	await webview.controller.postStateToWebview()
}

async function syncAsiAssistantSettingsIntoFetchCoder(webview: VscodeWebviewProvider): Promise<void> {
	const conf = vscode.workspace.getConfiguration("asiAssistant")
	const apiKey = conf.get<string>("apiKey")?.trim() ?? ""
	const baseUrl = conf.get<string>("baseUrl")?.trim() ?? ""
	const model = conf.get<string>("model")?.trim() ?? ""
	if (!apiKey && !baseUrl && !model) {
		return
	}
	await applyToFetchCoderState(webview, {
		...(apiKey ? { apiKey } : {}),
		...(baseUrl ? { baseUrl } : {}),
		...(model ? { model } : {}),
	})
}
