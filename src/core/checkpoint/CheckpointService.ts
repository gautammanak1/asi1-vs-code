import { execSync } from "node:child_process"
import * as crypto from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import fs from "node:fs/promises"
import * as path from "node:path"
import { fileExistsAtPath } from "@utils/fs"
import { isBinaryFile } from "isbinaryfile"
import { Logger } from "@/shared/services/Logger"

export interface FileSnapshot {
	filePath: string
	content: string
	exists: boolean
	encoding: "utf8" | "binary"
	sizeBytes: number
}

export interface Checkpoint {
	id: string
	taskId: string
	messageId: string
	label: string
	createdAt: string
	files: FileSnapshot[]
	gitHash?: string
	type: "auto" | "manual"
	description?: string
}

export interface RevertResult {
	success: boolean
	restoredFiles: string[]
	failedFiles: string[]
	errors: string[]
}

const CHECKPOINT_DIR = path.join(".fetch-coder", "checkpoints")
const GITIGNORE_ENTRY = ".fetch-coder/checkpoints/"
const MAX_CHECKPOINTS = 50
const MAX_FILE_SIZE_MB = 10
const MAX_TOTAL_STORAGE_MB = 100

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	"out",
	".fetch-coder",
	".next",
	"coverage",
	"__pycache__",
])

export class CheckpointService {
	private readonly workspaceRoot: string

	constructor(workspaceRoot: string) {
		this.workspaceRoot = workspaceRoot
	}

	private shouldSkipPath(rel: string): boolean {
		const norm = rel.replace(/\\/g, "/")
		const parts = norm.split("/").filter(Boolean)
		return parts.some((p) => SKIP_DIRS.has(p) || p.startsWith(".fetch-coder"))
	}

	private async snapshotFile(relPath: string): Promise<FileSnapshot | null> {
		if (this.shouldSkipPath(relPath)) {
			return null
		}
		const abs = path.isAbsolute(relPath) ? relPath : path.join(this.workspaceRoot, relPath)
		const rel = path.relative(this.workspaceRoot, abs)
		if (this.shouldSkipPath(rel)) {
			return null
		}
		try {
			const st = await fs.stat(abs)
			if (!st.isFile()) {
				return null
			}
			if (st.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
				return null
			}
			if (await isBinaryFile(abs).catch(() => false)) {
				return null
			}
			const content = await fs.readFile(abs, "utf8")
			return {
				filePath: rel.split(path.sep).join("/"),
				content,
				exists: true,
				encoding: "utf8",
				sizeBytes: Buffer.byteLength(content, "utf8"),
			}
		} catch {
			return {
				filePath: rel.split(path.sep).join("/"),
				content: "",
				exists: false,
				encoding: "utf8",
				sizeBytes: 0,
			}
		}
	}

	async createAutoCheckpoint(
		taskId: string,
		messageId: string,
		filePaths: string[],
		opts?: { label?: string },
	): Promise<Checkpoint> {
		const id = `chk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
		const snapshots: FileSnapshot[] = []
		const seen = new Set<string>()

		for (const fp of filePaths) {
			if (!fp || seen.has(fp)) {
				continue
			}
			seen.add(fp)
			const snap = await this.snapshotFile(fp)
			if (snap) {
				snapshots.push(snap)
			}
		}

		const gitHash = await this.getGitHash()
		const label = opts?.label ?? this.generateLabel(filePaths)

		const checkpoint: Checkpoint = {
			id,
			taskId,
			messageId,
			label,
			createdAt: new Date().toISOString(),
			files: snapshots,
			gitHash,
			type: "auto",
		}

		await this.saveCheckpoint(checkpoint)
		await this.pruneOldCheckpoints()
		return checkpoint
	}

	async createManualCheckpoint(description: string): Promise<Checkpoint> {
		const files = await this.getAllWorkspaceFiles()
		const id = `chk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
		const snapshots: FileSnapshot[] = []
		for (const fp of files) {
			const snap = await this.snapshotFile(fp)
			if (snap && snap.encoding === "utf8") {
				snapshots.push(snap)
			}
		}
		const checkpoint: Checkpoint = {
			id,
			taskId: "manual",
			messageId: "manual",
			label: description.slice(0, 120) || "Manual checkpoint",
			createdAt: new Date().toISOString(),
			files: snapshots,
			gitHash: await this.getGitHash(),
			type: "manual",
			description,
		}
		await this.saveCheckpoint(checkpoint)
		await this.pruneOldCheckpoints()
		return checkpoint
	}

