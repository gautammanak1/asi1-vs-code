import { name, publisher, version } from "../package.json";
import { HostProvider } from "./hosts/host-provider";

/**
 * VS Code command IDs contributed in package.json use the fixed prefix `Asi.` (e.g. `Asi.openAiChat`).
 * Registration must use the same prefix even when package `name` is renamed; otherwise keybindings and
 * the command palette resolve `Asi.*` but the extension registers `<name>.*` → "command not found".
 */
const COMMAND_PREFIX = "Asi";

/**
 * List of commands — must match `contributes.commands` in package.json.
 */
const AsiCommands = {
	PlusButton: COMMAND_PREFIX + ".plusButtonClicked",
	McpButton: COMMAND_PREFIX + ".mcpButtonClicked",
	SettingsButton: COMMAND_PREFIX + ".settingsButtonClicked",
	HistoryButton: COMMAND_PREFIX + ".historyButtonClicked",
	WorktreesButton: COMMAND_PREFIX + ".worktreesButtonClicked",
	TerminalOutput: COMMAND_PREFIX + ".addTerminalOutputToChat",
	AddToChat: COMMAND_PREFIX + ".addToChat",
	AttachFileToChat: COMMAND_PREFIX + ".attachFileToChat",
	FixWithAsi: COMMAND_PREFIX + ".fixWithAsi",
	ExplainCode: COMMAND_PREFIX + ".explainCode",
	ImproveCode: COMMAND_PREFIX + ".improveCode",
	RefactorCode: COMMAND_PREFIX + ".refactorCode",
	FocusChatInput: COMMAND_PREFIX + ".focusChatInput",
	OpenAiChat: COMMAND_PREFIX + ".openAiChat",
	Walkthrough: COMMAND_PREFIX + ".openWalkthrough",
	GenerateCommit: COMMAND_PREFIX + ".generateGitCommitMessage",
	AbortCommit: COMMAND_PREFIX + ".abortGitCommitMessage",
	ReconstructTaskHistory: COMMAND_PREFIX + ".reconstructTaskHistory",
	// Jupyter Notebook commands
	JupyterGenerateCell: COMMAND_PREFIX + ".jupyterGenerateCell",
	JupyterExplainCell: COMMAND_PREFIX + ".jupyterExplainCell",
	JupyterImproveCell: COMMAND_PREFIX + ".jupyterImproveCell",
	OpenCheckpoints: COMMAND_PREFIX + ".openCheckpoints",
	SaveCheckpoint: COMMAND_PREFIX + ".saveCheckpoint",
	RevertLast: COMMAND_PREFIX + ".revertLast",
	ClearCheckpoints: COMMAND_PREFIX + ".clearCheckpoints",
};

/**
 * IDs for the views registered by the extension.
 * These should match the name + view IDs defined in package.json.
 */
const AsiViewIds = {
	Sidebar: name + ".SidebarProvider",
};

/**
 * The registry info for the extension, including its ID, name, version, commands, and views
 * registered for the current host.
 */
export const ExtensionRegistryInfo = {
	id: publisher + "." + name,
	name,
	version,
	publisher,
	commands: AsiCommands,
	views: AsiViewIds,
};

export interface HostInfo {
	/**
	 * The name of the host platform, e.g VSCode, IntelliJ Ultimate Edition, etc.
	 */
	platform: string;
	/**
	 * The operating system platform, e.g. linux, darwin, win32
	 */
	os: string;
	/**
	 * The type of the Asi host environment, e.g. 'VSCode Extension', 'Asi for JetBrains', 'CLI'
	 * This is different from the platform because there are many JetBrains IDEs, but they all use the same
	 * plugin.
	 */
	ide: string;
	/**
	 * A distinct ID for this installation of the host client
	 */
	distinctId: string;
	/**
	 * The version of the host platform, e.g. 1.103.0 for VSCode, or 2025.1.1.1 for JetBrains IDEs.
	 */
	hostVersion?: string;
	/**
	 * The version of Asi that the host client is running
	 */
	extensionVersion: string;
}

let hostInfo = null as HostInfo | null;

export const HostRegistryInfo = {
	init: async (distinctId: string) => {
		const host = await HostProvider.env.getHostVersion({});
		const hostVersion = host.version;
		const extensionVersion = host.clineVersion || ExtensionRegistryInfo.version;
		const platform = host.platform || "unknown";
		const os = process.platform || "unknown";
		const ide = host.clineType || "unknown";
		hostInfo = { hostVersion, extensionVersion, platform, os, ide, distinctId };
	},
	get: () => hostInfo,
};
