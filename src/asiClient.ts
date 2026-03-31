import * as vscode from "vscode";

/** User/assistant turns for UI (plain text only). */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** Messages sent to ASI:One (OpenAI-compatible), including tool calls and tool results. */
export type ApiChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface AsiCompletionResult {
  content: string;
  raw?: unknown;
}

let getSecretKey: (() => Thenable<string | undefined>) | undefined;
let getKeyFromExtensionFile: (() => string | undefined) | undefined;

export function registerApiKeySecret(getter: () => Thenable<string | undefined>): void {
  getSecretKey = getter;
}

export function registerApiKeyFromExtensionFile(getter: () => string | undefined): void {
  getKeyFromExtensionFile = getter;
}

export async function isApiKeyConfigured(): Promise<boolean> {
  const k = await resolveApiKey();
  return Boolean(k?.trim());
}

async function resolveApiKey(): Promise<string | undefined> {
  if (getSecretKey) {
    const fromSecret = await Promise.resolve(getSecretKey());
    if (fromSecret?.trim()) {
      return fromSecret.trim();
    }
  }
  if (getKeyFromExtensionFile) {
    const fromFile = getKeyFromExtensionFile()?.trim();
    if (fromFile) {
      return fromFile;
    }
  }
  const fromSettings = vscode.workspace
    .getConfiguration("asiAssistant")
    .get<string>("apiKey")
    ?.trim();
  if (fromSettings) {
    return fromSettings;
  }
  return process.env.ASI_ONE_API_KEY?.trim() || undefined;
}

function readConfig() {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const url = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const model = config.get<string>("model") ?? "asi1";
  const webSearch = config.get<boolean>("webSearch") !== false;
  const agenticSession = config.get<boolean>("agenticSession") === true;
  return { url, model, webSearch, agenticSession };
}

/** Built-in tools executed in the extension (workspace). */
export const ASI_BUILTIN_TOOLS: object[] = [
  {
    type: "function",
    function: {
      name: "workspace_read_file",
      description:
        "Read a UTF-8 text file from the open VS Code workspace. Path is relative to the workspace folder.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path, e.g. src/index.ts or package.json",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "workspace_search_files",
      description:
        "Find files under the workspace root matching a glob pattern (e.g. **/*.ts, **/README.md).",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: "Glob relative to workspace root",
          },
          maxResults: {
            type: "integer",
            description: "Max files to return (default 50, max 100)",
          },
        },
        required: ["pattern"],
      },
    },
  },
];

async function executeBuiltinTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: "Invalid JSON arguments for tool" });
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return JSON.stringify({
      error: "No workspace folder open. Open a folder to use workspace tools.",
    });
  }
  const root = folders[0].uri;

  if (name === "workspace_read_file") {
    const rel = typeof args.path === "string" ? args.path : "";
    if (!rel || rel.includes("..")) {
      return JSON.stringify({ error: "Invalid or unsafe path" });
    }
    const uri = vscode.Uri.joinPath(root, rel);
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const max = 200_000;
      const clipped = text.length > max ? text.slice(0, max) + "\n… [truncated]" : text;
      return JSON.stringify({ path: rel, content: clipped });
    } catch (e) {
      return JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
        path: rel,
      });
    }
  }

  if (name === "workspace_search_files") {
    const pattern =
      typeof args.pattern === "string" ? args.pattern : "**/*";
    const maxN = Math.min(
      100,
      typeof args.maxResults === "number" && args.maxResults > 0 ? args.maxResults : 50
    );
    try {
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folders[0], pattern),
        "**/node_modules/**",
        maxN
      );
      const rels = uris.map((u) => vscode.workspace.asRelativePath(u, false));
      return JSON.stringify({ pattern, files: rels, count: rels.length });
    } catch (e) {
      return JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
        pattern,
      });
    }
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

export interface RunChatWithToolsResult {
  /** Full API thread including this turn (no system message). */
  apiThread: ApiChatMessage[];
  /** Final assistant text for display. */
  lastAssistantText: string;
}

/**
 * Non-streaming chat with tool-call loop (ASI:One tool calling).
 */
