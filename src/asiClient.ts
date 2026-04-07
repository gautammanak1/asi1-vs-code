import * as vscode from "vscode";
import { logChatRequest } from "./requestLogger";
import { EventEmitter } from "events";
import { fetchWithRetry } from "./api/retries";
import { ASI_BUILTIN_TOOLS } from "./tools/definitions";
import { executeBuiltinTool } from "./tools/executor";

export { ASI_BUILTIN_TOOLS, executeBuiltinTool };

EventEmitter.defaultMaxListeners = 30;

/** User/assistant turns for UI (plain text only). */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ToolExecutionEvent = {
  phase: "start" | "result";
  round: number;
  name: string;
  argsPreview?: string;
  resultPreview?: string;
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

function extractApiErrorMessage(json: unknown, rawText: string): string {
  if (typeof json === "object" && json !== null && "error" in json) {
    const errObj = (json as { error: unknown }).error;
    if (typeof errObj === "object" && errObj !== null && "message" in errObj) {
      return String((errObj as { message: unknown }).message);
    }
    return JSON.stringify(errObj);
  }
  const clean = rawText.replace(/<[^>]*>/g, "").trim();
  if (clean.length > 200) {
    return clean.slice(0, 200) + "…";
  }
  return clean || "Unknown error";
}

function readConfig() {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const url = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const model = config.get<string>("model") ?? "asi1";
  const webSearch = config.get<boolean>("webSearch") !== false;
  const agenticSession = config.get<boolean>("agenticSession") === true;
  return { url, model, webSearch, agenticSession };
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
    onToolEvent?: (event: ToolExecutionEvent) => void;
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

  // If no workspace is open, avoid surfacing tool failures to end-users.
  // Fall back to a normal completion in the same turn.
  if (!vscode.workspace.workspaceFolders?.length) {
    options.onProgress?.("No workspace open; running chat without workspace tools…");
    const body: Record<string, unknown> = {
      model,
      messages: messagesWithSystem,
      stream: false,
    };
    body.web_search = webSearch;
    body.extra_body = { web_search: webSearch };
    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }, options.signal);
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `The ASI API returned an unexpected response (HTTP ${res.status}). ` +
        `The service may be temporarily unavailable — please try again in a moment.`
      );
    }
    if (!res.ok) {
      const errMsg = extractApiErrorMessage(json, text);
      throw new Error(`ASI API error (${res.status}): ${errMsg}`);
    }
    const obj = json as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = obj.choices?.[0]?.message?.content ?? "";
    const baseThread =
      messagesWithSystem[0]?.role === "system"
        ? messagesWithSystem.slice(1)
        : [...messagesWithSystem];
    const apiThread = [
      ...baseThread,
      { role: "assistant", content } as ApiChatMessage,
    ] as ApiChatMessage[];
    return { apiThread, lastAssistantText: content };
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

    const res = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }, options.signal);

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `The ASI API returned an unexpected response (HTTP ${res.status}). ` +
        `The service may be temporarily unavailable — please try again in a moment.`
      );
    }

    if (!res.ok) {
      const errMsg = extractApiErrorMessage(json, text);
      throw new Error(`ASI API error (${res.status}): ${errMsg}`);
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
    const hasToolCalls = message.tool_calls?.length;
    if (hasToolCalls && (finish === "tool_calls" || finish === "tool_use" || finish === "stop")) {
      for (const tc of message.tool_calls!) {
        const fn = tc.function?.name ?? "";
        const args = tc.function?.arguments
          ?? (tc as unknown as Record<string, unknown>).arguments as string
          ?? "{}";
        options.onToolEvent?.({
          phase: "start",
          round: round + 1,
          name: fn,
          argsPreview: args.slice(0, 500),
        });
        options.onProgress?.(`Tool: ${fn}`);
        const out = await executeBuiltinTool(fn, args);
        options.onToolEvent?.({
          phase: "result",
          round: round + 1,
          name: fn,
          resultPreview: out.slice(0, 500),
        });
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

  const _logStartTime = Date.now();

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, signal);

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logChatRequest({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      startTime: _logStartTime,
      response: text.slice(0, 500),
      status: "error",
      error: `Non-JSON response (${res.status})`,
    });
    throw new Error(
      `The ASI API returned an unexpected response (HTTP ${res.status}). ` +
      `The service may be temporarily unavailable — please try again in a moment.`
    );
  }

  if (!res.ok) {
    const errMsg = extractApiErrorMessage(json, text);
    logChatRequest({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      startTime: _logStartTime,
      response: errMsg,
      status: "error",
      error: errMsg,
    });
    throw new Error(`ASI API error (${res.status}): ${errMsg}`);
  }

  const obj = json as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const choice = obj.choices?.[0];
  const content =
    choice?.message?.content ??
    (typeof choice?.text === "string" ? choice.text : undefined) ??
    "";

  logChatRequest({
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    startTime: _logStartTime,
    response: content,
    status: "success",
  });

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

  const _logStartTime = Date.now();

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }, signal);

  const ct = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const text = await res.text();
    let err: unknown;
    try {
      err = JSON.parse(text);
    } catch {
      err = text;
    }
    const errDetail = typeof err === "object" && err !== null && "error" in err
      ? extractApiErrorMessage(err, "")
      : String(err).replace(/<[^>]*>/g, "").slice(0, 200);
    const errMsg = `ASI API error (${res.status}): ${errDetail || "The service may be temporarily unavailable."}`;
    logChatRequest({
      model,
      messages: messages.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })),
      startTime: _logStartTime,
      response: errMsg,
      status: "error",
      error: errMsg,
    });
    throw new Error(errMsg);
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
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLines = frame
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim());
        if (!dataLines.length) {
          continue;
        }
        const data = dataLines.join("\n");
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
          const piece = choice?.delta?.content ?? choice?.message?.content ?? "";
          if (piece) {
            full += piece;
            onDelta(piece, full);
          }
        } catch {
          /* ignore malformed or partial frame */
        }
      }
    }
    logChatRequest({
      model,
      messages: messages.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })),
      startTime: _logStartTime,
      response: full,
      status: "success",
    });
    return { content: full, raw: undefined };
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logChatRequest({
      model,
      messages: messages.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })),
      startTime: _logStartTime,
      response: text.slice(0, 500),
      status: "error",
      error: "Non-JSON response",
    });
    throw new Error(
      `The ASI API returned an unexpected response. ` +
      `The service may be temporarily unavailable — please try again in a moment.`
    );
  }
  const obj = json as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
  };
  const choice = obj.choices?.[0];
  const content =
    choice?.message?.content ??
    (typeof choice?.text === "string" ? choice.text : undefined) ??
    "";
  logChatRequest({
    model,
    messages: messages.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })),
    startTime: _logStartTime,
    response: content,
    status: "success",
  });
  if (content) {
    onDelta(content, content);
  }
  return { content, raw: json };
}

export async function fetchAvailableModels(): Promise<string[]> {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const chatUrl = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const url = `${deriveApiV1Base(chatUrl)}/models`;
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    return ["asi1"];
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      return ["asi1"];
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const ids = Array.from(
      new Set(
        (json.data ?? [])
          .map((m) => (typeof m.id === "string" ? m.id.trim() : ""))
          .filter((id) => id.length > 0)
      )
    );
    if (!ids.includes("asi1")) {
      ids.unshift("asi1");
    }
    return ids.slice(0, 80);
  } catch {
    return ["asi1"];
  }
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
    throw new Error(
      `The Image API returned an unexpected response (HTTP ${res.status}). ` +
      `The service may be temporarily unavailable — please try again.`
    );
  }

  if (!res.ok) {
    const errMsg = extractApiErrorMessage(json, text);
    throw new Error(`Image API error (${res.status}): ${errMsg}`);
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
