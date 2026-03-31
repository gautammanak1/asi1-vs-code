import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import {
  completeChat,
  completeChatStreaming,
  generateImage,
  isApiKeyConfigured,
  runChatWithTools,
  type ApiChatMessage,
  type ChatMessage,
} from "./asiClient";
import { extractFilesFromMarkdown, writeExtractedFiles } from "./workspaceFiles";

const CHAT_STATE_KEY = "asiAssistant.sidebarChat.v1";

interface StoredChatState {
  chatId: string;
  history: ChatMessage[];
  webSearchEnabled?: boolean;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "asiAssistant.chatView";

  private _view?: vscode.WebviewView;
  /** User/assistant turns only; system prompt is added per request from settings. */
  private _history: ChatMessage[] = [];
  /** When tool calling is enabled: full OpenAI-style thread including tool messages. */
  private _apiThread: ApiChatMessage[] = [];
  /** Used for `x-session-id` when agentic session is on and no manual session id is set. */
  private _sessionIdGenerated = randomUUID();
  /** Stable id for this chat thread (shown in UI, persisted across reloads). */
  private _chatId: string;
  /** UI web-search toggle state persisted across reopen. */
  private _webSearchEnabled: boolean;

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._chatId = randomUUID();
    this._webSearchEnabled =
      vscode.workspace.getConfiguration("asiAssistant").get<boolean>("webSearch") !== false;
    const raw = this._context.globalState.get<string>(CHAT_STATE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as StoredChatState;
        if (s.chatId && Array.isArray(s.history)) {
          this._chatId = s.chatId;
          this._history = s.history;
          this._apiThread = [];
          if (typeof s.webSearchEnabled === "boolean") {
            this._webSearchEnabled = s.webSearchEnabled;
          }
        }
      } catch {
        /* keep fresh chat */
      }
    }
  }

  private _persistChatState(): void {
    void this._context.globalState.update(
      CHAT_STATE_KEY,
      JSON.stringify({
        chatId: this._chatId,
        history: this._history,
        webSearchEnabled: this._webSearchEnabled,
      } satisfies StoredChatState)
    );
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    webviewView.webview.html = this._buildHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "installVsix") {
        await vscode.commands.executeCommand("asiAssistant.installFromVsix");
        await this.refreshSetupState();
        return;
      }
      if (msg.type === "openApiKey") {
        await vscode.commands.executeCommand("asiAssistant.insertApiKey");
        return;
      }
      if (msg.type === "setupReady") {
        await this.refreshSetupState();
        this._postState();
        return;
      }
      if (msg.type === "send" && typeof msg.text === "string") {
        const text = msg.text.trim();
        if (!text) {
          return;
        }
        const mode = msg.mode === "image" ? "image" : "chat";
        const imageSize = typeof msg.imageSize === "string" ? msg.imageSize.trim() : undefined;
        const webSearchOverride = typeof msg.webSearch === "boolean" ? msg.webSearch : undefined;
        const attachments = Array.isArray(msg.attachments)
          ? msg.attachments
              .filter(
                (a: unknown): a is { name: string; content: string } =>
                  !!a &&
                  typeof a === "object" &&
                  typeof (a as { name?: unknown }).name === "string" &&
                  typeof (a as { content?: unknown }).content === "string"
              )
              .slice(0, 8)
          : undefined;
        await this._handleUserSend(text, mode, imageSize, webSearchOverride, attachments);
      }
      if (msg.type === "setWebSearch" && typeof msg.value === "boolean") {
        this._webSearchEnabled = msg.value;
        this._persistChatState();
        return;
      }
      if (msg.type === "clear") {
        this._history = [];
        this._apiThread = [];
        this._sessionIdGenerated = randomUUID();
        this._chatId = randomUUID();
        this._webSearchEnabled =
          vscode.workspace.getConfiguration("asiAssistant").get<boolean>("webSearch") !== false;
        this._persistChatState();
        this._postState();
      }
      if (msg.type === "createFiles") {
        const last = [...this._history].reverse().find((m) => m.role === "assistant");
        if (!last) {
          return;
        }
        const files = extractFilesFromMarkdown(last.content);
        if (files.length === 0) {
          vscode.window.showInformationMessage(
            "No files detected. Ask ASI to “Save as filename.ext” or put `# path/file.ext` on the first line of a code block."
          );
          return;
        }
        await writeExtractedFiles(files);
        return;
      }
      if (msg.type === "copyToClipboard" && typeof msg.text === "string") {
        await vscode.env.clipboard.writeText(msg.text);
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.refreshSetupState();
      }
    });

  }

  /** Re-post onboarding row (API key / dev install). Call after key save or settings change. */
  public async refreshSetupState(): Promise<void> {
    if (!this._view) {
      return;
    }
    const dev = this._context.extensionMode === vscode.ExtensionMode.Development;
    const hasApiKey = await isApiKeyConfigured();
    this._view.webview.postMessage({ type: "setup", dev, hasApiKey });
  }

  public appendUserMessageAndRun(text: string): void {
    if (!text.trim()) {
      return;
    }
    this._history.push({ role: "user", content: text });
    if (vscode.workspace.getConfiguration("asiAssistant").get<boolean>("enableTools") !== false) {
      this._apiThread.push({ role: "user", content: text });
    }
    this._postState();
    void this._completeFromHistory();
  }

  private _resolveSessionIdForHeader(): string | undefined {
    const cfg = vscode.workspace.getConfiguration("asiAssistant");
    const manual = cfg.get<string>("sessionId")?.trim();
    if (manual) {
      return manual;
    }
    if (cfg.get<boolean>("agenticSession") === true) {
      return this._sessionIdGenerated;
    }
    return undefined;
  }

  /** Messages for ASI API (system + thread). */
  private buildMessagesForApi(webSearchForRequest?: boolean): ApiChatMessage[] {
    let sys =
      vscode.workspace.getConfiguration("asiAssistant").get<string>("systemPrompt") ?? "";
    const styleHint =
      "If the user provides example code/snippets, follow that example's structure, coding style, and conventions first; do not switch to an unrelated template/layout unless the user explicitly asks.";
    sys = sys.trim() ? `${sys.trim()}\n\n${styleHint}` : styleHint;
    if (webSearchForRequest) {
      const hint =
        "Live web search is enabled on the ASI:One API for this turn. For current events, sports schedules and scores, breaking news, weather, prices, or any time-sensitive facts, use the retrieved web information and answer directly. Do not refuse by claiming you lack real-time or internet access.";
      sys = sys.trim() ? `${sys.trim()}\n\n${hint}` : hint;
    }
    const useTools =
      vscode.workspace.getConfiguration("asiAssistant").get<boolean>("enableTools") !== false;
    const messages: ApiChatMessage[] = [];
    if (sys.trim()) {
      messages.push({ role: "system", content: sys });
    }
    if (useTools) {
      messages.push(...this._apiThread);
    } else {
      for (const m of this._history) {
        if (m.role === "user" || m.role === "assistant") {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }
    return messages;
  }

  private async _handleUserSend(
    text: string,
    mode: "chat" | "image",
    imageSize?: string,
    webSearchOverride?: boolean,
    attachments?: Array<{ name: string; content: string }>
  ): Promise<void> {
    if (mode === "image") {
      await this._generateImageTurn(text, imageSize);
      return;
    }
    const mentionAttachments = await this._readMentionedFilesFromText(text);
    const mergedText = this._mergeAttachmentsIntoPrompt(text, [
      ...(attachments ?? []),
      ...mentionAttachments,
    ]);
    await this._handleUserMessage(mergedText, webSearchOverride);
  }

  private async _readMentionedFilesFromText(text: string): Promise<Array<{ name: string; content: string }>> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length || !text.includes("@")) {
      return [];
    }
    const root = folders[0].uri;
    const matches = [...text.matchAll(/(^|\s)@([./\w-]+(?:\/[./\w-]+)+)/g)];
    if (!matches.length) {
      return [];
    }
    const paths = Array.from(
      new Set(
        matches
          .map((m) => (m[2] || "").trim())
          .filter((p) => {
            if (!p || p.includes("..")) {
              return false;
            }
            // Keep template internals out of prompt injection.
            if (p.startsWith("resources/agentverse-templates")) {
              return false;
            }
            return true;
          })
          .slice(0, 8)
      )
    );
    const out: Array<{ name: string; content: string }> = [];
    for (const rel of paths) {
      try {
        const uri = vscode.Uri.joinPath(root, rel);
        const bytes = await vscode.workspace.fs.readFile(uri);
        let content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        if (content.length > 120_000) {
          content = `${content.slice(0, 120_000)}\n… [truncated]`;
        }
        out.push({ name: rel, content });
      } catch {
        // Ignore invalid mentions or binary/unreadable files.
      }
    }
    return out;
  }

  private _mergeAttachmentsIntoPrompt(
    text: string,
    attachments?: Array<{ name: string; content: string }>
  ): string {
    if (!attachments?.length) {
      return text;
    }
    const blocks: string[] = [];
    for (const a of attachments) {
      const name = a.name.trim() || "attached-file.txt";
      const content = a.content.length > 120_000 ? `${a.content.slice(0, 120_000)}\n… [truncated]` : a.content;
      blocks.push(`Attached file: ${name}\n\`\`\`\n${content}\n\`\`\``);
    }
    return `${text}\n\n${blocks.join("\n\n")}`;
  }

  /** Image generation from the same composer; appends user + assistant turns to history. */
  private async _generateImageTurn(prompt: string, size?: string): Promise<void> {
    this._history.push({ role: "user", content: prompt });
    this._postState();
    this._view?.webview.postMessage({ type: "activity", text: "Generating image…" });
    this._view?.webview.postMessage({ type: "loading", value: true });
    try {
      const r = await generateImage({ prompt, size });
      let line = "**Image**\n\n";
      if (r.url) {
        line += `![Generated](${r.url})\n`;
      } else if (r.b64Json) {
        line += `![Generated](data:image/png;base64,${r.b64Json})\n`;
      } else {
        line += "_(No image in response)_\n";
      }
      if (r.revisedPrompt) {
        line += `\n\n_Revised prompt: ${r.revisedPrompt}_`;
      }
      this._history.push({ role: "assistant", content: line });
      this._postState();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(errMsg);
      this._history.push({ role: "assistant", content: `**Error:** ${errMsg}` });
      this._postState();
    } finally {
      this._view?.webview.postMessage({ type: "loading", value: false });
      setTimeout(() => {
        this._view?.webview.postMessage({ type: "activity", text: "" });
      }, 800);
    }
  }

  private async _handleUserMessage(
    text: string,
    webSearchOverride?: boolean
  ): Promise<void> {
    if (!text) {
      return;
    }
    this._history.push({ role: "user", content: text });
    const useTools =
      vscode.workspace.getConfiguration("asiAssistant").get<boolean>("enableTools") !== false;
    if (useTools) {
      this._apiThread.push({ role: "user", content: text });
    }
    this._postState();
    await this._completeFromHistory(webSearchOverride);
  }

  private async _completeFromHistory(
    webSearchOverride?: boolean
  ): Promise<void> {
    const cfg = vscode.workspace.getConfiguration("asiAssistant");
    const cfgWebSearch = cfg.get<boolean>("webSearch") !== false;
    const webSearch = webSearchOverride ?? cfgWebSearch;
    const messages = this.buildMessagesForApi(webSearch);
    const useStream = cfg.get<boolean>("streamResponse") !== false;
    const useTools = cfg.get<boolean>("enableTools") !== false;
    const sessionHeader = this._resolveSessionIdForHeader();

    this._view?.webview.postMessage({ type: "activity", text: "Connecting to ASI…" });
    this._view?.webview.postMessage({ type: "loading", value: true });
    this._view?.webview.postMessage({ type: "stream", reset: true });

    try {
      let content = "";
      if (useTools) {
        this._view?.webview.postMessage({
          type: "activity",
          text: webSearch ? "ASI:One (tools + web search)…" : "ASI:One (tools)…",
        });
        const maxToolRounds =
          vscode.workspace.getConfiguration("asiAssistant").get<number>("maxToolRounds") ?? 12;
        const { apiThread, lastAssistantText } = await runChatWithTools(messages, {
          onProgress: (label) => {
            this._view?.webview.postMessage({ type: "activity", text: label });
          },
          sessionId: sessionHeader,
          maxRounds: maxToolRounds,
          webSearch,
        });
        this._apiThread = apiThread;
        content = lastAssistantText;
        this._view?.webview.postMessage({ type: "stream", text: content });
      } else if (useStream) {
        this._view?.webview.postMessage({ type: "activity", text: "Streaming response…" });
        const r = await completeChatStreaming(
          messages as ChatMessage[],
          (_delta, full) => {
            content = full;
            this._view?.webview.postMessage({ type: "stream", text: full });
          },
          undefined,
          { sessionIdHeader: sessionHeader, webSearch }
        );
        content = r.content || content;
      } else {
        this._view?.webview.postMessage({ type: "activity", text: "Waiting for reply…" });
        const r = await completeChat(messages as ChatMessage[], undefined, {
          sessionIdHeader: sessionHeader,
          webSearch,
        });
        content = r.content;
      }

      this._history.push({ role: "assistant", content });
      this._postState();
      this._view?.webview.postMessage({ type: "stream", done: true });

      const autoApply = cfg.get<boolean>("autoApplyFiles") === true;
      const files = extractFilesFromMarkdown(content);
      if (autoApply && files.length > 0) {
        this._view?.webview.postMessage({
          type: "activity",
          text: `Writing ${files.length} file(s) to workspace…`,
        });
        await writeExtractedFiles(files);
      }
      this._view?.webview.postMessage({
        type: "activity",
        text: autoApply && files.length > 0 ? "Ready." : "",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(msg);
      this._view?.webview.postMessage({ type: "error", value: msg });
      this._view?.webview.postMessage({ type: "stream", done: true });
    } finally {
      this._view?.webview.postMessage({ type: "loading", value: false });
      setTimeout(() => {
        this._view?.webview.postMessage({ type: "activity", text: "" });
      }, 1200);
    }
  }

  private _postState(): void {
    const lastAssistant = [...this._history].reverse().find((m) => m.role === "assistant");
    const extractedFiles = lastAssistant ? extractFilesFromMarkdown(lastAssistant.content) : [];
    this._persistChatState();
    this._view?.webview.postMessage({
      type: "state",
      history: this._history,
      extractedFiles,
      chatId: this._chatId,
      chatIdShort: this._chatId.replace(/-/g, "").slice(0, 10),
      webSearchEnabled: this._webSearchEnabled,
    });
  }

  private _buildHtml(webview: vscode.Webview): string {
    const nonce = String(Date.now());
    const mdScriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "chatMarkdown.js")
    );
    const hljsCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "hljs-github-dark.min.css")
    );
    const hljsJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "highlight.min.js")
    );
    const chatCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "chat.css")
    );
    const chatPanelJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, "media", "chatPanel.js")
    );
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} data: https: blob:; frame-src https:; font-src https:;" />
  <link rel="stylesheet" href="${chatCssUri}" />
  <link rel="stylesheet" href="${hljsCssUri}" />
  <script src="${hljsJsUri}"></script>
  <script src="${mdScriptUri}"></script>
