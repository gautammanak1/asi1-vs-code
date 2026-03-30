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

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._chatId = randomUUID();
    const raw = this._context.globalState.get<string>(CHAT_STATE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as StoredChatState;
        if (s.chatId && Array.isArray(s.history)) {
          this._chatId = s.chatId;
          this._history = s.history;
          this._apiThread = [];
        }
      } catch {
        /* keep fresh chat */
      }
    }
  }

  private _persistChatState(): void {
    void this._context.globalState.update(
      CHAT_STATE_KEY,
      JSON.stringify({ chatId: this._chatId, history: this._history } satisfies StoredChatState)
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
        await this._handleUserMessage(msg.text.trim());
      }
      if (msg.type === "asiModalSubmit") {
        const prompt = typeof msg.prompt === "string" ? msg.prompt.trim() : "";
        if (!prompt) {
          return;
        }
        const mode = msg.mode === "image" ? "image" : "chat";
        this._view?.webview.postMessage({ type: "asiModalLoading", value: true });
        try {
          if (mode === "image") {
            const size = typeof msg.size === "string" ? msg.size : undefined;
            const model = typeof msg.model === "string" ? msg.model : undefined;
            const r = await generateImage({ prompt, size, model });
            this._view?.webview.postMessage({
              type: "asiModalResult",
              mode: "image",
              b64Json: r.b64Json,
              url: r.url,
              revisedPrompt: r.revisedPrompt,
            });
          } else {
            await this._runModalChat(prompt);
            this._view?.webview.postMessage({ type: "asiModalResult", mode: "chat", ok: true });
          }
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          this._view?.webview.postMessage({ type: "asiModalResult", mode, error: err });
        } finally {
          this._view?.webview.postMessage({ type: "asiModalLoading", value: false });
        }
      }
      if (msg.type === "clear") {
        this._history = [];
        this._apiThread = [];
        this._sessionIdGenerated = randomUUID();
        this._chatId = randomUUID();
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
  private buildMessagesForApi(): ApiChatMessage[] {
    const sys =
      vscode.workspace.getConfiguration("asiAssistant").get<string>("systemPrompt") ?? "";
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

  /** One-shot chat from the ASI modal (no tools; uses same session header as main chat). */
  private async _runModalChat(prompt: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration("asiAssistant");
    const sys = cfg.get<string>("systemPrompt") ?? "";
    const msgs: ChatMessage[] = [];
    if (sys.trim()) {
      msgs.push({ role: "system", content: sys });
    }
    msgs.push({ role: "user", content: prompt });
    const r = await completeChat(msgs, undefined, {
      sessionIdHeader: this._resolveSessionIdForHeader(),
    });
    const content = r.content ?? "";
    this._history.push({ role: "user", content: prompt });
    this._history.push({ role: "assistant", content });
    const useTools = cfg.get<boolean>("enableTools") !== false;
    if (useTools) {
      this._apiThread.push({ role: "user", content: prompt });
      this._apiThread.push({ role: "assistant", content });
    }
    this._postState();
  }

  private async _handleUserMessage(text: string): Promise<void> {
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
    await this._completeFromHistory();
  }

  private async _completeFromHistory(): Promise<void> {
    const messages = this.buildMessagesForApi();
    const cfg = vscode.workspace.getConfiguration("asiAssistant");
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
          text: "ASI:One (tools + web search)…",
        });
        const maxToolRounds =
          vscode.workspace.getConfiguration("asiAssistant").get<number>("maxToolRounds") ?? 12;
        const { apiThread, lastAssistantText } = await runChatWithTools(messages, {
          onProgress: (label) => {
            this._view?.webview.postMessage({ type: "activity", text: label });
          },
          sessionId: sessionHeader,
          maxRounds: maxToolRounds,
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
          { sessionIdHeader: sessionHeader }
        );
        content = r.content || content;
      } else {
        this._view?.webview.postMessage({ type: "activity", text: "Waiting for reply…" });
        const r = await completeChat(messages as ChatMessage[], undefined, {
          sessionIdHeader: sessionHeader,
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
    });
  }

  private _readBannerConfig(): {
    title: string;
    subtitle: string;
    logoUrlOverride: string;
    links: Array<{ label: string; href: string }>;
  } {
    const c = vscode.workspace.getConfiguration("asiAssistant");
    const title = (c.get<string>("bannerTitle") ?? "").trim();
    const subtitle = (c.get<string>("bannerSubtitle") ?? "ASI1 · VS Code & Cursor").trim();
    const logoUrlOverride = (c.get<string>("bannerLogoUrl") ?? "").trim();

    const pairs: Array<[string, string]> = [
      ["Website", c.get<string>("linkWebsite") ?? ""],
      ["Docs", c.get<string>("linkDocs") ?? ""],
      ["X", c.get<string>("linkX") ?? ""],
      ["Community", c.get<string>("linkCommunity") ?? ""],
      ["Resources", c.get<string>("linkResources") ?? ""],
      ["Support", c.get<string>("linkSupport") ?? ""],
      ["Contact us", c.get<string>("linkContact") ?? ""],
    ];

    const links: Array<{ label: string; href: string }> = [];
    for (const [label, raw] of pairs) {
      const href = raw.trim();
      if (href && /^https?:\/\//i.test(href)) {
        links.push({ label, href });
      }
    }

    return { title, subtitle, logoUrlOverride, links };
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
    const { title, subtitle, logoUrlOverride, links } = this._readBannerConfig();
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const localLogo = webview
      .asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "resources", "logo.png"))
      .toString();
    const logoSrc =
      logoUrlOverride && /^https?:\/\//i.test(logoUrlOverride) ? esc(logoUrlOverride) : localLogo;
    const linkHtml = links
      .map(
        (l) =>
          `<a class="link-chip" href="${esc(l.href)}" target="_blank" rel="noreferrer noopener">${esc(
            l.label
          )}</a>`
      )
      .join("");
    const subtitleHtml =
      subtitle.length > 0 ? `<p class="banner-sub">${esc(subtitle)}</p>` : "";
    const titleHtml =
      title.length > 0
        ? `<div class="banner-head-text"><h1 class="banner-title">${esc(title)}</h1>${subtitleHtml}</div>`
        : subtitle.length > 0
          ? `<div class="banner-head-text">${subtitleHtml}</div>`
          : "";

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
  <div id="banner-wrap">
    <div id="banner">
      <div class="banner-top">
        <div class="banner-brand">
          <img class="brand-logo" src="${logoSrc}" alt="ASI1 Code" />
          ${titleHtml}
        </div>
        <button type="button" id="collapse-btn" title="Collapse or expand banner">▲</button>
      </div>
      <div class="banner-body">
        ${linkHtml ? `<div class="link-row">${linkHtml}</div>` : ""}
      </div>
    </div>
  </div>
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
      <div class="composer-input-wrap">
        <div id="row">
          <textarea id="input" rows="3" placeholder="Ask ASI… code, errors, refactors, or paste a stack trace"></textarea>
        </div>
      </div>
      <div class="composer-toolbar">
        <div class="composer-left">
          <span class="composer-pill accent">ASI1</span>
          <span class="composer-pill">ASI</span>
          <button type="button" class="composer-tool-btn" id="asi-open-modal" title="Chat or image (same prompt UI)">Run…</button>
        </div>
        <div class="composer-right">
          <button type="button" id="send" title="Send (Enter)">↑</button>
        </div>
      </div>
      <div id="composer-hint">Enter send · Shift+Enter newline</div>
    </div>
    <div id="asi-modal" class="asi-modal" hidden aria-hidden="true">
      <div class="asi-modal-backdrop" id="asi-modal-backdrop"></div>
      <div class="asi-modal-panel" role="dialog" aria-modal="true" aria-labelledby="asi-modal-title">
        <div class="asi-modal-head">
          <h2 id="asi-modal-title">ASI run</h2>
          <button type="button" class="asi-modal-close" id="asi-modal-close" title="Close">×</button>
        </div>
        <label class="asi-modal-label" for="asi-modal-endpoint">Endpoint</label>
        <select id="asi-modal-endpoint" class="asi-modal-select">
          <option value="chat">Chat completions</option>
          <option value="image">Image generate</option>
        </select>
        <div id="asi-modal-image-opts" class="asi-modal-image-opts" hidden>
          <label class="asi-modal-label" for="asi-modal-size">Size</label>
          <select id="asi-modal-size" class="asi-modal-select">
            <option value="1024x1024">1024×1024</option>
            <option value="512x512">512×512</option>
            <option value="1024x1792">1024×1792</option>
            <option value="1792x1024">1792×1024</option>
          </select>
        </div>
        <label class="asi-modal-label" for="asi-modal-prompt">Prompt</label>
        <textarea id="asi-modal-prompt" class="asi-modal-textarea" rows="5" placeholder="Describe what you want…"></textarea>
        <div id="asi-modal-error" class="asi-modal-error" hidden></div>
        <div id="asi-modal-result" class="asi-modal-result"></div>
        <div class="asi-modal-actions">
          <button type="button" class="asi-modal-submit" id="asi-modal-submit">Run</button>
        </div>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${chatPanelJsUri}"></script>
</body>
</html>`;
  }
}
