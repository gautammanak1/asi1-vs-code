import type { AsiSayTool } from "@shared/ExtensionMessage";
import { StringRequest } from "@shared/proto/Asi/common";
import { Undo2Icon, EyeIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FileServiceClient } from "@/services/grpc-client";
import { RevertConfirmDialog } from "./RevertConfirmDialog";

function parseRevertResult(raw: string) {
	try {
		return JSON.parse(raw) as {
			success: boolean;
			restoredFiles: string[];
			failedFiles: string[];
			errors: string[];
		};
	} catch {
		return {
			success: false,
			restoredFiles: [] as string[],
			failedFiles: [] as string[],
			errors: ["Invalid response"],
		};
	}
}

export function FetchCoderQuickRevert({
	tool,
	messagePartial,
}: {
	tool: AsiSayTool;
	messagePartial?: boolean;
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [status, setStatus] = useState<"idle" | "working">("idle");
	const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(
		null,
	);

	const checkpointId = tool.fetchCoderCheckpointId;
	const paths = useMemo(
		() =>
			tool.editedPaths && tool.editedPaths.length > 0
				? tool.editedPaths
				: tool.path
					? [tool.path]
					: [],
		[tool.editedPaths, tool.path],
	);

	const openDiffs = useCallback(async () => {
		if (!checkpointId) {
			return;
		}
		for (const filePath of paths) {
			const payload = JSON.stringify({ checkpointId, filePath });
			await FileServiceClient.openFetchCoderCheckpointDiff(
				StringRequest.create({ value: payload }),
			);
			await new Promise((r) => setTimeout(r, 120));
		}
	}, [checkpointId, paths]);

	const doRevert = useCallback(async () => {
		if (!checkpointId) {
			return;
		}
		setStatus("working");
		setBanner(null);
		try {
			const res = await FileServiceClient.revertFetchCoderCheckpoint(
				StringRequest.create({ value: checkpointId }),
			);
			const parsed = parseRevertResult(res.value || "{}");
			if (parsed.success) {
				setBanner({
					kind: "ok",
					text: `Restored ${parsed.restoredFiles.length} file(s) successfully.`,
				});
			} else {
				setBanner({
					kind: "err",
					text: parsed.errors.join("\n") || "Revert failed.",
				});
			}
		} catch (e) {
			setBanner({
				kind: "err",
				text: e instanceof Error ? e.message : String(e),
			});
		} finally {
			setStatus("idle");
			setConfirmOpen(false);
		}
	}, [checkpointId]);

	if (messagePartial || !checkpointId || paths.length === 0) {
		return null;
	}

	return (
		<>
			<div className="quick-revert-bar mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium text-[var(--vscode-foreground)]">
						AI modified {paths.length} file{paths.length === 1 ? "" : "s"}
					</div>
					<div className="truncate text-xs text-[var(--vscode-descriptionForeground)]">
						{paths.slice(0, 3).join(" · ")}
						{paths.length > 3 ? ` · +${paths.length - 3} more` : ""}
					</div>
					{banner && (
						<div
							className={`mt-1 text-xs ${banner.kind === "ok" ? "text-emerald-500" : "text-red-500"}`}
						>
							{banner.text}
						</div>
					)}
				</div>
				<div className="flex shrink-0 gap-2">
					<button
						type="button"
						className="revert-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-sm disabled:opacity-50"
						disabled={status === "working"}
						onClick={() => setConfirmOpen(true)}
					>
						<Undo2Icon className="size-3.5" />
						Undo this
					</button>
					<button
						type="button"
						className="inline-flex items-center gap-1.5 rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-button-secondaryBackground)] px-3 py-1.5 text-sm text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-list-hoverBackground)] disabled:opacity-50"
						disabled={status === "working"}
						onClick={() => openDiffs().catch(console.error)}
					>
						<EyeIcon className="size-3.5" />
						See changes
					</button>
				</div>
			</div>
			<RevertConfirmDialog
				open={confirmOpen}
				title="Revert changes"
				filePaths={paths}
				confirmLabel="Revert now"
				onCancel={() => setConfirmOpen(false)}
				onConfirm={doRevert}
			/>
		</>
	);
}
