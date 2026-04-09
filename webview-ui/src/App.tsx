import type { Boolean, EmptyRequest } from "@shared/proto/asi/common"
import { useCallback, useEffect } from "react"
import ChatView from "./components/chat/ChatView"
// Kanban promo modal disabled for POC (ASI:One focus — no extra modal on startup).
// import AsiKanbanLaunchModal, { Asi_KANBAN_MODAL_DISMISS_ID } from "./components/common/AsiKanbanLaunchModal"
import HistoryView from "./components/history/HistoryView"
import McpView from "./components/mcp/configuration/McpConfigurationView"
import OnboardingView from "./components/onboarding/OnboardingView"
import SettingsView from "./components/settings/SettingsView"
import AccountView from "./components/account/AccountView"
import WelcomeView from "./components/welcome/WelcomeView"
import WorktreesView from "./components/worktrees/WorktreesView"
import { useExtensionState } from "./context/ExtensionStateContext"
import { Providers } from "./Providers"
import { UiServiceClient } from "./services/grpc-client"

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
		hideAccount,
		hideAnnouncement,
	} = useExtensionState()

	const showUpdateAnnouncementModal = useCallback(() => {
		setShowAnnouncement(true)
		UiServiceClient.onDidShowAnnouncement({} as EmptyRequest)
			.then((response: Boolean) => {
				setShouldShowAnnouncement(response.value)
			})
			.catch((error) => {
				console.error("Failed to acknowledge announcement:", error)
			})
	}, [setShouldShowAnnouncement, setShowAnnouncement])

	// No Kanban modal: show update announcement when applicable (nothing blocking).
	useEffect(() => {
		if (!didHydrateState || showWelcome || !shouldShowAnnouncement || showAnnouncement) {
			return
		}
		showUpdateAnnouncementModal()
	}, [didHydrateState, showWelcome, shouldShowAnnouncement, showAnnouncement, showUpdateAnnouncementModal])

	/*
	const [showKanbanModal, setShowKanbanModal] = useState(false)
	const [hasShownKanbanModal, setHasShownKanbanModal] = useState(false)
	useEffect(() => {
		if (!didHydrateState || showWelcome || hasShownKanbanModal) return
		const hasDismissedKanbanModal = dismissedBanners?.some((b) => b.bannerId === Asi_KANBAN_MODAL_DISMISS_ID)
		if (!hasDismissedKanbanModal) setShowKanbanModal(true)
		setHasShownKanbanModal(true)
	}, [didHydrateState, dismissedBanners, hasShownKanbanModal, showWelcome])
	const handleCloseKanbanModal = useCallback((doNotShowAgain: boolean) => {
		setShowKanbanModal(false)
		if (doNotShowAgain) {
			StateServiceClient.dismissBanner({ value: Asi_KANBAN_MODAL_DISMISS_ID }).catch(console.error)
		}
	}, [])
	<AsiKanbanLaunchModal onClose={handleCloseKanbanModal} open={showKanbanModal} />
	*/

	if (!didHydrateState) {
		return null
	}

	if (showWelcome) {
		return onboardingModels ? <OnboardingView onboardingModels={onboardingModels} /> : <WelcomeView />
	}

	return (
		<div className="flex h-screen w-full flex-col">
			{showSettings && <SettingsView onDone={hideSettings} targetSection={settingsTargetSection} />}
			{showHistory && <HistoryView onDone={hideHistory} />}
			{showMcp && <McpView initialTab={mcpTab} onDone={closeMcpView} />}
			{showWorktrees && <WorktreesView onDone={hideWorktrees} />}
			{showAccount && <AccountView onDone={hideAccount} />}
			{/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
			<ChatView
				hideAnnouncement={hideAnnouncement}
				isHidden={showSettings || showHistory || showMcp || showWorktrees || showAccount}
				showAnnouncement={showAnnouncement}
				showHistoryView={navigateToHistory}
			/>
		</div>
	)
}

const App = () => {
	return (
		<Providers>
			<AppContent />
		</Providers>
	)
}

export default App
