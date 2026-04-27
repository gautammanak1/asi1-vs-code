/**
 * Distinguish VS Code family vs Cursor for UI copy and telemetry.
 * Does not imply integration with Cursor's native chat (no public API for that).
 */
export type HostAppKind = "vscode" | "cursor" | "unknown";

/**
 * Infer host from `vscode.env.appName` (or tests passing the same string).
 * Empty or missing appName yields `unknown` for auto mode.
 */
export function inferHostAppFromAppName(
	appName: string | undefined,
): HostAppKind {
	if (appName == null || !String(appName).trim()) {
		return "unknown";
	}
	const lower = String(appName).toLowerCase();
	if (lower.includes("cursor")) {
		return "cursor";
	}
	return "vscode";
}

/**
 * @param hostAppSetting - `fetchCoder.hostApp`: `auto` | `vscode` | `cursor`
 * @param appName - `vscode.env.appName` when using auto
 */
export function resolveHostAppKind(
	hostAppSetting: string | undefined,
	appName: string | undefined,
): HostAppKind {
	const s = (hostAppSetting ?? "auto").trim().toLowerCase();
	if (s === "cursor") {
		return "cursor";
	}
	if (s === "vscode") {
		return "vscode";
	}
	return inferHostAppFromAppName(appName);
}
