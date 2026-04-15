import { SparklesIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";

const DEFAULT_CHIPS = [
	"Explain this in shorter steps",
	"Add error handling",
	"Add tests for this",
];

const CONTEXT_CHIPS: { test: RegExp; prompts: string[] }[] = [
	{
		test: /html|css|landing|responsive/i,
		prompts: ["Add responsive breakpoints", "Improve accessibility"],
	},
	{
		test: /function|class |def |async /i,
		prompts: ["Refactor for readability", "Add documentation comments"],
	},
];

export const FollowUpPromptChips = memo(function FollowUpPromptChips({
	visible,
	lastAssistantSnippet,
	onPick,
}: {
	visible: boolean;
	lastAssistantSnippet: string | null;
	onPick: (text: string) => void;
}) {
	if (!visible || !lastAssistantSnippet?.trim()) {
		return null;
	}

	const extra =
		CONTEXT_CHIPS.find((c) => c.test.test(lastAssistantSnippet))?.prompts ??
		[];
	const prompts = [...new Set([...extra, ...DEFAULT_CHIPS])].slice(0, 4);

	return (
		<div className="flex flex-wrap items-center gap-1.5 px-1 pb-2 pt-0.5">
			<SparklesIcon
				aria-hidden
				className="size-3.5 shrink-0 text-(--vscode-descriptionForeground)"
			/>
			{prompts.map((p) => (
				<Button
					className="h-7 rounded-full px-2.5 text-[11px] font-normal"
					key={p}
					onClick={() => onPick(p)}
					size="sm"
					type="button"
					variant="outline"
				>
					{p}
				</Button>
			))}
		</div>
	);
});
