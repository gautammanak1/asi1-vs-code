import { UpdateSettingsRequest } from "@shared/proto/Asi/state";
import { memo, type ReactNode, useCallback } from "react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExtensionState } from "@/context/ExtensionStateContext";
import Section from "../Section";
import { settingsUi } from "../settingsUi";
import SettingsSlider from "../SettingsSlider";
import { updateSetting } from "../utils/settingsHandlers";
import { cn } from "@/lib/utils";

// Reusable checkbox component for feature settings
interface FeatureCheckboxProps {
	checked: boolean | undefined;
	onChange: (checked: boolean) => void;
	label: string;
	description: ReactNode;
	disabled?: boolean;
	isRemoteLocked?: boolean;
	remoteTooltip?: string;
	isVisible?: boolean;
}

// Interface for feature toggle configuration
interface FeatureToggle {
	id: string;
	label: string;
	description: ReactNode;
	settingKey: keyof UpdateSettingsRequest;
	stateKey: string;
	/** If set, the setting value is nested with this key (e.g., "enabled" -> { enabled: checked }) */
	nestedKey?: string;
}

const agentFeatures: FeatureToggle[] = [
	{
		id: "subagents",
		label: "Subagents",
		description:
			"Let Asi run focused subagents in parallel to explore the codebase for you.",
		stateKey: "subagentsEnabled",
		settingKey: "subagentsEnabled",
	},
	{
		id: "native-tool-call",
		label: "Native Tool Call",
		description: "Use native function calling when available",
		stateKey: "nativeToolCallSetting",
		settingKey: "nativeToolCallEnabled",
	},
	{
		id: "parallel-tool-calling",
		label: "Parallel Tool Calling",
		description: "Execute multiple tool calls simultaneously",
		stateKey: "enableParallelToolCalling",
		settingKey: "enableParallelToolCalling",
	},
	{
		id: "strict-plan-mode",
		label: "Strict Plan Mode",
		description: "Prevents file edits while in Plan mode",
		stateKey: "strictPlanModeEnabled",
		settingKey: "strictPlanModeEnabled",
	},
	{
		id: "auto-compact",
		label: "Auto Compact",
		description: "Automatically compress conversation history.",
		stateKey: "useAutoCondense",
		settingKey: "useAutoCondense",
	},
	{
		id: "focus-chain",
		label: "Focus Chain",
		description: "Maintain context focus across interactions",
		stateKey: "focusChainEnabled",
		settingKey: "focusChainSettings",
		nestedKey: "enabled",
	},
];

const editorFeatures: FeatureToggle[] = [
	{
		id: "show-feature-tips",
		label: "Feature Tips",
		description:
			"Show rotating tips during the thinking phase to help you discover Asi features.",
		stateKey: "showFeatureTips",
		settingKey: "showFeatureTips",
	},
	{
		id: "background-edit",
		label: "Background Edit",
		description: "Allow edits without stealing editor focus",
		stateKey: "backgroundEditEnabled",
		settingKey: "backgroundEditEnabled",
	},
	{
		id: "checkpoints",
		label: "Checkpoints",
		description: "Save progress at key points for easy rollback",
		stateKey: "enableCheckpointsSetting",
		settingKey: "enableCheckpointsSetting",
	},
	{
		id: "Asi-web-tools",
		label: "Asi Web Tools",
		description: "Access web browsing and search capabilities",
		stateKey: "AsiWebToolsEnabled",
		settingKey: "clineWebToolsEnabled",
	},
	{
		id: "worktrees",
		label: "Worktrees",
		description:
			"Enables git worktree management for running parallel Asi tasks.",
		stateKey: "worktreesEnabled",
		settingKey: "worktreesEnabled",
	},
];

