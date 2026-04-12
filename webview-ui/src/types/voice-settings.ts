/** Persisted voice / speech preferences (webview localStorage). */
export type TranscriptionMethod = "asi1" | "browser";

export type TTSVoiceName = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export type VoiceInputMode = "click" | "hold";

export interface VoiceSettings {
	transcriptionMethod: TranscriptionMethod;
	ttsVoice: TTSVoiceName;
	ttsSpeed: number;
	autoReadAi: boolean;
	autoReadCodeBlocks: boolean;
	/** UI / STT language preset */
	language: "auto" | "en" | "hi" | "es" | "fr" | "de" | "ja" | "zh";
	inputMode: VoiceInputMode;
}

const STORAGE_KEY = "fetchCoder.voiceSettings.v1";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
	transcriptionMethod: "asi1",
	ttsVoice: "nova",
	ttsSpeed: 1,
	autoReadAi: false,
	autoReadCodeBlocks: false,
	language: "auto",
	inputMode: "click",
};

export function loadVoiceSettings(): VoiceSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return { ...DEFAULT_VOICE_SETTINGS };
		}
		const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
		return { ...DEFAULT_VOICE_SETTINGS, ...parsed };
	} catch {
		return { ...DEFAULT_VOICE_SETTINGS };
	}
}

export function saveVoiceSettings(settings: VoiceSettings): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		window.dispatchEvent(new CustomEvent("fetchCoder:voiceSettingsChanged", { detail: settings }));
	} catch {
		// ignore quota
	}
}

/** Whisper / Web Speech language codes */
export function resolveSpeechLanguage(settings: VoiceSettings): {
	whisper?: string;
	webSpeech: string;
	label: string;
} {
	if (settings.language === "auto") {
		const nav = navigator.language || "en-US";
		const short = nav.split("-")[0]?.toLowerCase() || "en";
		const map: Record<string, string> = {
			hi: "hi-IN",
			en: "en-US",
			es: "es-ES",
			fr: "fr-FR",
			de: "de-DE",
			ja: "ja-JP",
			zh: "zh-CN",
		};
		const webSpeech = map[short] || nav;
		return {
			whisper: short === "en" ? undefined : short,
			webSpeech,
			label: short === "hi" ? "हिंदी" : short.toUpperCase(),
		};
	}
	const table: Record<Exclude<VoiceSettings["language"], "auto">, { whisper?: string; webSpeech: string; label: string }> = {
		en: { whisper: "en", webSpeech: "en-US", label: "English" },
		hi: { whisper: "hi", webSpeech: "hi-IN", label: "हिंदी" },
		es: { whisper: "es", webSpeech: "es-ES", label: "ES" },
		fr: { whisper: "fr", webSpeech: "fr-FR", label: "FR" },
		de: { whisper: "de", webSpeech: "de-DE", label: "DE" },
		ja: { whisper: "ja", webSpeech: "ja-JP", label: "JA" },
		zh: { whisper: "zh", webSpeech: "zh-CN", label: "中文" },
	};
	return table[settings.language];
}
