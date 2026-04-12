import {
	PauseIcon,
	PlayIcon,
	SquareIcon,
	Volume2Icon,
} from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { getGlobalTTSService, stopGlobalTts } from "@/services/globalTts";
import type { TTSVoice } from "@/services/TTSService";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export const MessageTTSControls = memo(function MessageTTSControls({
	text,
	apiKey,
	plainText,
}: {
	text: string;
	apiKey: string;
	/** Stripped markdown for TTS when auto-read skips heavy markdown */
	plainText?: string;
}) {
	const { settings, update } = useVoiceSettings();
	const [phase, setPhase] = useState<"idle" | "playing" | "paused">("idle");
	const toSpeak = plainText ?? text;

	const speak = useCallback(async () => {
		stopGlobalTts();
		const tts = getGlobalTTSService(apiKey);
		setPhase("playing");
		await tts.speak(toSpeak, {
			voice: settings.ttsVoice,
			speed: settings.ttsSpeed,
			onEnd: () => setPhase("idle"),
			onError: () => setPhase("idle"),
		});
	}, [apiKey, toSpeak, settings.ttsSpeed, settings.ttsVoice]);

	const pause = useCallback(() => {
		getGlobalTTSService(apiKey).pause();
		setPhase("paused");
	}, [apiKey]);

	const resume = useCallback(() => {
		getGlobalTTSService(apiKey).resume();
		setPhase("playing");
	}, [apiKey]);

	const stop = useCallback(() => {
		stopGlobalTts();
		setPhase("idle");
	}, []);

	useEffect(() => {
		return () => {
			if (phase !== "idle") {
				stopGlobalTts();
			}
		};
	}, [phase]);

	if (!toSpeak?.trim()) {
		return null;
	}

	return (
		<div
			className="tts-controls ml-auto flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
			onClick={(e) => e.stopPropagation()}
		>
			{phase === "idle" && (
				<button
					className="rounded p-0.5 hover:bg-(--vscode-toolbar-hoverBackground)"
					onClick={() => void speak()}
					title="Speak"
					type="button"
				>
					<Volume2Icon className="size-3.5 text-(--vscode-descriptionForeground)" />
				</button>
			)}
			{phase === "playing" && (
				<button
					className="rounded p-0.5 hover:bg-(--vscode-toolbar-hoverBackground)"
					onClick={pause}
					title="Pause"
					type="button"
				>
					<PauseIcon className="size-3.5" />
				</button>
			)}
			{phase === "paused" && (
				<button
					className="rounded p-0.5 hover:bg-(--vscode-toolbar-hoverBackground)"
					onClick={resume}
					title="Resume"
					type="button"
				>
					<PlayIcon className="size-3.5" />
				</button>
			)}
			{(phase === "playing" || phase === "paused") && (
				<button
					className="rounded p-0.5 hover:bg-(--vscode-toolbar-hoverBackground)"
					onClick={stop}
					title="Stop"
					type="button"
				>
					<SquareIcon className="size-3.5" />
				</button>
			)}
			<select
				aria-label="TTS voice"
				className="max-w-[88px] cursor-pointer rounded border border-(--vscode-panel-border) bg-transparent px-1 py-0 text-[10px]"
				onChange={(e) =>
					update({ ttsVoice: e.target.value as TTSVoice })
				}
				value={settings.ttsVoice}
			>
				{(
					["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const
				).map((v) => (
					<option key={v} value={v}>
						{v}
					</option>
				))}
			</select>
			<div className="flex gap-0.5">
				{SPEEDS.map((s) => (
					<button
						className={cn(
							"rounded px-1 py-0 text-[10px]",
							settings.ttsSpeed === s
								? "bg-(--vscode-button-secondaryBackground) text-(--vscode-button-secondaryForeground)"
								: "opacity-70 hover:opacity-100",
						)}
						key={s}
						onClick={() => update({ ttsSpeed: s })}
						type="button"
					>
						{s}x
					</button>
				))}
			</div>
		</div>
	);
});
