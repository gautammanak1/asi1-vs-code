import { XIcon } from "lucide-react";

export type RevertConfirmDialogProps = {
	open: boolean;
	title: string;
	filePaths: string[];
	warning?: string;
	confirmLabel: string;
	onCancel: () => void;
	onConfirm: () => void;
};

export function RevertConfirmDialog({
	open,
	title,
	filePaths,
	warning = "Current changes will be lost. Save a checkpoint first if you need a backup.",
	confirmLabel,
	onCancel,
	onConfirm,
}: RevertConfirmDialogProps) {
	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
			<div
				className="checkpoint-card max-h-[85vh] w-full max-w-md overflow-y-auto bg-[var(--vscode-editor-background)] shadow-lg"
				role="dialog"
				aria-modal="true"
				aria-labelledby="revert-confirm-title"
			>
				<div className="mb-3 flex items-start justify-between gap-2">
					<h2
						id="revert-confirm-title"
						className="text-base font-semibold text-[var(--vscode-foreground)]"
					>
						{title}
					</h2>
					<button
						type="button"
						className="rounded p-1 text-[var(--vscode-foreground)] opacity-70 hover:opacity-100"
						onClick={onCancel}
						aria-label="Close"
					>
						<XIcon className="size-4" />
					</button>
				</div>
				<p className="mb-2 text-sm text-[var(--vscode-descriptionForeground)]">
					This will restore {filePaths.length} file
					{filePaths.length === 1 ? "" : "s"}:
				</p>
				<ul className="mb-3 max-h-40 list-none space-y-1 overflow-y-auto rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-editorWidget-background)] p-2 text-sm">
					{filePaths.map((p) => (
						<li key={p} className="font-mono text-[var(--vscode-foreground)]">
							{p}
						</li>
					))}
				</ul>
				<p className="mb-4 text-sm text-[var(--vscode-editorWarning-foreground)]">
					⚠️ {warning}
				</p>
				<div className="flex justify-end gap-2">
					<button
						type="button"
						className="rounded border border-[var(--vscode-panel-border)] px-3 py-1.5 text-sm text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]"
						onClick={onCancel}
					>
						Cancel
					</button>
					<button type="button" className="revert-btn text-sm" onClick={onConfirm}>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
