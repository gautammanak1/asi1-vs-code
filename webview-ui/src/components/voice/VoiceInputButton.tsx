import { Loader2Icon, MicIcon, XIcon } from "lucide-react";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { VoiceInputService } from "@/services/VoiceInputService";
import {
	createWebSpeechRecognition,
	transcribeWithASI1,
} from "@/services/TranscriptionService";
import type { TranscriptionMethod } from "@/types/voice-settings";
import { WaveformVisualizer } from "./WaveformVisualizer";

export type VoiceUiState =
	| "idle"
	| "requesting"
	| "recording"
	| "processing"
	| "error";

export interface VoiceInputHandle {
	/** Push-to-talk: start recording (same as first click). */
	beginHold: () => void;
	/** Push-to-talk: stop and transcribe (same as second click). */
	endHold: () => void;
	/** Cancel in-flight capture (requesting or recording). */
	cancelHold: () => void;
}

export interface VoiceInputButtonProps {
	onTranscription: (text: string) => void;
	onInterimResult?: (text: string) => void;
	apiKey: string;
	webSpeechLang: string;
	whisperLang?: string;
	transcriptionMethod: TranscriptionMethod;
	disabled?: boolean;
	/** Short label when UI locale / chosen language is not English (e.g. हिंदी). */
	languageBadge?: string | null;
}

export const VoiceInputButton = forwardRef<
	VoiceInputHandle,
	VoiceInputButtonProps
