/** Webview-side ASI debug — formatted lines; suppressed in prod unless VITE_ASI1_DEBUG. */

function enabled(): boolean {
	return (
		typeof import.meta !== "undefined" &&
		(import.meta.env.DEV || import.meta.env.VITE_ASI1_DEBUG === "true")
	)
}

function stamp(level: string, parts: unknown[]): string {
	const ts = new Date().toISOString().slice(0, 19).replace("T", " ")
	const body = parts
		.map((p) =>
			typeof p === "string" ? p : p instanceof Error ? p.message : JSON.stringify(p))
		.join(" ")
	return `[${ts}] [${level}] ${body}`
}

const LEVEL = {
	info: "INFO",
	warn: "WARN",
	error: "ERROR",
	success: "SUCCESS",
} as const

function emitLine(which: keyof typeof LEVEL, sink: typeof console.log, args: unknown[]) {
	if (!enabled()) {
		return
	}
	sink(stamp(LEVEL[which], args))
}

export const asiDebug = {
	info: (...args: unknown[]) => emitLine("info", console.log.bind(console), args),
	warn: (...args: unknown[]) => emitLine("warn", console.warn.bind(console), args),
	error: (...args: unknown[]) => emitLine("error", console.error.bind(console), args),
	success: (...args: unknown[]) => emitLine("success", console.log.bind(console), args),
}
