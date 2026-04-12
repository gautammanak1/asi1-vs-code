import { memo } from "react";
import { cn } from "@/lib/utils";
import { MarkdownRow } from "./MarkdownRow";
import { Int64Request } from "@shared/proto/Asi/common";
import { CheckIcon } from "lucide-react";
import { PLATFORM_CONFIG, PlatformType } from "@/config/platform.config";
import { TaskServiceClient } from "@/services/grpc-client";
import { CopyButton } from "../common/CopyButton";
import SuccessButton from "../common/SuccessButton";
import { QuoteButtonState } from "./ChatRow";
import QuoteButton from "./QuoteButton";

interface CompletionOutputRowProps {
	text: string;
	quoteButtonState: QuoteButtonState;
	handleQuoteClick: () => void;
	headClassNames?: string;
	showActionRow?: boolean;
	seeNewChangesDisabled: boolean;
	setSeeNewChangesDisabled: (value: boolean) => void;
	explainChangesDisabled: boolean;
	setExplainChangesDisabled: (value: boolean) => void;
	messageTs: number;
}

export const CompletionOutputRow = memo(
	({
		headClassNames,
		text,
		quoteButtonState,
		showActionRow,
		seeNewChangesDisabled,
		setSeeNewChangesDisabled,
		explainChangesDisabled,
		setExplainChangesDisabled,
		messageTs,
		handleQuoteClick,
	}: CompletionOutputRowProps) => {
		return (
			<div>
				<div className="rounded-sm border border-white/10 overflow-visible bg-black p-2 pt-3">
					{/* Title */}
					<div className={cn(headClassNames, "justify-between px-1")}>
						<div className="flex gap-2 items-center">
							<CheckIcon className="size-3 text-zinc-400" />
							<span className="text-zinc-100 font-semibold">Result</span>
						</div>
						<CopyButton className="text-zinc-300" textToCopy={text} />
					</div>
					{/* Content */}
					<div className="w-full relative border-t border-white/10 rounded-b-sm">
						<div className="completion-output-content bg-black text-zinc-300 p-2 pt-3 w-full [&_hr]:opacity-20 [&_p:last-child]:mb-0 [&_a]:text-sky-400 [&_strong]:text-zinc-100 [&_code]:bg-zinc-900/80 [&_code]:text-zinc-200 rounded-sm">
							<MarkdownRow markdown={text} />
							{quoteButtonState.visible && (
								<QuoteButton
									left={quoteButtonState.left}
									onClick={handleQuoteClick}
									top={quoteButtonState.top}
								/>
							)}
						</div>
					</div>
				</div>
				{/* Action Buttons */}
				{showActionRow && (
					<CompletionOutputActionRow
						explainChangesDisabled={explainChangesDisabled}
						messageTs={messageTs}
						seeNewChangesDisabled={seeNewChangesDisabled}
						setExplainChangesDisabled={setExplainChangesDisabled}
						setSeeNewChangesDisabled={setSeeNewChangesDisabled}
					/>
				)}
			</div>
		);
	},
);

CompletionOutputRow.displayName = "CompletionOutputRow";

const CompletionOutputActionRow = memo(
	({
		seeNewChangesDisabled,
		setSeeNewChangesDisabled,
		explainChangesDisabled,
		setExplainChangesDisabled,
		messageTs,
	}: {
		seeNewChangesDisabled: boolean;
		setSeeNewChangesDisabled: (value: boolean) => void;
		explainChangesDisabled: boolean;
		setExplainChangesDisabled: (value: boolean) => void;
		messageTs: number;
	}) => {
		return (
			<div
				style={{
					paddingTop: 10,
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				<SuccessButton
					disabled={seeNewChangesDisabled}
					onClick={() => {
						setSeeNewChangesDisabled(true);
						TaskServiceClient.taskCompletionViewChanges(
							Int64Request.create({
								value: messageTs,
							}),
						).catch((err) =>
							console.error(
								"Failed to show task completion view changes:",
								err,
							),
						);
					}}
					style={{
						cursor: seeNewChangesDisabled ? "wait" : "pointer",
						width: "100%",
					}}
				>
					<i className="codicon codicon-new-file" style={{ marginRight: 6 }} />
					View Changes
				</SuccessButton>

				{PLATFORM_CONFIG.type === PlatformType.VSCODE && (
					<SuccessButton
						disabled={explainChangesDisabled}
						onClick={() => {
							setExplainChangesDisabled(true);
							TaskServiceClient.explainChanges({
								metadata: {},
								messageTs,
							}).catch((err) => {
								console.error("Failed to explain changes:", err);
								setExplainChangesDisabled(false);
							});
						}}
						style={{
							cursor: explainChangesDisabled ? "wait" : "pointer",
							width: "100%",
						}}
					>
						<i
							className="codicon codicon-comment-discussion"
							style={{ marginRight: 6 }}
						/>
						{explainChangesDisabled ? "Explaining..." : "Explain Changes"}
					</SuccessButton>
				)}
			</div>
		);
	},
);
