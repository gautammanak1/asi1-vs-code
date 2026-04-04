const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1000, 3000, 8000];

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    if (signal?.aborted) throw new Error("Aborted");
    try {
      const res = await fetch(url, { ...init, signal });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        const backoff = RETRY_BACKOFF_MS[attempt] ?? 8000;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return res;
    } catch (e) {
      if (signal?.aborted) throw e;
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const backoff = RETRY_BACKOFF_MS[attempt] ?? 8000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastError ?? new Error("Request failed after retries");
}
