import fs from "fs/promises"
import path from "path"
import { fileExistsAtPath } from "@/utils/fs"

const MEMORY_RELATIVE = path.join(".fetch-coder", "memory.md")
const MAX_MEMORY_IN_PROMPT = 12_000

export function getFetchCoderMemoryFilePath(workspaceRoot: string): string {
	return path.join(workspaceRoot, MEMORY_RELATIVE)
}

export async function readFetchCoderWorkspaceMemorySummary(cwd: string | undefined): Promise<string | undefined> {
	if (!cwd) {
		return undefined
	}
	const filePath = getFetchCoderMemoryFilePath(cwd)
	if (!(await fileExistsAtPath(filePath))) {
		return undefined
	}
	const raw = await fs.readFile(filePath, "utf8")
	const trimmed = raw.trim()
	if (!trimmed) {
		return undefined
	}
	if (trimmed.length > MAX_MEMORY_IN_PROMPT) {
		return `${trimmed.slice(0, MAX_MEMORY_IN_PROMPT)}\n\n[Workspace memory truncated for prompt size.]`
	}
	return trimmed
}

export async function appendFetchCoderWorkspaceMemoryEntry(workspaceRoot: string, entry: string): Promise<void> {
	const dir = path.join(workspaceRoot, ".fetch-coder")
	await fs.mkdir(dir, { recursive: true })
	const filePath = path.join(dir, "memory.md")
	const line = entry.replace(/\s+/g, " ").trim()
	const stamp = new Date().toISOString()
	const block = `\n\n- **${stamp}** ${line}\n`
	const exists = await fileExistsAtPath(filePath)
	if (!exists) {
		await fs.writeFile(
			filePath,
			`# Workspace memory\n\nThis file is maintained by Fetch Coder. The assistant reads it at the start of each turn.\n${block}`,
			"utf8",
		)
		return
	}
	await fs.appendFile(filePath, block, "utf8")
}
