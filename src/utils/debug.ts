/**
 * ASI1 Debug — logs to VS Code Output channel "ASI1 Debug".
 * Off for packaged Marketplace builds unless env ASI1_DEBUG=1.
 */
import * as vscode from "vscode"

export const CHANNEL_NAME = "ASI1 Debug"

let output: vscode.OutputChannel | null = null
/** Logging allowed at runtime after activate. */
let debugAllowed = false

/** Call synchronously once during activate; registers disposables on context. */
export function activateAsiDebugLog(context: vscode.ExtensionContext): vscode.OutputChannel {
	output = vscode.window.createOutputChannel(CHANNEL_NAME)
	debugAllowed =
		context.extensionMode === vscode.ExtensionMode.Development ||
		process.env.ASI1_DEBUG === "1"

	context.subscriptions.push(
		output,
		new vscode.Disposable(() => {
			output = null
			debugAllowed = false
		}),
	)
	return output
}

function enabled(): boolean {
	return !!(output && debugAllowed)
}

function fmt(level: string, msg: string): string {
	const d = new Date()
	const ts = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
	return `[${ts}] [${level}] ${msg}`
}

function line(level: keyof typeof LABEL, parts: unknown[]): void {
	if (!enabled() || !output) {
		return
	}
	const text = parts
		.map((p) => (typeof p === "string" ? p : p instanceof Error ? p.message : JSON.stringify(p)))
		.join(" ")
	output.appendLine(fmt(LABEL[level], text))
}

const LABEL = {
	info: "INFO",
	warn: "WARN",
	error: "ERROR",
	success: "SUCCESS",
} as const

export const asiDebug = {
	info: (...parts: unknown[]) => line("info", parts),
	warn: (...parts: unknown[]) => line("warn", parts),
	error: (...parts: unknown[]) => line("error", parts),
	success: (...parts: unknown[]) => line("success", parts),
}
