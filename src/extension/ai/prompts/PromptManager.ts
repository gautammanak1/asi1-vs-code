import * as vscode from "vscode";
import {
	DEFAULT_QUICK_ACTION_TEMPLATES,
	interpolateQuickActionTemplate,
	type QuickActionKind,
	type QuickActionTemplateVars,
} from "./quickActionTemplates";

const CONFIG_SECTION = "fetchCoder";

function getOverrides(): Partial<Record<QuickActionKind, string>> {
	const raw = vscode.workspace
		.getConfiguration(CONFIG_SECTION)
		.get<unknown>("quickActionPrompts");
	if (!raw || typeof raw !== "object") {
		return {};
	}
	const out: Partial<Record<QuickActionKind, string>> = {};
	for (const key of Object.keys(
		DEFAULT_QUICK_ACTION_TEMPLATES,
	) as QuickActionKind[]) {
		const v = (raw as Record<string, unknown>)[key];
		if (typeof v === "string" && v.trim()) {
			out[key] = v;
		}
	}
	return out;
}

/**
 * Resolves the final prompt for a quick action from defaults + user overrides in Settings.
 */
export function resolveQuickActionPrompt(
	kind: QuickActionKind,
	vars: QuickActionTemplateVars,
): string {
	const overrides = getOverrides();
	const template = overrides[kind] ?? DEFAULT_QUICK_ACTION_TEMPLATES[kind];
	return interpolateQuickActionTemplate(template, vars);
}
