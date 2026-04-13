import { useCallback, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useVoiceSettings } from "@/hooks/useVoiceSettings"
import { getGlobalTTSService, stopGlobalTts } from "@/services/globalTts"
import { VoiceInputService } from "@/services/VoiceInputService"
import type { VoiceSettings } from "@/types/voice-settings"
import { cn } from "@/lib/utils"
import Section from "../Section"
import { settingsUi } from "../settingsUi"

const LANG_OPTIONS: { value: VoiceSettings["language"]; label: string }[] = [
	{ value: "auto", label: "Auto-detect" },
	{ value: "en", label: "English" },
	{ value: "hi", label: "हिंदी (Hindi)" },
	{ value: "es", label: "Spanish" },
	{ value: "fr", label: "French" },
	{ value: "de", label: "German" },
	{ value: "ja", label: "Japanese" },
	{ value: "zh", label: "Chinese" },
]

interface VoiceSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const VoiceSettingsSection = ({ renderSectionHeader }: VoiceSettingsSectionProps) => {
	const { settings, update } = useVoiceSettings()
	const { apiConfiguration } = useExtensionState()
	const apiKey = apiConfiguration?.openAiApiKey ?? ""
	const [micStatus, setMicStatus] = useState<string>("unknown")

	const testMic = useCallback(async () => {
		const svc = new VoiceInputService()
		if (!svc.isSupported()) {
			setMicStatus("not supported")
			return
		}
		const ok = await svc.requestPermission()
		svc.cleanup()
		setMicStatus(ok ? "granted" : "denied")
	}, [])

	const previewVoice = useCallback(
		(voice: VoiceSettings["ttsVoice"]) => {
			stopGlobalTts()
			const tts = getGlobalTTSService(apiKey)
			void tts.speak("Hello from Fetch Coder voice preview.", {
				voice,
				speed: settings.ttsSpeed,
			})
		},
		[apiKey, settings.ttsSpeed],
	)

	return (
		<div>
			{renderSectionHeader("voice")}
			<Section>
				<div className={settingsUi.stack}>
					<div className={settingsUi.card}>
						<div className={cn(settingsUi.groupLabel, "!mb-2")}>Microphone</div>
						<p className={`${settingsUi.hint} mb-3`}>
							Status: {micStatus === "unknown" ? "Not tested" : micStatus}
						</p>
						<button
							className="rounded-lg border border-(--vscode-button-border) bg-(--vscode-button-secondaryBackground) px-3 py-1.5 text-[13px] text-(--vscode-button-secondaryForeground) transition-colors hover:bg-(--vscode-button-secondaryHoverBackground)"
							onClick={() => void testMic()}
							type="button"
						>
							Test microphone
						</button>
					</div>

					<div className={settingsUi.card}>
						<label className={settingsUi.formLabel} htmlFor="vc-lang">
							Language
						</label>
						<select
							className="max-w-md rounded-lg border border-(--vscode-widget-border) bg-(--vscode-input-background) px-3 py-2 text-[13px] text-(--vscode-foreground)"
							id="vc-lang"
							onChange={(e) =>
								update({
									language: e.target.value as VoiceSettings["language"],
								})
							}
							value={settings.language}
						>
							{LANG_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>

					<div className={settingsUi.card}>
						<div className={cn(settingsUi.groupLabel, "!mb-2")}>Transcription</div>
						<label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
							<input
								checked={settings.transcriptionMethod === "asi1"}
								name="tx"
								onChange={() => update({ transcriptionMethod: "asi1" })}
								type="radio"
							/>
							ASI1 API (Whisper)
						</label>
						<label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
							<input
								checked={settings.transcriptionMethod === "browser"}
								name="tx"
								onChange={() => update({ transcriptionMethod: "browser" })}
								type="radio"
							/>
							Browser (offline)
						</label>
					</div>

					<div className={settingsUi.card}>
						<div className={cn(settingsUi.groupLabel, "!mb-2")}>Input mode</div>
						<label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
							<input
								checked={settings.inputMode === "click"}
								name="im"
								onChange={() => update({ inputMode: "click" })}
								type="radio"
							/>
							Click mic to start / stop
						</label>
						<label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
							<input
								checked={settings.inputMode === "hold"}
								name="im"
								onChange={() => update({ inputMode: "hold" })}
								type="radio"
							/>
							Hold Space in chat (release to send)
						</label>
					</div>

					<div className={settingsUi.card}>
						<label className={settingsUi.formLabel} htmlFor="vc-speed">
							TTS speed: {settings.ttsSpeed.toFixed(2)}x
						</label>
						<input
							className="w-full accent-(--vscode-focusBorder)"
							id="vc-speed"
							max={2}
							min={0.5}
							onChange={(e) => update({ ttsSpeed: Number(e.target.value) })}
							step={0.05}
							type="range"
							value={settings.ttsSpeed}
						/>
						<div className="mt-3 flex flex-wrap gap-2">
							{(["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const).map((v) => (
								<button
									className="rounded-lg border border-(--vscode-widget-border) px-2.5 py-1 text-xs transition-colors hover:bg-(--vscode-list-hoverBackground)"
									key={v}
									onClick={() => previewVoice(v)}
									type="button"
								>
									Play {v}
								</button>
							))}
						</div>
					</div>

					<div className={settingsUi.card}>
						<div className={cn(settingsUi.groupLabel, "!mb-2")}>Auto-read</div>
						<label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
							<input
								checked={settings.autoReadAi}
								onChange={(e) => update({ autoReadAi: e.target.checked })}
								type="checkbox"
							/>
							Auto-read AI responses
						</label>
						<label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
							<input
								checked={settings.autoReadCodeBlocks}
								onChange={(e) => update({ autoReadCodeBlocks: e.target.checked })}
								type="checkbox"
							/>
							Include code blocks in auto-read
						</label>
					</div>

					<p className={settingsUi.hint}>
						Shortcut: ⌘⇧V / Ctrl+Shift+V in chat toggles auto-read.
					</p>
				</div>
			</Section>
		</div>
	)
}

export default VoiceSettingsSection
