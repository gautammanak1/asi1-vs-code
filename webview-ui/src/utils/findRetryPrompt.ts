import type { AsiMessage } from "@shared/ExtensionMessage";

/**
 * Finds the user prompt (initial task or follow-up) that precedes an assistant `say: "text"` message,
 * walking backward across tools / API rows.
 */
export function findRetryPrompt(
	assistantTs: number,
	modifiedMessages: AsiMessage[],
	taskMessage: AsiMessage | undefined,
): { text: string; images: string[]; files: string[] } | null {
	const timeline: AsiMessage[] = [];
	if (taskMessage?.say === "task") {
		timeline.push(taskMessage);
	}
	timeline.push(...modifiedMessages);

	const idx = timeline.findIndex((m) => m.ts === assistantTs);
	if (idx <= 0) {
		return null;
	}

	for (let i = idx - 1; i >= 0; i--) {
		const m = timeline[i];
		if (m.type !== "say") {
			continue;
		}
		if (m.say === "user_feedback" || m.say === "task") {
			const text = (m.text ?? "").trim();
			if (
				!text &&
				(m.images?.length ?? 0) === 0 &&
				(m.files?.length ?? 0) === 0
			) {
				continue;
			}
			return {
				text,
				images: m.images ?? [],
				files: m.files ?? [],
			};
		}
	}

	return null;
}
