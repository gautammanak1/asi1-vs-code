import { useEffect, useRef } from "react";
import { speakGlobal, stopGlobalTts } from "@/services/globalTts";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";

/**
 * When enabled, speaks the latest completed assistant text message once.
 */
export function AssistantVoiceAutoPlay({
	text,
	apiKey,
	messageTs,
	isLast,
	partial,
}: {
	text: string;
	apiKey: string;
	messageTs: number;
	isLast: boolean;
	partial?: boolean;
}) {
	const { settings } = useVoiceSettings();
	const startedRef = useRef(false);

	useEffect(() => {
		startedRef.current = false;
	}, [messageTs]);

	useEffect(() => {
		if (!isLast || partial || !settings.autoReadAi || !text?.trim()) {
			return;
		}
		if (startedRef.current) {
			return;
		}
		startedRef.current = true;
		let toRead = text;
		if (!settings.autoReadCodeBlocks) {
			toRead = text.replace(/```[\s\S]*?```/g, " [code] ");
		}
		void speakGlobal(toRead, apiKey, {
			voice: settings.ttsVoice,
			speed: settings.ttsSpeed,
		});
		return () => {
			stopGlobalTts();
		};
	}, [
		apiKey,
		isLast,
		partial,
		settings.autoReadAi,
		settings.autoReadCodeBlocks,
		settings.ttsSpeed,
		settings.ttsVoice,
		text,
		messageTs,
	]);

	return null;
}
