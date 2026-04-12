import { useCallback, useEffect, useState } from "react";
import {
	type VoiceSettings,
	loadVoiceSettings,
	saveVoiceSettings,
} from "@/types/voice-settings";

export function useVoiceSettings(): {
	settings: VoiceSettings;
	update: (partial: Partial<VoiceSettings>) => void;
	replace: (next: VoiceSettings) => void;
} {
	const [settings, setSettings] = useState<VoiceSettings>(loadVoiceSettings);

	useEffect(() => {
		const onStorage = () => setSettings(loadVoiceSettings());
		const onCustom = () => setSettings(loadVoiceSettings());
		window.addEventListener("storage", onStorage);
		window.addEventListener("fetchCoder:voiceSettingsChanged", onCustom);
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("fetchCoder:voiceSettingsChanged", onCustom);
		};
	}, []);

	const update = useCallback((partial: Partial<VoiceSettings>) => {
		const next = { ...loadVoiceSettings(), ...partial };
		saveVoiceSettings(next);
		setSettings(next);
	}, []);

	const replace = useCallback((next: VoiceSettings) => {
		saveVoiceSettings(next);
		setSettings(next);
	}, []);

	return { settings, update, replace };
}
