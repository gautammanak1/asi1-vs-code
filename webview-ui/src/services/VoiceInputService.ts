/**
 * Captures microphone audio via MediaRecorder (WebM) for ASI1 Whisper upload.
 */
export class VoiceInputService {
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private stream: MediaStream | null = null;
	private isRecording = false;

	isSupported(): boolean {
		return !!(
			navigator.mediaDevices &&
			navigator.mediaDevices.getUserMedia &&
			window.MediaRecorder
		);
	}

	async requestPermission(): Promise<boolean> {
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					channelCount: 1,
					sampleRate: 16000,
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
				},
			});
			return true;
		} catch {
			return false;
		}
	}

	getStream(): MediaStream | null {
		return this.stream;
	}

	async startRecording(): Promise<void> {
		if (!this.stream) {
			await this.requestPermission();
		}
		if (!this.stream) {
			throw new Error("Microphone permission denied");
		}

		this.audioChunks = [];
		this.isRecording = true;

		const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
			? "audio/webm;codecs=opus"
			: "audio/webm";

		this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				this.audioChunks.push(event.data);
			}
		};
		this.mediaRecorder.start(100);
	}

	async stopRecording(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder) {
				reject(new Error("Not recording"));
				return;
			}
			this.mediaRecorder.onstop = () => {
				const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
				this.isRecording = false;
				resolve(audioBlob);
			};
			this.mediaRecorder.stop();
		});
	}

	cancelRecording(): void {
		if (this.mediaRecorder && this.isRecording) {
			this.mediaRecorder.stop();
			this.audioChunks = [];
			this.isRecording = false;
		}
	}

	cleanup(): void {
		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.isRecording = false;
	}

	getIsRecording(): boolean {
		return this.isRecording;
	}
}
