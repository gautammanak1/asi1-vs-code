import { describe, expect, it } from "vitest";
import {
	formatContextWindowShort,
	formatTokenUsageBarState,
	sanitizeContextWindowTokens,
} from "./formatContextWindow";

describe("sanitizeContextWindowTokens", () => {
	it("replaces Infinity with fallback", () => {
		expect(sanitizeContextWindowTokens(Number.POSITIVE_INFINITY)).toBe(128_000);
	});

	it("keeps finite windows", () => {
		expect(sanitizeContextWindowTokens(200_000)).toBe(200_000);
	});
});

describe("formatContextWindowShort", () => {
	it("shows 1M+ for unbounded tiers", () => {
		expect(formatContextWindowShort(Number.POSITIVE_INFINITY)).toBe("1M+");
	});

	it("formats thousands as Nk", () => {
		expect(formatContextWindowShort(128_000)).toBe("128k");
	});

	it("formats millions", () => {
		expect(formatContextWindowShort(1_000_000)).toBe("1M");
		expect(formatContextWindowShort(1_048_576)).toBe("1M");
	});
});

describe("formatTokenUsageBarState", () => {
	it("omits right label for unbounded context", () => {
		const s = formatTokenUsageBarState(100, Number.POSITIVE_INFINITY);
		expect(s.rightLabel).toBeNull();
		expect(s.leftLabel).toContain("100");
	});

	it("shows remaining for finite context", () => {
		const s = formatTokenUsageBarState(1000, 128_000);
		expect(s.rightLabel).toContain("left");
		expect(s.rightLabel).toContain("128,000");
	});
});