>(function VoiceInputButton(
	{
		onTranscription,
		onInterimResult,
		apiKey,
		webSpeechLang,
		whisperLang,
		transcriptionMethod,
		disabled,
		languageBadge,
	},
	ref,
) {
	const [ui, setUi] = useState<VoiceUiState>("idle");
	const [errMsg, setErrMsg] = useState<string | null>(null);
	const serviceRef = useRef<VoiceInputService>(new VoiceInputService());
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const browserTextRef = useRef("");
	const lastInterimRef = useRef("");

	const cleanupRecognition = useCallback(() => {
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop();
			} catch {
				// ignore
			}
			recognitionRef.current = null;
		}
		browserTextRef.current = "";
	}, []);

	const cleanupAll = useCallback(() => {
		cleanupRecognition();
		serviceRef.current.cancelRecording();
		serviceRef.current.cleanup();
		serviceRef.current = new VoiceInputService();
	}, [cleanupRecognition]);

	useEffect(() => {
		return () => {
			cleanupAll();
		};
	}, [cleanupAll]);

	useEffect(() => {
		if (ui !== "error" || !errMsg) {
			return;
		}
		const t = setTimeout(() => {
			setUi("idle");
			setErrMsg(null);
		}, 3200);
		return () => clearTimeout(t);
	}, [ui, errMsg]);

	const fail = useCallback((msg: string) => {
		setErrMsg(msg);
		setUi("error");
		cleanupAll();
	}, [cleanupAll]);

	const startBrowser = useCallback(async () => {
		const svc = serviceRef.current;
		if (!svc.isSupported()) {
			fail("Voice input is not supported in this environment.");
			return;
		}
		setUi("requesting");
		const ok = await svc.requestPermission();
		if (!ok) {
			setUi("idle");
			fail("Microphone permission was denied.");
			return;
		}
		const rec = createWebSpeechRecognition(
			(text, isFinal) => {
				if (isFinal) {
					browserTextRef.current = `${browserTextRef.current} ${text}`.trim();
					lastInterimRef.current = "";
					onInterimResult?.(browserTextRef.current);
				} else {
					lastInterimRef.current = text;
					onInterimResult?.(
						`${browserTextRef.current} ${text}`.trim() || text,
					);
				}
			},
			(e) => {
				if (e !== "aborted" && e !== "no-speech") {
					fail(`Speech recognition: ${e}`);
				}
			},
			webSpeechLang,
		);
		if (!rec) {
			fail("Browser speech recognition is not available.");
			return;
		}
		recognitionRef.current = rec;
		browserTextRef.current = "";
		lastInterimRef.current = "";
		setUi("recording");
		try {
			rec.start();
		} catch (e) {
			fail(e instanceof Error ? e.message : "Could not start recognition.");
		}
	}, [fail, onInterimResult, webSpeechLang]);

	const stopBrowser = useCallback(() => {
		const rec = recognitionRef.current;
		if (rec) {
			rec.onend = () => {
				recognitionRef.current = null;
				const text =
					browserTextRef.current.trim() ||
					lastInterimRef.current.trim();
				browserTextRef.current = "";
				lastInterimRef.current = "";
				serviceRef.current.cleanup();
				serviceRef.current = new VoiceInputService();
				if (text) {
					onTranscription(text);
				}
				setUi("idle");
			};
			try {
				rec.stop();
			} catch {
				cleanupRecognition();
				const text =
					browserTextRef.current.trim() ||
					lastInterimRef.current.trim();
				browserTextRef.current = "";
				lastInterimRef.current = "";
				serviceRef.current.cleanup();
				serviceRef.current = new VoiceInputService();
				if (text) {
					onTranscription(text);
				}
				setUi("idle");
			}
		} else {
			setUi("idle");
		}
	}, [cleanupRecognition, onTranscription]);

	const startAsi1 = useCallback(async () => {
		const svc = serviceRef.current;
		if (!svc.isSupported()) {
			fail("Voice input is not supported in this environment.");
			return;
		}
		setUi("requesting");
		const ok = await svc.requestPermission();
		if (!ok) {
			setUi("idle");
			fail("Microphone permission was denied.");
			return;
		}
		try {
			setUi("recording");
			await svc.startRecording();
		} catch (e) {
			fail(e instanceof Error ? e.message : "Could not start recording.");
		}
	}, [fail]);

	const stopAsi1 = useCallback(async () => {
		setUi("processing");
		try {
			const blob = await serviceRef.current.stopRecording();
			serviceRef.current.cleanup();
			serviceRef.current = new VoiceInputService();
			if (!apiKey.trim()) {
				fail("Add your ASI:One API key in settings for cloud transcription.");
				return;
			}
			const text = await transcribeWithASI1(blob, apiKey, whisperLang);
			if (text.trim()) {
				onTranscription(text.trim());
				setUi("idle");
			} else {
				fail("No speech detected. Try again.");
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			fail(`${msg} — try Voice settings → Browser transcription, or check your API key.`);
		}
	}, [apiKey, fail, onTranscription, whisperLang]);

	const toggleRecording = useCallback(() => {
		if (disabled) {
			return;
		}
		if (ui === "recording") {
			if (transcriptionMethod === "browser") {
				stopBrowser();
			} else {
				void stopAsi1();
			}
			return;
		}
		if (ui === "processing" || ui === "requesting") {
			return;
		}
		if (transcriptionMethod === "browser") {
			void startBrowser();
		} else {
			void startAsi1();
		}
	}, [
		disabled,
		ui,
		transcriptionMethod,
		startBrowser,
		startAsi1,
		stopAsi1,
		stopBrowser,
	]);

	const cancel = useCallback(() => {
		if (ui === "requesting" || ui === "recording") {
			if (transcriptionMethod === "browser") {
				cleanupRecognition();
			} else if (ui === "recording") {
				serviceRef.current.cancelRecording();
			}
			cleanupAll();
			setUi("idle");
		}
	}, [ui, transcriptionMethod, cleanupRecognition, cleanupAll]);

	useImperativeHandle(
		ref,
		() => ({
			beginHold: () => {
				if (disabled) {
					return;
				}
				if (ui !== "idle") {
					return;
				}
				if (transcriptionMethod === "browser") {
					void startBrowser();
				} else {
					void startAsi1();
				}
			},
			endHold: () => {
				if (disabled) {
					return;
				}
				if (ui === "requesting") {
					cancel();
					return;
				}
				if (ui !== "recording") {
					return;
				}
				if (transcriptionMethod === "browser") {
					stopBrowser();
				} else {
					void stopAsi1();
				}
			},
			cancelHold: () => {
				cancel();
			},
		}),
		[
			disabled,
			ui,
			transcriptionMethod,
			startBrowser,
			startAsi1,
			stopAsi1,
			stopBrowser,
			cancel,
		],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && (ui === "recording" || ui === "requesting")) {
				cancel();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [ui, cancel]);

	const stream =
		ui === "recording" ? serviceRef.current.getStream() : null;

	let label = "Click to speak";
	if (ui === "requesting") {
		label = "Requesting microphone…";
	}
	if (ui === "recording") {
		label = "Recording… click to stop";
	}
	if (ui === "processing") {
		label = "Transcribing…";
	}
	if (ui === "error") {
		label = errMsg ?? "Error";
	}

	return (
		<div className="flex flex-col gap-0.5 min-w-0">
			{stream && (
				<div className="w-full min-w-[120px] max-w-[min(100%,360px)]">
					<WaveformVisualizer stream={stream} />
				</div>
			)}
			<div className="flex items-center gap-0.5">
				<Tooltip>
					<TooltipContent side="top">{label}</TooltipContent>
					<TooltipTrigger asChild>
						<button
							className={cn(
								"voice-input-btn flex items-center justify-center rounded p-1 min-w-[26px] min-h-[26px] text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) disabled:opacity-40",
								ui === "recording" && "recording text-red-500",
							)}
							disabled={
								disabled || ui === "processing" || ui === "requesting"
							}
							onClick={toggleRecording}
							type="button"
						>
							{ui === "processing" || ui === "requesting" ? (
								<Loader2Icon className="size-3.5 animate-spin" />
							) : ui === "error" ? (
								<XIcon className="size-3.5 text-red-500" />
							) : (
								<MicIcon className="size-3.5" />
							)}
						</button>
					</TooltipTrigger>
				</Tooltip>
				{languageBadge ? (
					<span
						className="text-[9px] leading-none px-1 rounded bg-(--vscode-badge-background) text-(--vscode-badge-foreground) max-w-[3rem] truncate"
						title={languageBadge}
					>
						{languageBadge}
					</span>
				) : null}
			</div>
		</div>
	);
});

VoiceInputButton.displayName = "VoiceInputButton";
