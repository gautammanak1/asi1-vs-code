/**
 * Model tiers sometimes use Number.POSITIVE_INFINITY for "unlimited" pricing windows.
 * The UI must never format that as a token count.
 */
const MAX_SANE_CONTEXT = 16_777_216; // 16M — above this, treat as unbounded for display

export function isUnboundedContextWindow(n: number | undefined): boolean {
	if (n === undefined) {
		return false;
	}
	return !Number.isFinite(n) || n <= 0 || n > MAX_SANE_CONTEXT;
}

/** Use for model info: replaces ∞ / invalid tiers with a finite window for UI + progress. */
export function sanitizeContextWindowTokens(
	n: number | undefined,
	fallback = 128_000,
): number {
	if (
		n === undefined ||
		!Number.isFinite(n) ||
		n <= 0 ||
		n > MAX_SANE_CONTEXT
	) {
		return fallback;
	}
	return n;
}

export function formatTokenUsageBarState(
	used: number,
	rawContextWindow: number | undefined,
	fallbackWindow = 128_000,
): {
	pct: number;
	warn: boolean;
	leftLabel: string;
	rightLabel: string | null;
} {
	const leftLabel = `~${used.toLocaleString()} tokens (conversation)`;

	if (isUnboundedContextWindow(rawContextWindow)) {
		const w = fallbackWindow;
		const pct = w > 0 ? Math.min(100, (used / w) * 100) : 0;
		const warn = pct >= 80;
		return {
			pct,
			warn,
			leftLabel,
			rightLabel: null,
		};
	}

	const contextWindow = rawContextWindow ?? fallbackWindow;
	const pct =
		contextWindow > 0 ? Math.min(100, (used / contextWindow) * 100) : 0;
	const warn = pct >= 80;
	const remaining = Math.max(0, contextWindow - used);
	const rightLabel = `${warn ? "Approaching context limit · " : ""}~${remaining.toLocaleString()} left / ${contextWindow.toLocaleString()} window`;

	return { pct, warn, leftLabel, rightLabel };
}

/** Short label for onboarding / model cards, e.g. "128k" or "1M+". */
export function formatContextWindowShort(
	contextWindow: number | undefined,
): string {
	if (contextWindow === undefined) {
		return "—";
	}
	if (contextWindow === Number.POSITIVE_INFINITY) {
		return "1M+";
	}
	if (!Number.isFinite(contextWindow)) {
		return "—";
	}
	if (contextWindow <= 0 || contextWindow > MAX_SANE_CONTEXT) {
		return "1M+";
	}
	if (contextWindow >= 1_000_000) {
		const m = contextWindow / 1_000_000;
		const rounded = Math.round(m * 10) / 10;
		if (Number.isInteger(rounded)) {
			return `${rounded}M`;
		}
		return `${rounded.toFixed(1)}M`.replace(/\.0M$/, "M");
	}
	return `${Math.round(contextWindow / 1000)}k`;
}