	async revertToCheckpoint(checkpointId: string): Promise<RevertResult> {
		const checkpoint = await this.loadCheckpoint(checkpointId)
		if (!checkpoint) {
			return {
				success: false,
				restoredFiles: [],
				failedFiles: [],
				errors: [`Checkpoint ${checkpointId} not found`],
			}
		}
		return this.revertSnapshots(checkpoint.files)
	}

	async revertFiles(checkpointId: string, filePaths: string[]): Promise<RevertResult> {
		const checkpoint = await this.loadCheckpoint(checkpointId)
		if (!checkpoint) {
			return { success: false, restoredFiles: [], failedFiles: [], errors: ["Checkpoint not found"] }
		}
		const want = new Set(filePaths.map((p) => p.split(path.sep).join("/")))
		const filtered = checkpoint.files.filter((f) => want.has(f.filePath))
		return this.revertSnapshots(filtered)
	}

	private async revertSnapshots(snapshots: FileSnapshot[]): Promise<RevertResult> {
		const result: RevertResult = {
			success: true,
			restoredFiles: [],
			failedFiles: [],
			errors: [],
		}

		for (const snapshot of snapshots) {
			const absPath = path.join(this.workspaceRoot, snapshot.filePath)
			try {
				if (snapshot.encoding === "binary") {
					result.failedFiles.push(snapshot.filePath)
					result.errors.push(`${snapshot.filePath}: binary snapshot cannot be restored as text`)
					result.success = false
					continue
				}
				if (!snapshot.exists) {
					if (await fileExistsAtPath(absPath)) {
						await fs.unlink(absPath)
					}
				} else {
					await fs.mkdir(path.dirname(absPath), { recursive: true })
					await fs.writeFile(absPath, snapshot.content, "utf8")
				}
				result.restoredFiles.push(snapshot.filePath)
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e)
				result.failedFiles.push(snapshot.filePath)
				result.errors.push(`${snapshot.filePath}: ${msg}`)
				result.success = false
			}
		}

