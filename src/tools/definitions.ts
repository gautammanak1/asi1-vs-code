export const ASI_BUILTIN_TOOLS: object[] = [
  {
    type: "function",
    function: {
      name: "workspace_read_file",
      description: "Read a UTF-8 text file from the open VS Code workspace. Path is relative to the workspace folder.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. src/index.ts" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_search_files",
      description: "Find files matching a glob pattern (e.g. **/*.ts).",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob relative to workspace root" },
          maxResults: { type: "integer", description: "Max files (default 50, max 100)" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_list_directory",
      description: "List files/directories inside a workspace directory.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path" },
          maxResults: { type: "integer", description: "Max entries (default 100, max 300)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_scan_recursive",
      description: "Recursively scan the workspace tree and return all file paths. Skips node_modules, .git, dist, out.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Starting directory (empty = root)" },
          maxDepth: { type: "integer", description: "Max recursion depth (default 5)" },
          maxFiles: { type: "integer", description: "Max files to return (default 500)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_write_file",
      description: "Create or overwrite a UTF-8 text file. Creates parent directories automatically.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. src/new-file.ts" },
          content: { type: "string", description: "Full file content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_create_directory",
      description: "Create a directory (and parent directories) inside the workspace.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_delete_file",
      description: "Delete a file from the workspace. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to delete" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_rename_file",
      description: "Rename or move a file within the workspace. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          fromPath: { type: "string", description: "Current relative path" },
          toPath: { type: "string", description: "New relative path" },
        },
        required: ["fromPath", "toPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_patch_file",
      description: "Apply a targeted search-and-replace patch to an existing file. Safer than full overwrite for small edits.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path" },
          search: { type: "string", description: "Exact text to find (first match)" },
          replace: { type: "string", description: "Replacement text" },
          regex: { type: "boolean", description: "Treat search as regex (default false)" },
          all: { type: "boolean", description: "Replace all matches (default false)" },
        },
        required: ["path", "search", "replace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_search_text",
      description: "Search file contents for a text or regex pattern across the workspace.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text or regex" },
          include: { type: "string", description: "Glob filter, e.g. **/*.ts" },
          maxResults: { type: "integer", description: "Max matches (default 30, max 100)" },
          regex: { type: "boolean", description: "Treat query as regex (default false)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_terminal_command",
      description: "Execute an allowlisted shell command in the workspace root. Use for npm, git, node, python, tsc, etc.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command, e.g. 'npm install'" },
        },
        required: ["command"],
      },
    },
  },
];