</head>
<body>
  <div id="main" class="asi-dark-chat">
    <div id="activity-bar"><span id="activity-text"></span></div>
    <div id="setup-row" class="setup-row">
      <div class="setup-step" id="step-install">
        <span class="setup-num">1</span>
        <div class="setup-inner">
          <div class="setup-head">Permanent install (Cursor / VS Code)</div>
          <p class="setup-desc">Run <code>vsce package</code> in the extension folder, then choose the <code>.vsix</code> file here to install it.</p>
          <button type="button" class="setup-btn" id="btn-install-vsix">Choose .vsix &amp; install</button>
        </div>
      </div>
      <div class="setup-step" id="step-api">
        <span class="setup-num">2</span>
        <div class="setup-inner">
          <div class="setup-head">API key</div>
          <p class="setup-desc">Add your ASI1 key to start chatting. You can also set <code>asiAssistant.apiKey</code> in Settings or <code>ASI_ONE_API_KEY</code> in the environment.</p>
          <button type="button" class="setup-btn primary" id="btn-api-key">Add API key</button>
        </div>
      </div>
    </div>
    <div id="chat-top-bar" class="chat-top-bar">
      <div class="chat-top-left">
        <span class="asi-brand">ASI1 Code</span>
        <button type="button" class="chat-meta-btn" disabled aria-hidden="true">
          <span class="chev">▸</span>
          <span id="msg-count">0</span> turns
        </button>
        <span id="chat-session-id" class="chat-session-id" title="Chat session — persisted until you Clear">…</span>
      </div>
      <button type="button" id="clear" class="chat-review-btn">Clear</button>
    </div>
    <div id="log"></div>
    <div id="create-bar">
      <button type="button" id="create-files-btn">Create files in workspace</button>
      <span id="create-list"></span>
    </div>
    <div id="loading" class="loading-row" style="display:none">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      <span>ASI is thinking…</span>
    </div>
    <div id="composer">
      <select id="send-mode" class="sr-only" aria-hidden="true" tabindex="-1" title="Mode">
        <option value="chat" selected>Chat</option>
        <option value="image">Image</option>
      </select>
      <select id="image-size" class="sr-only" aria-hidden="true" tabindex="-1" title="Image size">
        <option value="1024x1024" selected>1024×1024</option>
        <option value="512x512">512×512</option>
      </select>
      <div class="composer-input-wrap">
        <div id="row">
          <textarea id="input" rows="2" placeholder="Plan, @ for context, / for commands"></textarea>
          <div id="attach-list" class="attach-list"></div>
          <div id="mention-list" class="mention-list"></div>
          <div class="composer-inline-bar">
            <div class="inline-left">
              <button type="button" id="upload-btn" class="inline-chip-btn" title="Attach file" aria-label="Attach file">
                Attach
              </button>
            </div>
            <div class="inline-right">
              <button type="button" id="web-search-btn" class="inline-chip-btn" title="Web search" aria-label="Web search" aria-pressed="true">
                Web
              </button>
              <button type="button" id="image-mode-btn" class="inline-chip-btn" title="Image mode" aria-label="Image mode" aria-pressed="false">
                Image
              </button>
              <button type="button" id="send" class="icon-btn send-btn" title="Send (Enter)" aria-label="Send">
                <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V4"/><path d="m5 11 7-7 7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
        <input id="attach-input" type="file" multiple hidden />
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${chatPanelJsUri}"></script>
</body>
</html>`;
  }
}