export async function runChatWithTools(
  messagesWithSystem: ApiChatMessage[],
  options: {
    signal?: AbortSignal;
    onProgress?: (label: string) => void;
    maxRounds?: number;
    webSearch?: boolean;
    /** When agentic session is enabled, sent as `x-session-id` (overrides setting). */
    sessionId?: string;
  } = {}
): Promise<RunChatWithToolsResult> {
  const { url, model, webSearch: cfgWebSearch, agenticSession } = readConfig();
  const webSearch = options.webSearch ?? cfgWebSearch;
  const maxRounds = options.maxRounds ?? 12;
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    throw new Error(
      "No API key. Run “ASI: Set API Key”, add asiAssistant.apiKey in User settings, put your key in a file named .api-key in the extension folder, or set ASI_ONE_API_KEY."
    );
  }

  const cfg = vscode.workspace.getConfiguration("asiAssistant");
  const sid = options.sessionId?.trim() || cfg.get<string>("sessionId")?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (agenticSession && sid) {
    headers["x-session-id"] = sid;
  }

  let msgs = [...messagesWithSystem];
  let lastAssistantText = "";

  for (let round = 0; round < maxRounds; round++) {
    options.onProgress?.(
      round === 0 ? "Calling ASI:One (tools)…" : `Tool round ${round + 1}…`
    );

    const body: Record<string, unknown> = {
      model,
      messages: msgs,
      tools: ASI_BUILTIN_TOOLS,
      parallel_tool_calls: false,
      stream: false,
    };
    body.web_search = webSearch;
    // Compatibility: some OpenAI-compatible gateways read this nested form.
    body.extra_body = { web_search: webSearch };

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`ASI API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
    }

    if (!res.ok) {
      const errMsg =
        typeof json === "object" && json !== null && "error" in json
          ? JSON.stringify((json as { error: unknown }).error)
          : text.slice(0, 500);
      throw new Error(`ASI API error ${res.status}: ${errMsg}`);
    }

    const obj = json as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          role?: string;
          content?: string | null;
          tool_calls?: ToolCall[];
        };
      }>;
    };
    const choice = obj.choices?.[0];
    const message = choice?.message;
    if (!message) {
      throw new Error("ASI API: empty choices[0].message");
    }

    const assistantMsg: ApiChatMessage = {
      role: "assistant",
      content: message.content ?? null,
      ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
    };
    msgs.push(assistantMsg);

    const finish = choice?.finish_reason ?? "";
    if (finish === "tool_calls" && message.tool_calls?.length) {
      for (const tc of message.tool_calls) {
        const fn = tc.function?.name ?? "";
        const args = tc.function?.arguments ?? "{}";
        options.onProgress?.(`Tool: ${fn}`);
        const out = await executeBuiltinTool(fn, args);
        msgs.push({
          role: "tool",
          tool_call_id: tc.id,
          content: out,
        });
      }
      continue;
    }

    lastAssistantText = message.content ?? "";
    break;
  }

  if (lastAssistantText === "" && msgs.length > 0) {
    const last = msgs[msgs.length - 1];
    if (last.role === "assistant" && typeof last.content === "string") {
      lastAssistantText = last.content;
    }
  }
  if (lastAssistantText === "") {
    throw new Error("ASI:One returned no assistant text (tool loop may have exceeded max rounds).");
  }

  const systemFirst = msgs[0]?.role === "system";
  const apiThread = (systemFirst ? msgs.slice(1) : msgs) as ApiChatMessage[];

  return { apiThread, lastAssistantText };
}

export async function completeChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
  extras?: { webSearch?: boolean; sessionIdHeader?: string }
): Promise<AsiCompletionResult> {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const url = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const model = config.get<string>("model") ?? "asi1";
  const webSearch = extras?.webSearch ?? config.get<boolean>("webSearch") !== false;
  const agenticSession = config.get<boolean>("agenticSession") === true;
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    throw new Error(
      "No API key. Run “ASI: Set API Key”, add asiAssistant.apiKey in User settings, put your key in a file named .api-key in the extension folder, or set ASI_ONE_API_KEY."
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const sid = extras?.sessionIdHeader ?? config.get<string>("sessionId")?.trim();
  if (agenticSession && sid) {
    headers["x-session-id"] = sid;
  }

  const body: Record<string, unknown> = {
    model,
    messages,
  };
  body.web_search = webSearch;
  body.extra_body = { web_search: webSearch };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ASI API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    const errMsg =
      typeof json === "object" && json !== null && "error" in json
        ? JSON.stringify((json as { error: unknown }).error)
        : text.slice(0, 500);
    throw new Error(`ASI API error ${res.status}: ${errMsg}`);
  }

  const obj = json as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const choice = obj.choices?.[0];
  const content =
    choice?.message?.content ??
    (typeof choice?.text === "string" ? choice.text : undefined) ??
    "";

  if (!content) {
    return { content: "", raw: json };
  }

  return { content, raw: json };
}

/**
 * Streams chat completion when API returns SSE; otherwise falls back to one-shot JSON.
 */
export async function completeChatStreaming(
  messages: ChatMessage[],
  onDelta: (delta: string, fullSoFar: string) => void,
  signal?: AbortSignal,
  extras?: { webSearch?: boolean; sessionIdHeader?: string }
): Promise<AsiCompletionResult> {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const url = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const model = config.get<string>("model") ?? "asi1";
  const webSearch = extras?.webSearch ?? config.get<boolean>("webSearch") !== false;
  const agenticSession = config.get<boolean>("agenticSession") === true;
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    throw new Error(
      "No API key. Run “ASI: Set API Key”, add asiAssistant.apiKey in User settings, put your key in a file named .api-key in the extension folder, or set ASI_ONE_API_KEY."
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const sid = extras?.sessionIdHeader ?? config.get<string>("sessionId")?.trim();
  if (agenticSession && sid) {
    headers["x-session-id"] = sid;
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  };
  body.web_search = webSearch;
  body.extra_body = { web_search: webSearch };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  const ct = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const text = await res.text();
    let err: unknown;
    try {
      err = JSON.parse(text);
    } catch {
      err = text;
    }
    throw new Error(
      `ASI API error ${res.status}: ${typeof err === "object" ? JSON.stringify(err) : String(err).slice(0, 500)}`
    );
  }

  if (res.body && ct.includes("text/event-stream")) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          continue;
        }
        try {
          const j = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string };
              message?: { content?: string };
            }>;
          };
          const choice = j.choices?.[0];
          const piece =
            choice?.delta?.content ?? choice?.message?.content ?? "";
          if (piece) {
            full += piece;
            onDelta(piece, full);
          }
        } catch {
          /* ignore partial JSON */
        }
      }
    }
    return { content: full, raw: undefined };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ASI API returned non-JSON: ${text.slice(0, 500)}`);
  }
  const obj = json as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const choice = obj.choices?.[0];
  const content =
    choice?.message?.content ??
    (typeof choice?.text === "string" ? choice.text : undefined) ??
    "";
  if (content) {
    onDelta(content, content);
  }
  return { content, raw: json };
}

