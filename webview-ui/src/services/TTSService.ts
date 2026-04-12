const ASI1_TTS_URL = "https://api.asi1.ai/v1/audio/speech";

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface TTSSpeakOptions {
	voice?: TTSVoice;
	speed?: number;
	onStart?: () => void;
	onEnd?: () => void;
	onError?: (err: string) => void;
}

export class TTSService {
	private currentAudio: HTMLAudioElement | null = null;
	private isPlaying = false;
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	setApiKey(key: string) {
		this.apiKey = key;
	}

	async speak(text: string, options: TTSSpeakOptions = {}): Promise<void> {
		this.stop();
		const cleanText = this.prepareTextForSpeech(text);
		if (!cleanText.trim()) {
			return;
		}
		try {
			if (this.apiKey.trim()) {
				await this.speakWithASI1(cleanText, options);
			} else {
				throw new Error("No API key");
			}
		} catch {
			await this.speakWithWebSpeech(cleanText, options);
		}
	}

	private async speakWithASI1(
		text: string,
		options: TTSSpeakOptions,
	): Promise<void> {
		const response = await fetch(ASI1_TTS_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "tts-1",
				input: text.substring(0, 4096),
				voice: options.voice ?? "nova",
				speed: options.speed ?? 1,
			}),
		});
		if (!response.ok) {
			throw new Error("TTS API failed");
		}
		const audioBlob = await response.blob();
		const audioUrl = URL.createObjectURL(audioBlob);
		this.currentAudio = new Audio(audioUrl);
		this.currentAudio.onplay = () => {
			this.isPlaying = true;
			options.onStart?.();
		};
		this.currentAudio.onended = () => {
			this.isPlaying = false;
			URL.revokeObjectURL(audioUrl);
			options.onEnd?.();
		};
		this.currentAudio.onerror = () => {
			options.onError?.("Audio playback failed");
		};
		await this.currentAudio.play();
	}

	private speakWithWebSpeech(
		text: string,
		options: TTSSpeakOptions,
	): Promise<void> {
		if (!window.speechSynthesis) {
			options.onError?.("Speech synthesis not supported");
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.rate = options.speed ?? 1;
			utterance.pitch = 1;
			utterance.volume = 1;
			const pickVoice = () => {
				const voices = speechSynthesis.getVoices();
				const preferredVoice = voices.find(
					(v) =>
						v.name.includes("Google") ||
						v.name.includes("Neural") ||
						v.lang === "en-US",
				);
				if (preferredVoice) {
					utterance.voice = preferredVoice;
				}
			};
			pickVoice();
			queueMicrotask(pickVoice);

			utterance.onstart = () => {
				this.isPlaying = true;
				options.onStart?.();
			};
			utterance.onend = () => {
				this.isPlaying = false;
				options.onEnd?.();
				resolve();
			};
			utterance.onerror = () => {
				options.onError?.("TTS error");
				resolve();
			};
			speechSynthesis.speak(utterance);
		});
	}

	private prepareTextForSpeech(raw: string): string {
		return raw
			.replace(/```[\s\S]*?```/g, " [code block] ")
			.replace(/`([^`]+)`/g, "$1")
			.replace(/\*\*([^*]+)\*\*/g, "$1")
			.replace(/\*([^*]+)\*/g, "$1")
			.replace(/#{1,6}\s/g, "")
			.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
			.replace(/https?:\/\/\S+/g, "link")
			.replace(/[<>{}[\]|\\]/g, "")
			.replace(/\n{2,}/g, ". ")
			.replace(/\n/g, " ")
			.trim();
	}

	stop(): void {
		this.currentAudio?.pause();
		if (this.currentAudio?.src?.startsWith("blob:")) {
			URL.revokeObjectURL(this.currentAudio.src);
		}
		this.currentAudio = null;
		this.isPlaying = false;
		window.speechSynthesis?.cancel();
	}

	pause(): void {
		this.currentAudio?.pause();
		window.speechSynthesis?.pause();
		this.isPlaying = false;
	}

	resume(): void {
		void this.currentAudio?.play();
		window.speechSynthesis?.resume();
		this.isPlaying = true;
	}

	getIsPlaying(): boolean {
		return this.isPlaying;
	}
}
