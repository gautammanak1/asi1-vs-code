import type { StreamChoice, StreamDelta } from "./models";

export interface StreamCallbacks {
  onText: (chunk: string) => void;
  onToolCall: (delta: StreamDelta) => void;
  onFinish: (reason: string | null) => void;
  onError: (error: Error) => void;
}

export async function consumeStream(
  response: Response,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (!response.body) {
    throw new Error("Response has no body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          callbacks.onFinish(null);
          return;
        }
        try {
          const parsed = JSON.parse(payload) as { choices?: StreamChoice[] };
          const choice = parsed.choices?.[0];
          if (!choice) continue;
          if (choice.delta.content) {
            callbacks.onText(choice.delta.content);
          }
          if (choice.delta.tool_calls?.length) {
            callbacks.onToolCall(choice.delta);
          }
          if (choice.finish_reason) {
            callbacks.onFinish(choice.finish_reason);
          }
        } catch {
          /* skip malformed SSE */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
