import type { ExtensionMessage } from "@shared/ExtensionMessage";
import { ResetStateRequest } from "@shared/proto/Asi/state";
import { UserOrganization } from "@shared/proto/index.Asi";
import {
	CheckCheck,
	FlaskConical,
	HardDriveDownload,
	Info,
	Mic,
	type LucideIcon,
	SlidersHorizontal,
	SquareMousePointer,
	SquareTerminal,
	Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useEvent } from "react-use";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAsiAuth } from "@/context/AsiAuthContext";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { StateServiceClient } from "@/services/grpc-client";
import { isAdminOrOwner } from "../account/helpers";
import { Tab, TabContent, TabList, TabTrigger } from "../common/Tab";
import ViewHeader from "../common/ViewHeader";
import SectionHeader from "./SectionHeader";
import { settingsUi } from "./settingsUi";
import AboutSection from "./sections/AboutSection";
import ApiConfigurationSection from "./sections/ApiConfigurationSection";
import BrowserSettingsSection from "./sections/BrowserSettingsSection";
import DebugSection from "./sections/DebugSection";
import FeatureSettingsSection from "./sections/FeatureSettingsSection";
import GeneralSettingsSection from "./sections/GeneralSettingsSection";
import VoiceSettingsSection from "./sections/VoiceSettingsSection";
import { RemoteConfigSection } from "./sections/RemoteConfigSection";
import TerminalSettingsSection from "./sections/TerminalSettingsSection";

const IS_DEV = process.env.IS_DEV;

// Tab definitions
type SettingsTabID =
	| "api-config"
	| "features"
	| "browser"
	| "terminal"
	| "general"
	| "voice"
	| "about"
	| "debug"
	| "remote-config";
interface SettingsTab {
	id: SettingsTabID;
	name: string;
	tooltipText: string;
	headerText: string;
	icon: LucideIcon;
	hidden?: (params?: {
		activeOrganization: UserOrganization | null;
	}) => boolean;
}

export const SETTINGS_TABS: SettingsTab[] = [
	{
		id: "api-config",
		name: "API Configuration",
		tooltipText: "API Configuration",
		headerText: "API Configuration",
		icon: SlidersHorizontal,
	},
	{
		id: "features",
		name: "Features",
		tooltipText: "Feature Settings",
		headerText: "Feature Settings",
		icon: CheckCheck,
	},
	{
		id: "browser",
		name: "Browser",
		tooltipText: "Browser Settings",
		headerText: "Browser Settings",
		icon: SquareMousePointer,
	},
	{
		id: "terminal",
		name: "Terminal",
		tooltipText: "Terminal Settings",
		headerText: "Terminal Settings",
		icon: SquareTerminal,
	},
	{
		id: "general",
		name: "General",
		tooltipText: "General Settings",
		headerText: "General Settings",
		icon: Wrench,
	},
	{
		id: "voice",
		name: "Voice",
		tooltipText: "Voice & speech",
		headerText: "Voice & speech",
		icon: Mic,
	},
	{
		id: "remote-config",
		name: "Remote Config",
		tooltipText: "Remotely configured fields",
		headerText: "Remote Config",
		icon: HardDriveDownload,
		hidden: ({ activeOrganization } = { activeOrganization: null }) =>
			!activeOrganization || !isAdminOrOwner(activeOrganization),
	},
	{
		id: "about",
		name: "About",
		tooltipText: "About Asi",
		headerText: "About",
		icon: Info,
	},
	// Only show in dev mode
	{
		id: "debug",
		name: "Debug",
		tooltipText: "Debug Tools",
		headerText: "Debug",
		icon: FlaskConical,
		hidden: () => !IS_DEV,
	},
];

type SettingsViewProps = {
	onDone: () => void;
	targetSection?: string;
};

// Helper to render section header - moved outside component for better performance
const renderSectionHeader = (tabId: string) => {
	const tab = SETTINGS_TABS.find((t) => t.id === tabId);
	if (!tab) {
		return null;
	}

	return (
		<SectionHeader>
			<tab.icon className="h-4 w-4 shrink-0 opacity-90" />
			<span>{tab.headerText}</span>
		</SectionHeader>
	);
};

