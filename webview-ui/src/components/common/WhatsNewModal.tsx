import { BannerAction, BannerCardData } from "@shared/asi/banner"
import React, { useCallback } from "react"
import { useMount } from "react-use"
import WhatsNewItems from "@/components/common/WhatsNewItems"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useApiConfigurationHandlers } from "../settings/utils/useApiConfigurationHandlers"

interface WhatsNewModalProps {
	open: boolean
	onClose: () => void
	version: string
	welcomeBanners?: BannerCardData[]
	onBannerAction?: (action: BannerAction) => void
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ open, onClose, version, welcomeBanners, onBannerAction }) => {
	const { openRouterModels, refreshOpenRouterModels, navigateToSettingsModelPicker } = useExtensionState()
	const { handleFieldsChange } = useApiConfigurationHandlers()

	// Get latest model list in case user hits shortcut button to set model
	useMount(refreshOpenRouterModels)

	const navigateToModelPicker = useCallback(
		(initialModelTab: "recommended" | "free", modelId?: string) => {
			// Switch to Asi provider first so the model picker tab works
			// Optionally also set the model if provided
			const updates: Record<string, any> = {
				planModeApiProvider: "Asi",
				actModeApiProvider: "Asi",
			}
			if (modelId) {
				updates.planModeOpenRouterModelId = modelId
				updates.actModeOpenRouterModelId = modelId
				updates.planModeOpenRouterModelInfo = openRouterModels[modelId]
				updates.actModeOpenRouterModelInfo = openRouterModels[modelId]
			}
			handleFieldsChange(updates)
			onClose()
			navigateToSettingsModelPicker({ targetSection: "api-config", initialModelTab })
		},
		[handleFieldsChange, navigateToSettingsModelPicker, onClose, openRouterModels],
	)

	const inlineCodeStyle: React.CSSProperties = {
		backgroundColor: "var(--vscode-textCodeBlock-background)",
		padding: "2px 6px",
		borderRadius: "3px",
		fontFamily: "var(--vscode-editor-font-family)",
		fontSize: "0.9em",
	}

	return (
		<Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
			<DialogContent
				aria-describedby="whats-new-description"
				aria-labelledby="whats-new-title"
				className="pt-5 px-5 pb-4 gap-0">
				<div id="whats-new-description">
				<h2
					className="text-lg font-semibold mb-3 pr-6"
					id="whats-new-title"
					style={{ color: "var(--vscode-editor-foreground)" }}>
					New in v{version}
				</h2>

					<WhatsNewItems
						inlineCodeStyle={inlineCodeStyle}
						onBannerAction={onBannerAction}
						onClose={onClose}
						onNavigateToModelPicker={navigateToModelPicker}
						welcomeBanners={welcomeBanners}
					/>

				
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default WhatsNewModal
