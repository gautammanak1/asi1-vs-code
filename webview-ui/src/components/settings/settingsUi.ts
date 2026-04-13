/**
 * Shared layout + surface classes for Settings and similar full-screen panels (e.g. MCP).
 * Keeps borders, radius, and typography consistent with the chat composer refresh.
 */
export const settingsUi = {
	card: "rounded-xl border border-(--vscode-widget-border) bg-(--vscode-input-background)/90 p-4 shadow-none",
	cardMuted:
		"rounded-lg border border-(--vscode-widget-border)/70 bg-(--vscode-textBlockQuote-background)/50 p-3",
	groupLabel:
		"text-[11px] font-semibold uppercase tracking-wider text-(--vscode-descriptionForeground) mb-3",
	groupLabelWarning:
		"text-[11px] font-semibold uppercase tracking-wider text-(--vscode-inputValidation-warningForeground) mb-3",
	formLabel:
		"text-[13px] font-medium text-(--vscode-foreground) block mb-1.5",
	hint: "text-xs text-(--vscode-descriptionForeground) leading-relaxed m-0",
	stack: "flex flex-col gap-4",
	/** Settings primary column */
	sectionColumn: "flex flex-col gap-4 px-5 py-1 pb-10 max-w-3xl",
	sidebarNavInactive:
		"mx-1.5 mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-(--vscode-descriptionForeground) transition-colors hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-foreground)",
	sidebarNavActive:
		"mx-1.5 mb-0.5 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-(--vscode-foreground) bg-(--vscode-list-activeSelectionBackground) border border-(--vscode-widget-border)/60 shadow-sm",
} as const;
