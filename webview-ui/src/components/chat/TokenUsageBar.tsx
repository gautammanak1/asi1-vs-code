import type { AsiApiReqInfo, AsiMessage } from "@shared/ExtensionMessage";
import type React from "react";
import { useMemo } from "react";
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { cn } from "@/lib/utils";

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
	const contextWindow = selectedModelInfo.contextWindow || 128_000;

	const used = useMemo(() => sumApiTokens(messages), [messages]);
	const pct =
		contextWindow > 0 ? Math.min(100, (used / contextWindow) * 100) : 0;
	const warn = pct >= 80;
	const remaining = Math.max(0, contextWindow - used);

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
			<div className="text-[10px] text-(--vscode-descriptionForeground) flex justify-between gap-2">
				<span>~{used.toLocaleString()} tokens (conversation)</span>
				<span
					className={cn(
						"text-right",
						warn && "text-(--vscode-inputValidation-warningForeground)",
					)}
				>
					{warn ? "Approaching context limit · " : ""}~
					{remaining.toLocaleString()} left / {contextWindow.toLocaleString()}{" "}
					window
				</span>
			</div>
		</div>
	);
};