const SettingsView = ({ onDone, targetSection }: SettingsViewProps) => {
	// Memoize to avoid recreation
	const TAB_CONTENT_MAP: Record<SettingsTabID, React.FC<any>> = useMemo(
		() => ({
			"api-config": ApiConfigurationSection,
			general: GeneralSettingsSection,
			voice: VoiceSettingsSection,
			features: FeatureSettingsSection,
			browser: BrowserSettingsSection,
			terminal: TerminalSettingsSection,
			"remote-config": RemoteConfigSection,
			about: AboutSection,
			debug: DebugSection,
		}),
		[],
	); // Empty deps - these imports never change

	const { version, environment, settingsInitialModelTab } = useExtensionState();
	const { activeOrganization } = useAsiAuth();

	const [activeTab, setActiveTab] = useState<string>(
		targetSection || SETTINGS_TABS[0].id,
	);

	// Optimized message handler with early returns
	const handleMessage = useCallback((event: MessageEvent) => {
		const message: ExtensionMessage = event.data;
		if (message.type !== "grpc_response") {
			return;
		}

		const grpcMessage = message.grpc_response?.message;
		if (grpcMessage?.key !== "scrollToSettings") {
			return;
		}

		const tabId = grpcMessage.value;
		if (!tabId) {
			return;
		}

		// Check if valid tab ID
		if (SETTINGS_TABS.some((tab) => tab.id === tabId)) {
			setActiveTab(tabId);
			return;
		}

		// Fallback to element scrolling
		requestAnimationFrame(() => {
			const element = document.getElementById(tabId);
			if (!element) {
				return;
			}

			element.scrollIntoView({ behavior: "smooth" });
			element.style.transition = "background-color 0.5s ease";
			element.style.backgroundColor = "var(--vscode-textPreformat-background)";

			setTimeout(() => {
				element.style.backgroundColor = "transparent";
			}, 1200);
		});
	}, []);

	useEvent("message", handleMessage);

	// Memoized reset state handler
	const handleResetState = useCallback(async (resetGlobalState?: boolean) => {
		try {
			await StateServiceClient.resetState(
				ResetStateRequest.create({ global: resetGlobalState }),
			);
		} catch (error) {
			console.error("Failed to reset state:", error);
		}
	}, []);

	// Update active tab when targetSection changes
	useEffect(() => {
		if (targetSection) {
			setActiveTab(targetSection);
		}
	}, [targetSection]);

	// Memoized tab item renderer
	const renderTabItem = useCallback(
		(tab: (typeof SETTINGS_TABS)[0]) => {
			return (
				<TabTrigger
					className="flex justify-baseline"
					data-testid={`tab-${tab.id}`}
					key={tab.id}
					value={tab.id}
				>
					<Tooltip key={tab.id}>
						<TooltipTrigger>
							<div
								className={cn(
									"box-border flex h-11 cursor-pointer items-center gap-2 overflow-hidden whitespace-nowrap sm:h-auto sm:min-h-11 sm:py-0",
									activeTab === tab.id
										? settingsUi.sidebarNavActive
										: settingsUi.sidebarNavInactive,
								)}
							>
								<tab.icon className="h-4 w-4 shrink-0" />
								<span className="hidden sm:block">{tab.name}</span>
							</div>
						</TooltipTrigger>
						<TooltipContent side="right">{tab.tooltipText}</TooltipContent>
					</Tooltip>
				</TabTrigger>
			);
		},
		[activeTab],
	);

	// Memoized active content component
	const ActiveContent = useMemo(() => {
		const Component =
			TAB_CONTENT_MAP[activeTab as keyof typeof TAB_CONTENT_MAP];
		if (!Component) {
			return null;
		}

		// Special props for specific components
		const props: any = { renderSectionHeader };
		if (activeTab === "debug") {
			props.onResetState = handleResetState;
		} else if (activeTab === "about") {
			props.version = version;
		} else if (activeTab === "api-config") {
			props.initialModelTab = settingsInitialModelTab;
		}

		return <Component {...props} />;
	}, [activeTab, handleResetState, settingsInitialModelTab, version]);

	return (
		<Tab>
			<ViewHeader environment={environment} onDone={onDone} title="Settings" />

			<div className="flex min-h-0 flex-1 overflow-hidden bg-(--vscode-editor-background)">
				<TabList
					className="shrink-0 flex flex-col overflow-y-auto border-r border-(--vscode-widget-border) bg-(--vscode-sideBar-background)/35 py-2"
					onValueChange={setActiveTab}
					value={activeTab}
				>
					{SETTINGS_TABS.filter(
						(tab) => !tab.hidden?.({ activeOrganization }),
					).map(renderTabItem)}
				</TabList>

				<TabContent className="min-w-0 flex-1 overflow-auto bg-(--vscode-editor-background)">
					{ActiveContent}
				</TabContent>
			</div>
		</Tab>
	);
};

export default SettingsView;
