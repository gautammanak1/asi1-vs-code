import { MicIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { getGlobalTTSService, stopGlobalTts } from "@/services/globalTts";
import { VoiceInputService } from "@/services/VoiceInputService";
import type { VoiceSettings } from "@/types/voice-settings";

const LANG_OPTIONS: { value: VoiceSettings["language"]; label: string }[] = [
	{ value: "auto", label: "Auto-detect" },
	{ value: "en", label: "English" },
	{ value: "hi", label: "हिंदी (Hindi)" },
	{ value: "es", label: "Spanish" },
	{ value: "fr", label: "French" },
	{ value: "de", label: "German" },
	{ value: "ja", label: "Japanese" },
	{ value: "zh", label: "Chinese" },
];

interface VoiceSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null;
}

const VoiceSettingsSection = ({ renderSectionHeader }: VoiceSettingsSectionProps) => {
	const { settings, update } = useVoiceSettings();
	const { apiConfiguration } = useExtensionState();
	const apiKey = apiConfiguration?.openAiApiKey ?? "";
	const [micStatus, setMicStatus] = useState<string>("unknown");

	const testMic = useCallback(async () => {
		const svc = new VoiceInputService();
		if (!svc.isSupported()) {
			setMicStatus("not supported");
			return;
		}
		const ok = await svc.requestPermission();
		svc.cleanup();
		setMicStatus(ok ? "granted" : "denied");
	}, []);

	const previewVoice = useCallback(
		(voice: VoiceSettings["ttsVoice"]) => {
			stopGlobalTts();
			const tts = getGlobalTTSService(apiKey);
			void tts.speak("Hello from Fetch Coder voice preview.", {
				voice,
				speed: settings.ttsSpeed,
			});
		},
		[apiKey, settings.ttsSpeed],
	);

	return (
		<div>
			{renderSectionHeader("voice")}
			<div className="flex flex-col gap-4 p-4 text-sm">
				<div className="flex items-center gap-2 text-(--vscode-foreground)">
					<MicIcon className="w-4" />
					<span className="font-semibold">Voice & speech</span>
				</div>

				<section className="space-y-2">
					<div className="font-medium">Microphone</div>
					<p className="text-(--vscode-descriptionForeground) text-xs m-0">
						Status: {micStatus === "unknown" ? "Not tested" : micStatus}
					</p>
					<button
						className="rounded border border-(--vscode-button-border) bg-(--vscode-button-secondaryBackground) px-3 py-1 text-(--vscode-button-secondaryForeground)"
						onClick={() => void testMic()}
						type="button"
					>
						Test microphone
					</button>
				</section>

				<section className="space-y-2">
					<label className="font-medium" htmlFor="vc-lang">
						Language
					</label>
					<select
						className="max-w-xs rounded border border-(--vscode-panel-border) bg-(--vscode-input-background) px-2 py-1"
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
				</section>

				<section className="space-y-2">
					<div className="font-medium">Transcription</div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							checked={settings.transcriptionMethod === "asi1"}
							name="tx"
							onChange={() => update({ transcriptionMethod: "asi1" })}
							type="radio"
						/>
						ASI1 API (Whisper)
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							checked={settings.transcriptionMethod === "browser"}
							name="tx"
							onChange={() => update({ transcriptionMethod: "browser" })}
							type="radio"
						/>
						Browser (offline)
					</label>
				</section>

				<section className="space-y-2">
					<div className="font-medium">Input mode</div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							checked={settings.inputMode === "click"}
							name="im"
							onChange={() => update({ inputMode: "click" })}
							type="radio"
						/>
						Click mic to start / stop
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							checked={settings.inputMode === "hold"}
							name="im"
							onChange={() => update({ inputMode: "hold" })}
							type="radio"
						/>
						Hold Space in chat (release to send)
					</label>
				</section>

				<section className="space-y-2">
					<label className="font-medium" htmlFor="vc-speed">
						TTS speed: {settings.ttsSpeed.toFixed(2)}x
					</label>
					<input
						id="vc-speed"
						max={2}
						min={0.5}
						onChange={(e) => update({ ttsSpeed: Number(e.target.value) })}
						step={0.05}
						type="range"
						value={settings.ttsSpeed}
					/>
					<div className="flex flex-wrap gap-2">
						{(
							["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const
						).map((v) => (
							<button
								className="rounded border border-(--vscode-panel-border) px-2 py-0.5 text-xs hover:bg-(--vscode-list-hoverBackground)"
								key={v}
								onClick={() => previewVoice(v)}
								type="button"
							>
								Play {v}
							</button>
						))}
					</div>
				</section>

				<section className="space-y-2">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							checked={settings.autoReadAi}
							onChange={(e) => update({ autoReadAi: e.target.checked })}
							type="checkbox"
						/>
						Auto-read AI responses
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							checked={settings.autoReadCodeBlocks}
							onChange={(e) => update({ autoReadCodeBlocks: e.target.checked })}
							type="checkbox"
						/>
						Include code blocks in auto-read
					</label>
				</section>

				<p className="text-xs text-(--vscode-descriptionForeground) m-0">
					Shortcut: ⌘⇧V / Ctrl+Shift+V in chat toggles auto-read.
				</p>
			</div>
		</div>
	);
};

export default VoiceSettingsSection;
