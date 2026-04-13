import { Button } from "@/components/ui/button"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import Section from "../Section"
import { settingsUi } from "../settingsUi"

interface DebugSectionProps {
	onResetState: (resetGlobalState?: boolean) => Promise<void>
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const DebugSection = ({ onResetState, renderSectionHeader }: DebugSectionProps) => {
	const { setShowWelcome } = useExtensionState()
	return (
		<div>
			{renderSectionHeader("debug")}
			<Section>
				<div className={`${settingsUi.stack} max-w-md`}>
					<div className={settingsUi.card}>
						<p className={`${settingsUi.hint} mb-4`}>
							Destructive actions — use only when troubleshooting extension state.
						</p>
						<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
							<Button onClick={() => onResetState()} variant="error">
								Reset workspace state
							</Button>
							<Button onClick={() => onResetState(true)} variant="error">
								Reset global state
							</Button>
						</div>
						<p className={`${settingsUi.hint} mt-4`}>
							Resets global state and secret storage for this extension.
						</p>
					</div>
					<div className={settingsUi.card}>
						<Button
							onClick={async () =>
								await StateServiceClient.setWelcomeViewCompleted({ value: false })
									.catch(() => {})
									.finally(() => setShowWelcome(true))
							}
							variant="secondary"
						>
							Reset onboarding
						</Button>
						<p className={`${settingsUi.hint} mt-3`}>Shows the welcome flow again on next open.</p>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default DebugSection
