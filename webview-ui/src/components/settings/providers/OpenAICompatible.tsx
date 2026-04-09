import type { ApiConfiguration, OpenAiCompatibleModelInfo } from "@shared/api"
import { openAiModelInfoSaneDefaults } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { useEffect } from "react"
import { ApiKeyField } from "../common/ApiKeyField"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/** ASI:One — matches the official OpenAI SDK usage (baseURL + model `asi1`). */
export const ASI_ONE_BASE_URL = "https://api.asi1.ai/v1"
export const ASI_ONE_MODEL_ID = "asi1"

const ASI_ONE_MODEL_INFO: OpenAiCompatibleModelInfo = {
	...openAiModelInfoSaneDefaults,
	contextWindow: 128_000,
	inputPrice: 0,
	outputPrice: 0,
	description: undefined,
}

interface OpenAICompatibleProviderProps {
	currentMode: Mode
}

/**
 * OpenAI-compatible provider fixed to ASI:One: single model, free (no extension-side billing).
 */
export const OpenAICompatibleProvider = ({ currentMode: _currentMode }: OpenAICompatibleProviderProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState()
	const { handleFieldChange, handleFieldsChange } = useApiConfigurationHandlers()
	const remoteLocksBase = remoteConfigSettings?.openAiBaseUrl !== undefined

	useEffect(() => {
		if (!apiConfiguration) {
			return
		}

		const updates: Partial<ApiConfiguration> = {}
		if (apiConfiguration.planModeApiProvider !== "openai") {
			updates.planModeApiProvider = "openai"
		}
		if (apiConfiguration.actModeApiProvider !== "openai") {
			updates.actModeApiProvider = "openai"
		}
		if (!remoteLocksBase) {
			const normalized = (apiConfiguration.openAiBaseUrl || "").replace(/\/$/, "")
			const target = ASI_ONE_BASE_URL.replace(/\/$/, "")
			if (normalized !== target) {
				updates.openAiBaseUrl = ASI_ONE_BASE_URL
			}
		}
		if (apiConfiguration.planModeOpenAiModelId !== ASI_ONE_MODEL_ID) {
			updates.planModeOpenAiModelId = ASI_ONE_MODEL_ID
		}
		if (apiConfiguration.actModeOpenAiModelId !== ASI_ONE_MODEL_ID) {
			updates.actModeOpenAiModelId = ASI_ONE_MODEL_ID
		}
		const planInfo = apiConfiguration.planModeOpenAiModelInfo
		const actInfo = apiConfiguration.actModeOpenAiModelInfo
		const planOk =
			planInfo &&
			planInfo.contextWindow === ASI_ONE_MODEL_INFO.contextWindow &&
			(planInfo.inputPrice ?? 0) === 0 &&
			(planInfo.outputPrice ?? 0) === 0
		const actOk =
			actInfo &&
			actInfo.contextWindow === ASI_ONE_MODEL_INFO.contextWindow &&
			(actInfo.inputPrice ?? 0) === 0 &&
			(actInfo.outputPrice ?? 0) === 0
		if (!planOk) {
			updates.planModeOpenAiModelInfo = ASI_ONE_MODEL_INFO
		}
		if (!actOk) {
			updates.actModeOpenAiModelInfo = ASI_ONE_MODEL_INFO
		}

		if (Object.keys(updates).length > 0) {
			void handleFieldsChange(updates)
		}
	}, [apiConfiguration, handleFieldsChange, remoteConfigSettings?.openAiBaseUrl])

	return (
		<div>
			<div className="mb-2.5">
				<div className="flex items-center gap-2 mb-1">
					<span style={{ fontWeight: 500 }}>Base URL</span>
					{remoteConfigSettings?.openAiBaseUrl !== undefined && (
						<i className="codicon codicon-lock text-description text-sm" />
					)}
				</div>
				<div
					className="px-2 py-1.5 rounded text-sm"
					style={{
						background: "var(--vscode-editor-inactiveSelectionBackground)",
						opacity: 0.95,
					}}>
					<code className="text-xs">
						{(remoteLocksBase ? apiConfiguration?.openAiBaseUrl : ASI_ONE_BASE_URL) || ASI_ONE_BASE_URL}
					</code>
				</div>
				<p className="text-description text-xs mt-1 mb-0">Fixed for ASI:One (same as OpenAI SDK <code>baseURL</code>).</p>
			</div>

			<ApiKeyField
				initialValue={apiConfiguration?.openAiApiKey || ""}
				onChange={(value) => {
					void handleFieldChange("openAiApiKey", value)
				}}
				providerName="ASI:One"
			/>

			<div className="mt-3 mb-1">
				<span style={{ fontWeight: 500 }}>Model</span>
				<div
					className="mt-1 px-2 py-1.5 rounded text-sm"
					style={{
						background: "var(--vscode-editor-inactiveSelectionBackground)",
						opacity: 0.95,
					}}>
					<code className="text-xs">{ASI_ONE_MODEL_ID}</code>
					<span className="text-description text-xs ml-2">· 128k context · free (not billed in Fetch Coder)</span>
				</div>
			</div>
		</div>
	)
}
