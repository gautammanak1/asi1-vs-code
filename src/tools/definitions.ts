export const ASI_BUILTIN_TOOLS: object[] = [
  {
    type: "function",
    function: {
      name: "workspace_read_file",
      description: "Read a UTF-8 text file from the open VS Code workspace. Path is relative to the workspace folder.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. src/index.ts" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_search_files",
      description: "Find files matching a glob pattern (e.g. **/*.ts). Returns file paths.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Glob relative to workspace root" },
          maxResults: { type: "integer", description: "Max files to return (default 50, max 100)" },
        },
        required: ["pattern"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_list_directory",
      description: "List files and directories inside a workspace directory.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path" },
          maxResults: { type: "integer", description: "Max entries to return (default 100, max 300)" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_scan_recursive",
      description: "Recursively scan the workspace tree and return all file paths. Skips node_modules, .git, dist, out.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Starting directory relative to workspace root (empty string = root)" },
          maxDepth: { type: "integer", description: "Max recursion depth (default 5)" },
          maxFiles: { type: "integer", description: "Max files to return (default 500)" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_write_file",
      description: "Create or overwrite a UTF-8 text file. Creates parent directories automatically. Use for new files or complete rewrites.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path, e.g. src/new-file.ts" },
          content: { type: "string", description: "Full file content to write" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_create_directory",
      description: "Create a directory (and parent directories) inside the workspace.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path to create" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_delete_file",
      description: "Delete a file from the workspace. Requires user confirmation before deletion.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to delete" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_rename_file",
      description: "Rename or move a file within the workspace. Requires user confirmation.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          fromPath: { type: "string", description: "Current relative path of the file" },
          toPath: { type: "string", description: "New relative path for the file" },
        },
        required: ["fromPath", "toPath"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_patch_file",
      description: "Apply a targeted search-and-replace patch to an existing file. Safer than full overwrite for small edits. Reads the file, finds the search text, and replaces it.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to patch" },
          search: { type: "string", description: "Exact text to find (first match)" },
          replace: { type: "string", description: "Replacement text" },
          regex: { type: "boolean", description: "Treat search as regex pattern (default false)" },
          all: { type: "boolean", description: "Replace all matches instead of just the first (default false)" },
        },
        required: ["path", "search", "replace"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_search_text",
      description: "Search file contents for a text or regex pattern across the workspace. Returns matching lines with file paths and line numbers.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text or regex pattern" },
          include: { type: "string", description: "Glob filter to limit search scope, e.g. **/*.ts" },
          maxResults: { type: "integer", description: "Max matches to return (default 30, max 100)" },
          regex: { type: "boolean", description: "Treat query as regex pattern (default false)" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_terminal_command",
      description: "Execute a shell command in the workspace root. Allowed commands include: npm, npx, node, git, python, pip, tsc, eslint, prettier, mkdir, touch, cp, mv, curl, docker, make, cargo, go, java, ruby, php, swift, and more. Dangerous commands (rm -rf /, sudo rm, etc.) are blocked.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to execute, e.g. 'npm install express'" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
  },
];
