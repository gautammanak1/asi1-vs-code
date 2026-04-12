import { TTSService, type TTSVoice } from "./TTSService";

let instance: TTSService | null = null;

export function getGlobalTTSService(apiKey: string): TTSService {
	if (!instance) {
		instance = new TTSService(apiKey);
	} else {
		instance.setApiKey(apiKey);
	}
	return instance;
}

export function stopGlobalTts(): void {
	instance?.stop();
}

export async function speakGlobal(
	text: string,
	apiKey: string,
	opts: {
		voice: TTSVoice;
		speed: number;
		onStart?: () => void;
		onEnd?: () => void;
	},
): Promise<void> {
	const tts = getGlobalTTSService(apiKey);
	await tts.speak(text, {
		voice: opts.voice,
		speed: opts.speed,
		onStart: opts.onStart,
		onEnd: opts.onEnd,
		onError: () => opts.onEnd?.(),
	});
}
