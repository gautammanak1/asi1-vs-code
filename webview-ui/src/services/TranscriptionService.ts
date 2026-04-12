const ASI1_TRANSCRIBE_URL = "https://api.asi1.ai/v1/audio/transcriptions";

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
	const w = window as Window &
		typeof globalThis & {
			SpeechRecognition?: new () => SpeechRecognition;
			webkitSpeechRecognition?: new () => SpeechRecognition;
		};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export async function transcribeWithASI1(
	audioBlob: Blob,
	apiKey: string,
	language?: string,
): Promise<string> {
	const formData = new FormData();
	formData.append("file", audioBlob, "recording.webm");
	formData.append("model", "whisper-1");
	if (language) {
		formData.append("language", language);
	}
	formData.append("response_format", "json");

	const response = await fetch(ASI1_TRANSCRIBE_URL, {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}` },
		body: formData,
	});

	if (!response.ok) {
		const errText = await response.text().catch(() => "");
		throw new Error(`Transcription failed: ${response.status} ${errText}`);
	}
	const data = (await response.json()) as { text?: string };
	return data.text ?? "";
}

/**
 * Live dictation — caller must call `.start()` / `.stop()` on the returned instance.
 */
export function createWebSpeechRecognition(
	onResult: (text: string, isFinal: boolean) => void,
	onError: (error: string) => void,
	language = "en-US",
): SpeechRecognition | null {
	const Ctor = getSpeechRecognitionCtor();
	if (!Ctor) {
		return null;
	}
	const recognition = new Ctor();
	recognition.continuous = true;
	recognition.interimResults = true;
	recognition.lang = language;
	recognition.maxAlternatives = 1;

	recognition.onresult = (event: SpeechRecognitionEvent) => {
		let interimTranscript = "";
		let finalTranscript = "";
		for (let i = event.resultIndex; i < event.results.length; i++) {
			const result = event.results[i];
			const transcript = result[0]?.transcript ?? "";
			if (result.isFinal) {
				finalTranscript += transcript;
			} else {
				interimTranscript += transcript;
			}
		}
		if (finalTranscript) {
			onResult(finalTranscript, true);
		} else if (interimTranscript) {
			onResult(interimTranscript, false);
		}
	};

	recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
		onError(event.error);
	};

	return recognition;
}