		return result
	}

	async getDiff(
		checkpointId: string,
		filePath: string,
	): Promise<{ before: string; after: string; filePath: string }> {
		const checkpoint = await this.loadCheckpoint(checkpointId)
		const norm = filePath.split(path.sep).join("/")
		const snapshot = checkpoint?.files.find((f) => f.filePath === norm)
		const abs = path.join(this.workspaceRoot, norm)
		let after = ""
		if (await fileExistsAtPath(abs)) {
			after = await fs.readFile(abs, "utf8")
		}
		return {
			before: snapshot?.encoding === "utf8" ? snapshot.content : "",
			after,
			filePath: norm,
		}
	}

	async listCheckpoints(): Promise<Checkpoint[]> {
		const dir = path.join(this.workspaceRoot, CHECKPOINT_DIR)
		if (!(await fileExistsAtPath(dir))) {
			return []
		}
		const names = await fs.readdir(dir)
		const out: Checkpoint[] = []
		for (const f of names) {
			if (!f.endsWith(".json")) {
				continue
			}
			try {
				const raw = await fs.readFile(path.join(dir, f), "utf8")
				const c = JSON.parse(raw) as Checkpoint
				out.push(c)
			} catch (e) {
				Logger.warn(`[CheckpointService] skip bad checkpoint file ${f}`, e)
			}
		}
		return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
	}

	async deleteCheckpoint(checkpointId: string): Promise<void> {
		const filePath = path.join(this.workspaceRoot, CHECKPOINT_DIR, `${checkpointId}.json`)
		if (await fileExistsAtPath(filePath)) {
			await fs.unlink(filePath)
		}
	}

	async clearAll(type?: "auto" | "manual"): Promise<number> {
		const all = await this.listCheckpoints()
		let n = 0
		for (const c of all) {
			if (type && c.type !== type) {
				continue
			}
			await this.deleteCheckpoint(c.id)
			n++
		}
		return n
	}

	async getStorageInfo(): Promise<{ count: number; totalSizeMB: number }> {
		const checkpoints = await this.listCheckpoints()
		let totalBytes = 0
		for (const c of checkpoints) {
			for (const f of c.files) {
				totalBytes += f.sizeBytes
			}
			totalBytes += 512
		}
		return {
			count: checkpoints.length,
			totalSizeMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
		}
	}

	private async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
		const dir = path.join(this.workspaceRoot, CHECKPOINT_DIR)
		await fs.mkdir(dir, { recursive: true })
		await this.ensureGitIgnore()
		const filePath = path.join(dir, `${checkpoint.id}.json`)
		await fs.writeFile(filePath, JSON.stringify(checkpoint, null, 2), "utf8")
	}

	async loadCheckpoint(id: string): Promise<Checkpoint | null> {
		const filePath = path.join(this.workspaceRoot, CHECKPOINT_DIR, `${id}.json`)
		if (!(await fileExistsAtPath(filePath))) {
			return null
		}
		try {
			const raw = await fs.readFile(filePath, "utf8")
			return JSON.parse(raw) as Checkpoint
		} catch {
			return null
		}
	}

	/** Sync load for virtual document provider */
	loadCheckpointSync(id: string): Checkpoint | null {
		const filePath = path.join(this.workspaceRoot, CHECKPOINT_DIR, `${id}.json`)
		try {
			if (!existsSync(filePath)) {
				return null
			}
			return JSON.parse(readFileSync(filePath, "utf8")) as Checkpoint
		} catch {
			return null
		}
	}

	private async pruneOldCheckpoints(): Promise<void> {
		let checkpoints = await this.listCheckpoints()
		const totalMb = async (): Promise<number> => {
			const { totalSizeMB } = await this.getStorageInfo()
			return totalSizeMB
		}

		let mb = await totalMb()
		// Delete oldest AUTO checkpoints until under limits
		checkpoints = checkpoints.filter((c) => c.type === "auto")
		checkpoints.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

		while (
			(checkpoints.length > MAX_CHECKPOINTS || mb > MAX_TOTAL_STORAGE_MB) &&
			checkpoints.length > 0
		) {
			const victim = checkpoints.shift()!
			await this.deleteCheckpoint(victim.id)
			mb = await totalMb()
		}
	}

	private async getGitHash(): Promise<string | undefined> {
		try {
			return execSync("git rev-parse HEAD", {
				cwd: this.workspaceRoot,
				encoding: "utf8",
			}).trim()
		} catch {
			return undefined
		}
	}

	private generateLabel(filePaths: string[]): string {
		const names = filePaths
			.map((f) => path.basename(f))
			.filter(Boolean)
			.slice(0, 3)
			.join(", ")
		const more = filePaths.length > 3 ? ` +${filePaths.length - 3} more` : ""
		return names ? `Modified ${names}${more}` : "Checkpoint"
	}

	private async ensureGitIgnore(): Promise<void> {
		const gitignorePath = path.join(this.workspaceRoot, ".gitignore")
		try {
			if (await fileExistsAtPath(gitignorePath)) {
				const content = await fs.readFile(gitignorePath, "utf8")
				if (!content.includes(GITIGNORE_ENTRY)) {
					await fs.appendFile(gitignorePath, `\n${GITIGNORE_ENTRY}\n`)
				}
			}
		} catch {
			// ignore
		}
	}

	private async getAllWorkspaceFiles(): Promise<string[]> {
		const out: string[] = []
		const walk = async (dir: string) => {
			let entries: import("node:fs").Dirent[]
			try {
				entries = await fs.readdir(dir, { withFileTypes: true })
			} catch {
				return
			}
			for (const ent of entries) {
				const name = ent.name
				if (SKIP_DIRS.has(name)) {
					continue
				}
				const full = path.join(dir, name)
				const rel = path.relative(this.workspaceRoot, full)
				if (this.shouldSkipPath(rel)) {
					continue
				}
				if (ent.isDirectory()) {
					await walk(full)
				} else if (ent.isFile()) {
					out.push(rel)
				}
			}
		}
		await walk(this.workspaceRoot)
		return out
	}
}

const cache = new Map<string, CheckpointService>()

export function getCheckpointService(workspaceRoot: string | undefined): CheckpointService | undefined {
	if (!workspaceRoot) {
		return undefined
	}
	let s = cache.get(workspaceRoot)
	if (!s) {
		s = new CheckpointService(workspaceRoot)
		cache.set(workspaceRoot, s)
	}
	return s
}