const experimentalFeatures: FeatureToggle[] = [
	{
		id: "yolo",
		label: "Yolo Mode",
		description:
			"Execute tasks without user's confirmation. Auto-switches from Plan to Act mode and disables the ask question tool. Use with extreme caution.",
		stateKey: "yoloModeToggled",
		settingKey: "yoloModeToggled",
	},
	{
		id: "double-check-completion",
		label: "Double-Check Completion",
		description:
			"Rejects the first completion attempt and asks the model to re-verify its work against the original task requirements before accepting.",
		stateKey: "doubleCheckCompletionEnabled",
		settingKey: "doubleCheckCompletionEnabled",
	},
];

const advancedFeatures: FeatureToggle[] = [
	{
		id: "hooks",
		label: "Hooks",
		description: "Enable lifecycle and tool hooks during task execution.",
		stateKey: "hooksEnabled",
		settingKey: "hooksEnabled",
	},
];

const FeatureRow = memo(
	({
		checked = false,
		onChange,
		label,
		description,
		disabled,
		isRemoteLocked,
		isVisible = true,
		remoteTooltip,
	}: FeatureCheckboxProps) => {
		if (!isVisible) {
			return null;
		}

		const checkbox = (
			<div className="flex items-center justify-between w-full">
				<div>{label}</div>
				<div>
					<Switch
						checked={checked}
						className="shrink-0"
						disabled={disabled || isRemoteLocked}
						id={label}
						onCheckedChange={onChange}
						size="lg"
					/>
					{isRemoteLocked && (
						<i className="codicon codicon-lock text-description text-sm" />
					)}
				</div>
			</div>
		);

		return (
			<div className="flex flex-col items-start justify-between gap-4 py-3 w-full">
				<div className="space-y-0.5 flex-1 w-full">
					{isRemoteLocked ? (
						<Tooltip>
							<TooltipTrigger asChild>{checkbox}</TooltipTrigger>
							<TooltipContent className="max-w-xs" side="top">
								{remoteTooltip}
							</TooltipContent>
						</Tooltip>
					) : (
						checkbox
					)}
				</div>
				<div className="text-xs leading-relaxed text-(--vscode-descriptionForeground)">
					{description}
				</div>
			</div>
		);
	},
);

interface FeatureSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null;
}

