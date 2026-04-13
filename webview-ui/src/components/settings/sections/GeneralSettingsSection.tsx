import { VSCodeCheckbox, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import PreferredLanguageSetting from "../PreferredLanguageSetting"
import Section from "../Section"
import { settingsUi } from "../settingsUi"
import { updateSetting } from "../utils/settingsHandlers"

interface GeneralSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const GeneralSettingsSection = ({ renderSectionHeader }: GeneralSettingsSectionProps) => {
	const { telemetrySetting, remoteConfigSettings } = useExtensionState()

	return (
		<div>
			{renderSectionHeader("general")}
			<Section>
				<div className={settingsUi.stack}>
					<div className={settingsUi.card}>
						<PreferredLanguageSetting />
					</div>

					<div className={settingsUi.card}>
						<Tooltip>
							<TooltipContent hidden={remoteConfigSettings?.telemetrySetting === undefined}>
								This setting is managed by your organization&apos;s remote configuration
							</TooltipContent>
							<TooltipTrigger asChild>
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2">
										<VSCodeCheckbox
											checked={telemetrySetting !== "disabled"}
											disabled={remoteConfigSettings?.telemetrySetting === "disabled"}
											onChange={(e: any) => {
												const checked = e.target.checked === true
												updateSetting("telemetrySetting", checked ? "enabled" : "disabled")
											}}
										>
											Allow error and usage reporting
										</VSCodeCheckbox>
										{!!remoteConfigSettings?.telemetrySetting && (
											<i className="codicon codicon-lock text-description text-sm" />
										)}
									</div>
									<p className={settingsUi.hint}>
										Help improve Asi by sending usage data and error reports. No code, prompts, or personal
										information are ever sent. See our{" "}
										<VSCodeLink
											className="text-inherit"
											href="https://docs.fetch.ai/more-info/telemetry"
											style={{ fontSize: "inherit", textDecoration: "underline" }}
										>
											telemetry overview
										</VSCodeLink>{" "}
										and{" "}
										<VSCodeLink
											className="text-inherit"
											href="https://fetch.ai/privacy"
											style={{ fontSize: "inherit", textDecoration: "underline" }}
										>
											privacy policy
										</VSCodeLink>{" "}
										for more details.
									</p>
								</div>
							</TooltipTrigger>
						</Tooltip>
					</div>
				</div>
			</Section>
		</div>
	)
}

export default GeneralSettingsSection
