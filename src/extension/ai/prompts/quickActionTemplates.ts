/**
 * Default quick-action templates. Override via Settings: `fetchCoder.quickActionPrompts`.
 * Supported placeholders: {{fileMention}}, {{language}}, {{selectedText}}, {{problemsString}}.
 */
export type QuickActionKind =
	| "explain"
	| "fix"
	| "improve"
	| "improveNotebook"
	| "refactor"
	| "refactorNotebook";

export const DEFAULT_QUICK_ACTION_TEMPLATES: Record<QuickActionKind, string> = {
	explain: `Explain the following code from {{fileMention}}:
\`\`\`{{language}}
{{selectedText}}
\`\`\``,
	fix: `Fix the following code in {{fileMention}}
\`\`\`{{language}}
{{selectedText}}
\`\`\`

Problems:
{{problemsString}}`,
	improve: `Improve the following code from {{fileMention}} (e.g., suggest refactorings, optimizations, or better practices):
\`\`\`{{language}}
{{selectedText}}
\`\`\``,
	improveNotebook: `Improve the current code in the current notebook cell from {{fileMention}}. Suggest refactorings, optimizations, or better practices based on the cell context.`,
	refactor: `Refactor the following code from {{fileMention}} for clarity, modularity, and maintainability. Preserve behavior unless improving safety or correctness:
\`\`\`{{language}}
{{selectedText}}
\`\`\``,
	refactorNotebook: `Refactor the current notebook cell code from {{fileMention}} for clarity and maintainability. Preserve behavior unless improving safety or correctness.`,
};

export type QuickActionTemplateVars = {
	fileMention: string;
	language: string;
	selectedText: string;
	problemsString: string;
};

export function interpolateQuickActionTemplate(
	template: string,
	vars: QuickActionTemplateVars,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
		const v = vars[key as keyof QuickActionTemplateVars];
		return v !== undefined && v !== null ? String(v) : "";
	});
}
