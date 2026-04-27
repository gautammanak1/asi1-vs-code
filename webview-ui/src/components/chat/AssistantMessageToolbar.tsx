import { StringRequest } from "@shared/proto/Asi/common";
import type { TaskFeedbackType } from "@shared/WebviewMessage";
import { CopyIcon, RefreshCwIcon, ThumbsDownIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskServiceClient } from "@/services/grpc-client";
import { asiDebug } from "@/utils/debug";

interface AssistantMessageToolbarProps {
	/** Plain text to copy (assistant reply). */
	messageText: string;
	messageTs: number;
	onRetry?: () => void;
	retryDisabled?: boolean;
	isFromHistory?: boolean;
	className?: string;
}

/**
 * Cursor-style actions under an assistant message: retry, copy, thumbs down.
 */
export function AssistantMessageToolbar({
	messageText,
	messageTs,
	onRetry,
	retryDisabled = false,
	isFromHistory = false,
	className,
}: AssistantMessageToolbarProps) {
	const [feedback, setFeedback] = useState<TaskFeedbackType | null>(null);
	const [shouldShowFeedback, setShouldShowFeedback] = useState(true);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("taskFeedbackHistory") || "{}";
			const history = JSON.parse(raw) as Record<string, boolean>;
			if (history[messageTs]) {
				setShouldShowFeedback(false);
			}
		} catch {
			// ignore
		}
	}, [messageTs]);

	const handleCopy = useCallback(async () => {
		const t = messageText ?? "";
		if (!t) {
			return;
		}
		try {
			await navigator.clipboard.writeText(t);
		} catch (e) {
			asiDebug.error("Copy failed", e);
		}
	}, [messageText]);

	const handleThumbsDown = useCallback(async () => {
		if (feedback !== null || isFromHistory || !shouldShowFeedback) {
			return;
		}
		setFeedback("thumbs_down");
		try {
			await TaskServiceClient.taskFeedback(
				StringRequest.create({ value: "thumbs_down" }),
			);
			try {
				const raw = localStorage.getItem("taskFeedbackHistory") || "{}";
				const history = JSON.parse(raw) as Record<string, boolean>;
				history[messageTs] = true;
				localStorage.setItem("taskFeedbackHistory", JSON.stringify(history));
			} catch {
				// ignore
			}
		} catch (e) {
			asiDebug.error("taskFeedback failed", e);
			setFeedback(null);
		}
	}, [feedback, isFromHistory, messageTs, shouldShowFeedback]);

	const showThumb = !isFromHistory && shouldShowFeedback;

	return (
		<div
			className={cn(
				"flex items-center gap-0.5 mt-1.5 pt-1 border-t border-(--vscode-widget-border, rgba(255,255,255,0.08))",
				className,
			)}
		>
			{onRetry && (
				<Button
					aria-label="Retry"
					className="size-7 text-(--vscode-descriptionForeground) hover:text-foreground hover:bg-(--vscode-toolbar-hoverBackground)"
					disabled={retryDisabled}
					onClick={onRetry}
					size="icon"
					title="Retry — resend the last user message"
					type="button"
					variant="ghost"
				>
					<RefreshCwIcon className="size-3.5 stroke-[1.5]" />
				</Button>
			)}
			<Button
				aria-label="Copy message"
				className="size-7 text-(--vscode-descriptionForeground) hover:text-foreground hover:bg-(--vscode-toolbar-hoverBackground)"
				disabled={!messageText?.trim()}
				onClick={() => void handleCopy()}
				size="icon"
				title="Copy"
				type="button"
				variant="ghost"
			>
				<CopyIcon className="size-3.5 stroke-[1.5]" />
			</Button>
			{showThumb && (
				<Button
					aria-label="Not helpful"
					className="size-7 text-(--vscode-descriptionForeground) hover:text-foreground hover:bg-(--vscode-toolbar-hoverBackground)"
					disabled={feedback !== null}
					onClick={() => void handleThumbsDown()}
					size="icon"
					title="Not helpful"
					type="button"
					variant="ghost"
				>
					<ThumbsDownIcon
						className={cn(
							"size-3.5 stroke-[1.5]",
							feedback === "thumbs_down" && "fill-current",
						)}
					/>
				</Button>
			)}
		</div>
	);
}
