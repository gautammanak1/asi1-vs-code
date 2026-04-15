import { ModelFamily } from "@/shared/prompts"
import { AsiDefaultTool } from "@/shared/tools"
import type { AsiToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const id = AsiDefaultTool.SEARCH

const ASI1: AsiToolSpec = {
	variant: ModelFamily.ASI1,
	id,
	name: "search_files",
	description:
		"Request to perform a regex search across files in a specified directory, providing context-rich results. This tool searches for patterns or specific content across multiple files, displaying each match with encapsulating context.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `The path of the directory to search in (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}}. This directory will be recursively searched.`,
			usage: "Directory path here",
		},
		{
			name: "regex",
			required: true,
			instruction: "The regular expression pattern to search for. Uses Rust regex syntax.",
			usage: "Your regex pattern here",
		},
		{
			name: "file_pattern",
			required: false,
			instruction:
				"Glob pattern to filter files (e.g., '*.ts' for TypeScript files). If not provided, it will search all files (*).",
			usage: "file pattern here (optional)",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

export const search_files_variants = [ASI1]