/** Derive `https://…/v1` from a chat completions URL (`…/v1/chat/completions`). */
export function deriveApiV1Base(chatCompletionsUrl: string): string {
  const u = chatCompletionsUrl.trim();
  const low = u.toLowerCase();
  const idx = low.indexOf("/chat/completions");
  if (idx >= 0) {
    return u.slice(0, idx).replace(/\/$/, "");
  }
  try {
    const parsed = new URL(u);
    const pathname = parsed.pathname.replace(/\/$/, "");
    if (pathname.endsWith("/v1")) {
      return `${parsed.origin}${pathname}`;
    }
  } catch {
    /* ignore */
  }
  return "https://api.asi1.ai/v1";
}

export type GenerateImageResult = {
  /** Raw base64 from API (`b64_json`). */
  b64Json?: string;
  /** Hosted image URL when API returns one. */
  url?: string;
  revisedPrompt?: string;
};

/**
 * POST `{v1}/image/generate`.
 * ASI returns `{ images: [{ url }] }`; OpenAI-style `{ data: [{ url, b64_json }] }` is also accepted.
 */
export async function generateImage(options: {
  prompt: string;
  size?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<GenerateImageResult> {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const overrideBase = config.get<string>("imageBaseUrl")?.trim();
  const chatUrl = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const base = overrideBase || deriveApiV1Base(chatUrl);
  const url = `${base.replace(/\/$/, "")}/image/generate`;
  const model =
    options.model?.trim() ||
    config.get<string>("imageModel")?.trim() ||
    config.get<string>("model")?.trim() ||
    "asi1-mini";
  const size = options.size?.trim() || config.get<string>("imageSize")?.trim() || "1024x1024";
  const apiKey = await resolveApiKey();

  if (!apiKey) {
    throw new Error(
      "No API key. Run “ASI: Set API Key”, add asiAssistant.apiKey in User settings, put your key in a file named .api-key in the extension folder, or set ASI_ONE_API_KEY."
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      size,
      n: 1,
    }),
    signal: options.signal,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Image API returned non-JSON (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    const errMsg =
      typeof json === "object" && json !== null && "error" in json
        ? JSON.stringify((json as { error: unknown }).error)
        : text.slice(0, 500);
    throw new Error(`Image API error ${res.status}: ${errMsg}`);
  }

  const obj = json as {
    /** OpenAI-style */
    data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
    /** ASI:One documented shape: `{ images: [{ url }] }` */
    images?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
    message?: string;
  };
  let d0 = obj.data?.[0];
  if (!d0 && Array.isArray(obj.images) && obj.images.length > 0) {
    d0 = obj.images[0];
  }
  const b64Json = d0?.b64_json;
  const imageUrl = d0?.url;
  const revisedPrompt = d0?.revised_prompt;
  if (!b64Json && !imageUrl) {
    throw new Error(
      "Image API: no image in response (expected images[0].url / data[0].url or b64_json)."
    );
  }

  return { b64Json, url: imageUrl, revisedPrompt };
}
