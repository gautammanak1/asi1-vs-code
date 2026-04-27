import type { ApiConfiguration, OpenAiCompatibleModelInfo } from "@shared/api";
import { openAiModelInfoSaneDefaults } from "@shared/api";
import { Mode } from "@shared/storage/types";
import { useEffect } from "react";
import {
	VSCodeDropdown,
	VSCodeOption,
} from "@vscode/webview-ui-toolkit/react";
import { ApiKeyField } from "../common/ApiKeyField";
import { DropdownContainer } from "../ApiOptions";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers";
import {
	ASI_ONE_DEFAULT_MODEL_ID,
	ASI_ONE_MODEL_CHOICES,
	isAllowedAsiOneModelId,
} from "./asiOneModelChoices";

/** ASI:One OpenAI-compatible base URL (model id in request body). */
export const ASI_ONE_BASE_URL = "https://api.asi1.ai/v1";
/** @deprecated use ASI_ONE_DEFAULT_MODEL_ID from asiOneModelChoices */
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
 * ASI:One: one base URL + API key; user picks the model (same API for asi1-ultra, asi1, asi1-mini, …).
 */
export const AsiOneSettings = ({
	currentMode: _currentMode,
}: AsiOneSettingsProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState();
	const { handleFieldChange, handleFieldsChange } =
		useApiConfigurationHandlers();
	const remoteLocksBase = remoteConfigSettings?.openAiBaseUrl !== undefined;

	const selectedId =
		apiConfiguration?.planModeOpenAiModelId || ASI_ONE_DEFAULT_MODEL_ID;
	const valueForUi = isAllowedAsiOneModelId(selectedId)
		? selectedId
		: ASI_ONE_DEFAULT_MODEL_ID;

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
		const planId = apiConfiguration.planModeOpenAiModelId;
		const actId = apiConfiguration.actModeOpenAiModelId;
		if (!isAllowedAsiOneModelId(planId)) {
			updates.planModeOpenAiModelId = ASI_ONE_DEFAULT_MODEL_ID;
		}
		if (!isAllowedAsiOneModelId(actId)) {
			updates.actModeOpenAiModelId = ASI_ONE_DEFAULT_MODEL_ID;
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
			<ApiKeyField
				initialValue={apiConfiguration?.openAiApiKey || ""}
				onChange={(v) => {
					void handleFieldChange("openAiApiKey", v);
				}}
				providerName="ASI:One"
			/>
			<DropdownContainer>
				<label className="block" htmlFor="asi1-model-id">
					<span className="text-[13px] font-medium text-(--vscode-foreground)">
						Model
					</span>
					<p className="m-0 mt-1 text-[12px] leading-snug text-(--vscode-descriptionForeground)">
						One API key and endpoint (
						<code className="text-[11px]">/v1/chat/completions</code>
						) — pick any ASI:One model below.
					</p>
				</label>
				<VSCodeDropdown
					className="mt-1.5 w-full"
					id="asi1-model-id"
					key={valueForUi}
					onChange={(e) => {
						const el = e.target as unknown as { value: string };
						const id = (el.value || ASI_ONE_DEFAULT_MODEL_ID) as
							| "asi1-ultra"
							| "asi1"
							| "asi1-mini";
						void handleFieldsChange({
							planModeOpenAiModelId: id,
							actModeOpenAiModelId: id,
							planModeOpenAiModelInfo: ASI_ONE_MODEL_INFO,
							actModeOpenAiModelInfo: ASI_ONE_MODEL_INFO,
						});
					}}
					value={valueForUi}
				>
					{ASI_ONE_MODEL_CHOICES.map((c) => (
						<VSCodeOption key={c.id} value={c.id}>
							{c.label}
						</VSCodeOption>
					))}
				</VSCodeDropdown>
			</DropdownContainer>
		</div>
	);
};
