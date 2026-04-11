import { EmptyRequest, StringRequest } from "@shared/proto/Asi/common";
import { HistoryIcon, SaveIcon, Trash2Icon, Undo2Icon, EyeIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileServiceClient } from "@/services/grpc-client";
import { RevertConfirmDialog } from "./RevertConfirmDialog";
import { revertCheckpointFiles } from "./revertCheckpointFiles";

export type FetchCoderCheckpointFileRow = {
	filePath: string;
	exists: boolean;
	sizeBytes: number;
	encoding: string;
	linesAdded: number;
	linesRemoved: number;
};

export type FetchCoderCheckpointRow = {
	id: string;
	taskId: string;
	messageId: string;
	label: string;
	createdAt: string;
	gitHash?: string;
	type: "auto" | "manual";
	description?: string;
	files: FetchCoderCheckpointFileRow[];
};

function formatAgo(iso: string): string {
	const sec = Math.max(
		0,
		Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
	);
	if (sec < 60) return `${sec}s ago`;
	const m = Math.floor(sec / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 48) return `${h}h ago`;
	const d = Math.floor(h / 24);
	return `${d}d ago`;
}

function parseRevert(raw: string) {
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
			errors: ["Bad response"],
		};
	}
}

const CheckpointPanel: React.FC<{ onDone: () => void }> = ({ onDone }) => {
	const [checkpoints, setCheckpoints] = useState<FetchCoderCheckpointRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(
		null,
	);
	const [revertDialog, setRevertDialog] = useState<{
		mode: "all" | "files";
		cp: FetchCoderCheckpointRow;
		paths: string[];
	} | null>(null);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [selectedFiles, setSelectedFiles] = useState<Record<string, Set<string>>>(
		{},
	);

	const storageLine = useMemo(() => {
		let bytes = 0;
		for (const c of checkpoints) {
			for (const f of c.files) {
				bytes += f.sizeBytes;
			}
			bytes += 512;
		}
		const mb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
		return `${checkpoints.length} checkpoints · ${mb} MB`;
	}, [checkpoints]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await FileServiceClient.listFetchCoderCheckpoints(
				EmptyRequest.create({}),
			);
			const parsed = JSON.parse(res.value || "[]") as FetchCoderCheckpointRow[];
			setCheckpoints(Array.isArray(parsed) ? parsed : []);
		} catch (e) {
			console.error(e);
			setCheckpoints([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load().catch(console.error);
	}, [load]);

	const saveManual = useCallback(async () => {
		const desc = window.prompt("Checkpoint description (optional)") ?? "";
		try {
			const res = await FileServiceClient.saveFetchCoderManualCheckpoint(
				StringRequest.create({ value: desc.trim() || "Manual checkpoint" }),
			);
			if (res.value && res.value !== "{}") {
				setToast({ kind: "ok", text: "Checkpoint saved" });
			}
			await load();
		} catch (e) {
			setToast({
				kind: "err",
				text: e instanceof Error ? e.message : String(e),
			});
		}
	}, [load]);

	const clearAll = useCallback(async () => {
		try {
			await FileServiceClient.clearFetchCoderCheckpoints(EmptyRequest.create({}));
			setToast({ kind: "ok", text: "All checkpoints cleared" });
			await load();
		} catch (e) {
			setToast({
				kind: "err",
				text: e instanceof Error ? e.message : String(e),
			});
		}
	}, [load]);

	const deleteOne = useCallback(
		async (id: string) => {
			if (!window.confirm("Delete this checkpoint?")) {
				return;
			}
			try {
				await FileServiceClient.deleteFetchCoderCheckpoint(
					StringRequest.create({ value: id }),
				);
				await load();
			} catch (e) {
				setToast({
					kind: "err",
					text: e instanceof Error ? e.message : String(e),
				});
			}
		},
		[load],
	);

	const revertAll = useCallback(
		async (cp: FetchCoderCheckpointRow) => {
			try {
				const res = await FileServiceClient.revertFetchCoderCheckpoint(
					StringRequest.create({ value: cp.id }),
				);
				const parsed = parseRevert(res.value || "{}");
				if (parsed.success) {
					setToast({
						kind: "ok",
						text: `Restored ${parsed.restoredFiles.length} file(s) successfully`,
					});
				} else {
					setToast({
						kind: "err",
						text: parsed.errors.join("\n") || "Revert failed",
					});
				}
				await load();
			} catch (e) {
				setToast({
					kind: "err",
					text: e instanceof Error ? e.message : String(e),
				});
			}
		},
		[load],
	);

	const openDiff = useCallback(async (checkpointId: string, filePath: string) => {
		const payload = JSON.stringify({ checkpointId, filePath });
		await FileServiceClient.openFetchCoderCheckpointDiff(
			StringRequest.create({ value: payload }),
		);
	}, []);

	const toggleSelect = useCallback((cpId: string, filePath: string) => {
		setSelectedFiles((prev) => {
			const next = { ...prev };
			const set = new Set(next[cpId] || []);
			if (set.has(filePath)) {
				set.delete(filePath);
			} else {
				set.add(filePath);
			}
			next[cpId] = set;
			return next;
		});
	}, []);

	return (
		<div className="checkpoint-panel flex h-full w-full flex-col bg-[#1e1e1e]">
			<div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-[var(--vscode-panel-border)] px-3 py-2">
				<div className="flex items-center gap-2">
					<HistoryIcon className="size-4 text-[var(--vscode-foreground)]" />
					<h1 className="text-sm font-semibold text-[var(--vscode-foreground)]">
						Checkpoints
					</h1>
				</div>
				<button
					type="button"
					className="text-xs text-[var(--vscode-textLink-foreground)] hover:underline"
					onClick={onDone}
				>
					Close
				</button>
			</div>

			<div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-[var(--vscode-panel-border)] px-3 py-2">
				<button
					type="button"
					className="inline-flex items-center gap-1 rounded border border-[var(--vscode-panel-border)] bg-[var(--vscode-button-secondaryBackground)] px-2 py-1 text-xs text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-list-hoverBackground)]"
					onClick={() => saveManual().catch(console.error)}
				>
					<SaveIcon className="size-3.5" />
					Save checkpoint
				</button>
				<button
					type="button"
					className="inline-flex items-center gap-1 rounded border border-[var(--vscode-panel-border)] px-2 py-1 text-xs text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]"
					onClick={() => {
						if (
							window.confirm(
								"Delete all Fetch Coder checkpoints for this workspace? This cannot be undone.",
							)
						) {
							clearAll().catch(console.error);
						}
					}}
				>
					<Trash2Icon className="size-3.5" />
					Clear all
				</button>
				<span className="text-xs text-[var(--vscode-descriptionForeground)]">
					{storageLine}
				</span>
			</div>

			{toast && (
				<div
					className={`mx-3 mt-2 rounded px-2 py-1 text-xs ${
						toast.kind === "ok"
							? "bg-emerald-900/40 text-emerald-300"
							: "bg-red-900/40 text-red-300"
					}`}
				>
					{toast.text}
				</div>
			)}

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
				{loading ? (
					<p className="text-sm text-[var(--vscode-descriptionForeground)]">
						Loading…
					</p>
				) : checkpoints.length === 0 ? (
					<p className="text-sm text-[var(--vscode-descriptionForeground)]">
						No checkpoints yet. They are created automatically before AI edits.
					</p>
				) : (
					checkpoints.map((cp) => {
						const isOpen = expanded[cp.id];
						const sel = selectedFiles[cp.id] || new Set();
						return (
							<div key={cp.id} className="checkpoint-card mb-2">
								<div className="mb-2 flex flex-wrap items-start justify-between gap-2">
									<div>
										<div className="mb-1 flex flex-wrap items-center gap-2">
											<span
												className={
													cp.type === "manual"
														? "checkpoint-badge-manual"
														: "checkpoint-badge-auto"
												}
											>
												{cp.type}
											</span>
											<span className="text-xs text-[var(--vscode-descriptionForeground)]">
												{formatAgo(cp.createdAt)}
											</span>
										</div>
										<div className="text-sm font-medium text-[var(--vscode-foreground)]">
											{cp.label}
										</div>
										<div className="text-xs text-[var(--vscode-descriptionForeground)]">
											Task: {cp.taskId}
											{cp.gitHash ? ` · ${cp.gitHash.slice(0, 7)}` : ""}
										</div>
									</div>
									<div className="flex flex-wrap gap-1">
										<button
											type="button"
											className="revert-btn inline-flex items-center gap-1 px-2 py-1 text-xs"
											onClick={() =>
												setRevertDialog({ mode: "all", cp, paths: cp.files.map((f) => f.filePath) })
											}
										>
											<Undo2Icon className="size-3" />
											Revert all
										</button>
										<button
											type="button"
											className="inline-flex items-center gap-1 rounded border border-[var(--vscode-panel-border)] px-2 py-1 text-xs hover:bg-[var(--vscode-list-hoverBackground)]"
											onClick={() =>
												setExpanded((e) => ({ ...e, [cp.id]: !isOpen }))
											}
										>
											<EyeIcon className="size-3" />
											{isOpen ? "Hide files" : "Files"}
										</button>
										<button
											type="button"
											className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-list-hoverBackground)]"
											onClick={() => deleteOne(cp.id).catch(console.error)}
										>
											<Trash2Icon className="size-3" />
										</button>
									</div>
								</div>

								{isOpen && (
									<div className="mt-2 space-y-1 border-t border-[var(--vscode-panel-border)] pt-2">
										<div className="mb-1 text-xs font-medium text-[var(--vscode-descriptionForeground)]">
											FILES
										</div>
										{cp.files.map((f) => (
											<div
												key={f.filePath}
												className="flex flex-wrap items-center gap-2 text-xs"
											>
												<label className="flex cursor-pointer items-center gap-1">
													<input
														type="checkbox"
														checked={sel.has(f.filePath)}
														onChange={() => toggleSelect(cp.id, f.filePath)}
													/>
													<button
														type="button"
														className="font-mono text-left text-[var(--vscode-textLink-foreground)] hover:underline"
														onClick={() => openDiff(cp.id, f.filePath).catch(console.error)}
													>
														{f.filePath}
													</button>
												</label>
												<span className="file-diff-stat-add">+{f.linesAdded}</span>
												<span className="file-diff-stat-del">-{f.linesRemoved}</span>
												<button
													type="button"
													className="ml-auto text-[var(--vscode-errorForeground)] hover:underline"
													onClick={() =>
														setRevertDialog({
															mode: "files",
															cp,
															paths: [f.filePath],
														})
													}
												>
													Revert file
												</button>
											</div>
										))}
										{sel.size > 0 && (
											<button
												type="button"
												className="revert-btn mt-2 px-2 py-1 text-xs"
												onClick={() =>
													setRevertDialog({
														mode: "files",
														cp,
														paths: Array.from(sel),
													})
												}
											>
												Revert selected ({sel.size})
											</button>
										)}
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			<RevertConfirmDialog
				open={!!revertDialog}
				title="Revert changes"
				filePaths={revertDialog?.paths ?? []}
				confirmLabel="Revert now"
				onCancel={() => setRevertDialog(null)}
				onConfirm={async () => {
					if (!revertDialog) {
						return;
					}
					if (revertDialog.mode === "all") {
						await revertAll(revertDialog.cp);
					} else {
						const r = await revertCheckpointFiles(
							revertDialog.cp.id,
							revertDialog.paths,
						);
						if (r.success) {
							setToast({
								kind: "ok",
								text: `Restored ${r.restoredFiles.length} file(s)`,
							});
						} else {
							setToast({ kind: "err", text: r.errors.join("\n") || "Failed" });
						}
						await load();
					}
					setRevertDialog(null);
				}}
			/>
		</div>
	);
};

export default CheckpointPanel;
