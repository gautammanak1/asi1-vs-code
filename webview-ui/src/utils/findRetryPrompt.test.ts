import type { AsiMessage } from "@shared/ExtensionMessage";
import { describe, expect, it } from "vitest";
import { findRetryPrompt } from "./findRetryPrompt";

function msg(
	ts: number,
	say: AsiMessage["say"],
	text?: string,
): AsiMessage {
	return { ts, type: "say", say, text };
}

describe("findRetryPrompt", () => {
	it("returns task text for the first assistant reply after task only", () => {
		const task = msg(1, "task", "Build a page");
		const assistant = msg(10, "text", "Here you go");
		const r = findRetryPrompt(assistant.ts, [assistant], task);
		expect(r?.text).toBe("Build a page");
	});

	it("returns the latest user_feedback before the assistant message", () => {
		const task = msg(1, "task", "Hi");
		const userFollowUp = msg(5, "user_feedback", "Use dark mode");
		const assistant = msg(20, "text", "Done");
		const r = findRetryPrompt(20, [userFollowUp, assistant], task);
		expect(r?.text).toBe("Use dark mode");
	});
});