const FeatureSettingsSection = ({
	renderSectionHeader,
}: FeatureSettingsSectionProps) => {
	const {
		enableCheckpointsSetting,
		hooksEnabled,
		mcpDisplayMode,
		strictPlanModeEnabled,
		yoloModeToggled,
		useAutoCondense,
		subagentsEnabled,
		AsiWebToolsEnabled,
		worktreesEnabled,
		focusChainSettings,
		remoteConfigSettings,
		nativeToolCallSetting,
		enableParallelToolCalling,
		backgroundEditEnabled,
		doubleCheckCompletionEnabled,
		showFeatureTips,
	} = useExtensionState();

	const handleFocusChainIntervalChange = useCallback(
		(value: number) => {
			updateSetting("focusChainSettings", {
				...focusChainSettings,
				remindAsiInterval: value,
			});
		},
		[focusChainSettings],
	);

	const isYoloRemoteLocked =
		remoteConfigSettings?.yoloModeToggled !== undefined;

	// State lookup for mapped features
	const featureState: Record<string, boolean | undefined> = {
		showFeatureTips,
		enableCheckpointsSetting,
		strictPlanModeEnabled,
		hooksEnabled,
		nativeToolCallSetting,
		focusChainEnabled: focusChainSettings?.enabled,
		useAutoCondense,
		subagentsEnabled,
		AsiWebToolsEnabled: AsiWebToolsEnabled?.user,
		worktreesEnabled: worktreesEnabled?.user,
		enableParallelToolCalling,
		backgroundEditEnabled,
		doubleCheckCompletionEnabled,
		yoloModeToggled: isYoloRemoteLocked
			? remoteConfigSettings?.yoloModeToggled
			: yoloModeToggled,
	};

	// Visibility lookup for features with feature flags
	const featureVisibility: Record<string, boolean | undefined> = {
		AsiWebToolsEnabled: AsiWebToolsEnabled?.featureFlag,
		worktreesEnabled: worktreesEnabled?.featureFlag,
	};

	// Handler for feature toggle changes, supports nested settings like focusChainSettings
	const handleFeatureChange = useCallback(
		(feature: FeatureToggle, checked: boolean) => {
			if (feature.nestedKey) {
				// For nested settings, spread the existing value and set the nested key
				let currentValue = {};
				if (feature.settingKey === "focusChainSettings") {
					currentValue = focusChainSettings ?? {};
				}
				updateSetting(feature.settingKey, {
					...currentValue,
					[feature.nestedKey]: checked,
				});
			} else {
				updateSetting(feature.settingKey, checked);
			}
		},
		[focusChainSettings],
	);

	return (
		<div>
			{renderSectionHeader("features")}
			<Section>
				<div className="flex flex-col gap-5">
					{/* Core features */}
					<div>
						<div className={settingsUi.groupLabel}>Agent</div>
						<div className={cn(settingsUi.card, "pt-2")} id="agent-features">
							{agentFeatures.map((feature) => (
								<div key={feature.id}>
									<FeatureRow
										checked={featureState[feature.stateKey]}
										description={feature.description}
										isVisible={featureVisibility[feature.stateKey] ?? true}
										key={feature.id}
										label={feature.label}
										onChange={(checked) =>
											feature.nestedKey === "enabled"
												? handleFeatureChange(feature, checked)
												: updateSetting(feature.settingKey, checked)
										}
									/>
									{feature.id === "focus-chain" &&
										featureState[feature.stateKey] && (
											<SettingsSlider
												label="Reminder Interval (1-10)"
												max={10}
												min={1}
												onChange={handleFocusChainIntervalChange}
												step={1}
												value={focusChainSettings?.remindAsiInterval || 6}
												valueWidth="w-6"
											/>
										)}
								</div>
							))}
						</div>
					</div>

					{/* Editor features */}
					<div>
						<div className={settingsUi.groupLabel}>Editor</div>
						<div className={cn(settingsUi.card, "pt-2")} id="optional-features">
							{editorFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={feature.description}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={feature.label}
									onChange={(checked) => handleFeatureChange(feature, checked)}
								/>
							))}
						</div>
					</div>

					{/* Experimental features */}
					<div>
						<div className={settingsUi.groupLabelWarning}>Experimental</div>
						<div
							className={cn(settingsUi.card, "w-full pt-2")}
							id="experimental-features"
						>
							{experimentalFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={feature.description}
									disabled={feature.id === "yolo" && isYoloRemoteLocked}
									isRemoteLocked={feature.id === "yolo" && isYoloRemoteLocked}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={feature.label}
									onChange={(checked) => handleFeatureChange(feature, checked)}
									remoteTooltip="This setting is managed by your organization's remote configuration"
								/>
							))}
						</div>
					</div>
				</div>

				{/* Advanced */}
				<div>
					<div className={settingsUi.groupLabel}>Advanced</div>
					<div className={settingsUi.card} id="advanced-features">
						<div className="space-y-3">
							{advancedFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={feature.description}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={feature.label}
									onChange={(checked) => handleFeatureChange(feature, checked)}
								/>
							))}

							{/* MCP Display Mode */}
							<div className="space-y-2">
								<Label className="text-sm font-medium text-foreground">
									MCP Display Mode
								</Label>
								<p className="text-xs text-muted-foreground">
									Controls how MCP responses are displayed
								</p>
								<Select
									onValueChange={(v) => updateSetting("mcpDisplayMode", v)}
									value={mcpDisplayMode}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="plain">Plain Text</SelectItem>
										<SelectItem value="rich">Rich Display</SelectItem>
										<SelectItem value="markdown">Markdown</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>
			</Section>
		</div>
	);
};
export default memo(FeatureSettingsSection);
