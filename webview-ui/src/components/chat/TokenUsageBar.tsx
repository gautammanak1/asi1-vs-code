import type { AsiApiReqInfo, AsiMessage } from "@shared/ExtensionMessage";
import type React from "react";
import { useMemo } from "react";
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";
import { formatTokenUsageBarState } from "@/utils/formatContextWindow";

function sumApiTokens(messages: AsiMessage[]): number {
	let total = 0;
	for (const m of messages) {
		if (m.type !== "say" || m.say !== "api_req_started" || !m.text) {
			continue;
		}
		try {
			const info = JSON.parse(m.text) as AsiApiReqInfo;
			total += (info.tokensIn ?? 0) + (info.tokensOut ?? 0);
		} catch {
			// ignore malformed rows
		}
	}
	return total;
}

export const TokenUsageBar: React.FC<{ messages: AsiMessage[] }> = ({
	messages,
}) => {
	const { apiConfiguration, mode } = useExtensionState();
	const { selectedModelInfo } = normalizeApiConfiguration(
		apiConfiguration,
		mode,
	);
	const used = useMemo(() => sumApiTokens(messages), [messages]);
	const { pct, warn, leftLabel, rightLabel } = formatTokenUsageBarState(
		used,
		selectedModelInfo.contextWindow,
	);

	if (messages.length === 0) {
		return null;
	}

	return (
		<div className="px-3.5 pb-1.5 pt-0 flex flex-col gap-0.5 select-none">
			<div className="h-0.5 rounded-full bg-(--vscode-input-background) overflow-hidden">
				<div
					className={cn(
						"h-full transition-[width] duration-300",
						warn
							? "bg-(--vscode-inputValidation-warningForeground)"
							: "bg-(--vscode-descriptionForeground)/35",
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div
				className={cn(
					"text-[10px] text-(--vscode-descriptionForeground) flex gap-2",
					rightLabel ? "justify-between" : "",
				)}
			>
				<span>{leftLabel}</span>
				{rightLabel && (
					<span
						className={cn(
							"text-right",
							warn && "text-(--vscode-inputValidation-warningForeground)",
						)}
					>
						{rightLabel}
					</span>
				)}
			</div>
		</div>
	);
};
