import type { Boolean, EmptyRequest } from "@shared/proto/Asi/common";
import { useCallback, useEffect } from "react";
import AccountView from "./components/account/AccountView";
import ChatView from "./components/chat/ChatView";
import CheckpointPanel from "./components/checkpoint/CheckpointPanel";
// Kanban promo modal removed — ASI:One-focused UX.
import HistoryView from "./components/history/HistoryView";
import McpView from "./components/mcp/configuration/McpConfigurationView";
import OnboardingView from "./components/onboarding/OnboardingView";
import SettingsView from "./components/settings/SettingsView";
import WelcomeView from "./components/welcome/WelcomeView";
import WorktreesView from "./components/worktrees/WorktreesView";
import { useExtensionState } from "./context/ExtensionStateContext";
import { Providers } from "./Providers";
import { UiServiceClient } from "./services/grpc-client";

const AppContent = () => {
	const {
		didHydrateState,
		showWelcome,
		shouldShowAnnouncement,
		showMcp,
		mcpTab,
		showSettings,
		settingsTargetSection,
		showHistory,
		showWorktrees,
		showCheckpoints,
		showAccount,
		showAnnouncement,
		onboardingModels,
		setShowAnnouncement,
		setShouldShowAnnouncement,
		closeMcpView,
		navigateToHistory,
		hideSettings,
		hideHistory,
		hideWorktrees,
		hideCheckpoints,
		hideAccount,
		hideAnnouncement,
	} = useExtensionState();

	const showUpdateAnnouncementModal = useCallback(() => {
		setShowAnnouncement(true);
		UiServiceClient.onDidShowAnnouncement({} as EmptyRequest)
			.then((response: Boolean) => {
				setShouldShowAnnouncement(response.value);
			})
			.catch((error) => {
				console.error("Failed to acknowledge announcement:", error);
			});
	}, [setShouldShowAnnouncement, setShowAnnouncement]);

	// No Kanban modal: show update announcement when applicable (nothing blocking).
	useEffect(() => {
		if (
			!didHydrateState ||
			showWelcome ||
			!shouldShowAnnouncement ||
			showAnnouncement
		) {
			return;
		}
		showUpdateAnnouncementModal();
	}, [
		didHydrateState,
		showWelcome,
		shouldShowAnnouncement,
		showAnnouncement,
		showUpdateAnnouncementModal,
	]);

	if (!didHydrateState) {
		return null;
	}

	if (showWelcome) {
		return onboardingModels ? (
			<OnboardingView onboardingModels={onboardingModels} />
		) : (
			<WelcomeView />
		);
	}

	return (
		<div className="fetch-coder-webview-root flex h-screen w-full flex-col">
			{showSettings && (
				<SettingsView
					onDone={hideSettings}
					targetSection={settingsTargetSection}
				/>
			)}
			{showHistory && <HistoryView onDone={hideHistory} />}
			{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
			{showWorktrees && <WorktreesView onDone={hideWorktrees} />}
			{showAccount && <AccountView onDone={hideAccount} />}
			{showCheckpoints && <CheckpointPanel onDone={hideCheckpoints} />}
			{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
			<ChatView
				hideAnnouncement={hideAnnouncement}
				isHidden={
					showSettings ||
					showHistory ||
					showMcp ||
					showWorktrees ||
					showAccount ||
					showCheckpoints
				}
				showAnnouncement={showAnnouncement}
				showHistoryView={navigateToHistory}
			/>
		</div>
	);
};

const App = () => {
	return (
		<Providers>
			<AppContent />
		</Providers>
	);
};

export default App;
