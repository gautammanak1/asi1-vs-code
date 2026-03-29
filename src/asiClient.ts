import * as vscode from "vscode";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface AsiCompletionResult {
  content: string;
  raw?: unknown;
}

let getSecretKey: (() => Thenable<string | undefined>) | undefined;
let getKeyFromExtensionFile: (() => string | undefined) | undefined;

export function registerApiKeySecret(getter: () => Thenable<string | undefined>): void {
  getSecretKey = getter;
}

/** Dev-friendly: read `.api-key` next to the extension (works even when no workspace folder is open). */
export function registerApiKeyFromExtensionFile(getter: () => string | undefined): void {
  getKeyFromExtensionFile = getter;
}

/** True if any configured source provides a non-empty ASI1 API key. */
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

export async function completeChat(
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<AsiCompletionResult> {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const url = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const model = config.get<string>("model") ?? "asi1";
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
      messages,
    }),
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
  signal?: AbortSignal
): Promise<AsiCompletionResult> {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  const url = config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions";
  const model = config.get<string>("model") ?? "asi1";
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
      messages,
      stream: true,
    }),
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
