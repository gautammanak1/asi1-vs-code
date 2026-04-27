import { UpdateSettingsRequest } from "@shared/proto/Asi/state";
import { Mode } from "@shared/storage/types";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import { useState } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { StateServiceClient } from "@/services/grpc-client";
import { TabButton } from "../../mcp/configuration/McpConfigurationView";
import ApiOptions from "../ApiOptions";
import Section from "../Section";
import { settingsUi } from "../settingsUi";
import { syncModeConfigurations } from "../utils/providerUtils";
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers";
import { asiDebug } from "@/utils/debug";

interface ApiConfigurationSectionProps {
	renderSectionHeader?: (tabId: string) => JSX.Element | null;
	initialModelTab?: "recommended" | "free";
}

const ApiConfigurationSection = ({
	renderSectionHeader,
	initialModelTab,
}: ApiConfigurationSectionProps) => {
	const { planActSeparateModelsSetting, mode, apiConfiguration } =
		useExtensionState();
	const [currentTab, setCurrentTab] = useState<Mode>(mode);
	const { handleFieldsChange } = useApiConfigurationHandlers();
	return (
		<div>
			{renderSectionHeader?.("api-config")}
			<Section>
				{/* Tabs container */}
				{planActSeparateModelsSetting ? (
					<div className={`${settingsUi.card} mb-2`}>
						<div className="-mx-4 -mt-4 mb-4 flex gap-0.5 border-b border-(--vscode-widget-border) px-2">
							<TabButton
								disabled={currentTab === "plan"}
								isActive={currentTab === "plan"}
								onClick={() => setCurrentTab("plan")}
							>
								Plan mode
							</TabButton>
							<TabButton
								disabled={currentTab === "act"}
								isActive={currentTab === "act"}
								onClick={() => setCurrentTab("act")}
							>
								Act mode
							</TabButton>
						</div>

						<div className="-mb-1">
							<ApiOptions
								currentMode={currentTab}
								initialModelTab={initialModelTab}
								showModelOptions={true}
							/>
						</div>
					</div>
				) : (
					<div className={settingsUi.card}>
						<ApiOptions
							currentMode={mode}
							initialModelTab={initialModelTab}
							showModelOptions={true}
						/>
					</div>
				)}

				<div className={settingsUi.cardMuted}>
					<VSCodeCheckbox
						checked={planActSeparateModelsSetting}
						className="mb-0"
						onChange={async (e: any) => {
							const checked = e.target.checked === true;
							try {
								// If unchecking the toggle, wait a bit for state to update, then sync configurations
								if (!checked) {
									await syncModeConfigurations(
										apiConfiguration,
										currentTab,
										handleFieldsChange,
									);
								}
								await StateServiceClient.updateSettings(
									UpdateSettingsRequest.create({
										planActSeparateModelsSetting: checked,
									}),
								);
							} catch (error) {
								asiDebug.error(
									"Failed to update separate models setting:",
									error,
								);
							}
						}}
					>
						Use different models for Plan and Act modes
					</VSCodeCheckbox>
				</div>
			</Section>
		</div>
	);
};

export default ApiConfigurationSection;
