import type { ApiConfiguration, OpenAiCompatibleModelInfo } from "@shared/api";
import { openAiModelInfoSaneDefaults } from "@shared/api";
import { Mode } from "@shared/storage/types";
import { useEffect } from "react";
import { ApiKeyField } from "../common/ApiKeyField";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { settingsUi } from "../settingsUi";
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers";

/** ASI:One — `baseURL` + model `asi1-mini` (same shape as OpenAI client config). */
export const ASI_ONE_BASE_URL = "https://api.asi1.ai/v1";
export const ASI_ONE_MODEL_ID = "asi1-mini";

const ASI_ONE_MODEL_INFO: OpenAiCompatibleModelInfo = {
	...openAiModelInfoSaneDefaults,
	contextWindow: 128_000,
	inputPrice: 0,
	outputPrice: 0,
	description: undefined,
};

interface AsiOneSettingsProps {
	currentMode: Mode;
}

/**
 * ASI:One only: fixed endpoint and model; user supplies API key (or env `ASI_ONE_API_KEY`).
 */
export const AsiOneSettings = ({
	currentMode: _currentMode,
}: AsiOneSettingsProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState();
	const { handleFieldChange, handleFieldsChange } =
		useApiConfigurationHandlers();
	const remoteLocksBase = remoteConfigSettings?.openAiBaseUrl !== undefined;

	useEffect(() => {
		if (!apiConfiguration) {
			return;
		}

		const updates: Partial<ApiConfiguration> = {};
		if (apiConfiguration.planModeApiProvider !== "openai") {
			updates.planModeApiProvider = "openai";
		}
		if (apiConfiguration.actModeApiProvider !== "openai") {
			updates.actModeApiProvider = "openai";
		}
		if (!remoteLocksBase) {
			const normalized = (apiConfiguration.openAiBaseUrl || "").replace(
				/\/$/,
				"",
			);
			const target = ASI_ONE_BASE_URL.replace(/\/$/, "");
			if (normalized !== target) {
				updates.openAiBaseUrl = ASI_ONE_BASE_URL;
			}
		}
		if (apiConfiguration.planModeOpenAiModelId !== ASI_ONE_MODEL_ID) {
			updates.planModeOpenAiModelId = ASI_ONE_MODEL_ID;
		}
		if (apiConfiguration.actModeOpenAiModelId !== ASI_ONE_MODEL_ID) {
			updates.actModeOpenAiModelId = ASI_ONE_MODEL_ID;
		}
		const planInfo = apiConfiguration.planModeOpenAiModelInfo;
		const actInfo = apiConfiguration.actModeOpenAiModelInfo;
		const planOk =
			planInfo &&
			planInfo.contextWindow === ASI_ONE_MODEL_INFO.contextWindow &&
			(planInfo.inputPrice ?? 0) === 0 &&
			(planInfo.outputPrice ?? 0) === 0;
		const actOk =
			actInfo &&
			actInfo.contextWindow === ASI_ONE_MODEL_INFO.contextWindow &&
			(actInfo.inputPrice ?? 0) === 0 &&
			(actInfo.outputPrice ?? 0) === 0;
		if (!planOk) {
			updates.planModeOpenAiModelInfo = ASI_ONE_MODEL_INFO;
		}
		if (!actOk) {
			updates.actModeOpenAiModelInfo = ASI_ONE_MODEL_INFO;
		}

		if (Object.keys(updates).length > 0) {
			void handleFieldsChange(updates);
		}
	}, [
		apiConfiguration,
		handleFieldsChange,
		remoteConfigSettings?.openAiBaseUrl,
	]);

	return (
		<div className="flex flex-col gap-4">
			<div>
				<div className="mb-1.5 flex items-center gap-2">
					<span className={cn(settingsUi.formLabel, "!mb-0")}>Endpoint</span>
					{remoteLocksBase && (
						<i className="codicon codicon-lock text-description text-sm" />
					)}
				</div>
				<div
					className={`rounded-lg border border-(--vscode-widget-border) bg-(--vscode-editor-inactiveSelectionBackground)/80 px-3 py-2 text-sm`}
				>
					<code className="text-xs">
						{(remoteLocksBase
							? apiConfiguration?.openAiBaseUrl
							: ASI_ONE_BASE_URL) || ASI_ONE_BASE_URL}
					</code>
				</div>
				<p className={cn(settingsUi.hint, "mt-2")}>
					ASI:One chat API — fixed for this extension.
				</p>
			</div>

			<ApiKeyField
				initialValue={apiConfiguration?.openAiApiKey || ""}
				onChange={(value) => {
					void handleFieldChange("openAiApiKey", value);
				}}
				providerName="ASI:One"
			/>

			<div>
				<span className={settingsUi.formLabel}>Model</span>
				<div className="mt-1.5 rounded-lg border border-(--vscode-widget-border) bg-(--vscode-editor-inactiveSelectionBackground)/80 px-3 py-2 text-sm">
					<code className="text-xs">{ASI_ONE_MODEL_ID}</code>
					<span className="ml-2 text-xs text-(--vscode-descriptionForeground)">
						· 128k context
					</span>
				</div>
			</div>
		</div>
	);
};
