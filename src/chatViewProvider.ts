import * as vscode from "vscode";
import {
  completeChat,
  completeChatStreaming,
  isApiKeyConfigured,
  type ChatMessage,
} from "./asiClient";
import { extractFilesFromMarkdown, writeExtractedFiles } from "./workspaceFiles";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "asiAssistant.chatView";

  private _view?: vscode.WebviewView;
  /** User/assistant turns only; system prompt is added per request from settings. */
  private _history: ChatMessage[] = [];

  constructor(private readonly _context: vscode.ExtensionContext) {}

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
        return;
      }
      if (msg.type === "send" && typeof msg.text === "string") {
        await this._handleUserMessage(msg.text.trim());
      }
      if (msg.type === "clear") {
        this._history = [];
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
    this._postState();
    void this._completeFromHistory();
  }

  private buildMessagesForApi(): ChatMessage[] {
    const sys =
      vscode.workspace.getConfiguration("asiAssistant").get<string>("systemPrompt") ?? "";
    const messages: ChatMessage[] = [];
    if (sys.trim()) {
      messages.push({ role: "system", content: sys });
    }
    messages.push(...this._history);
    return messages;
  }

  private async _handleUserMessage(text: string): Promise<void> {
    if (!text) {
      return;
    }
    this._history.push({ role: "user", content: text });
    this._postState();
    await this._completeFromHistory();
  }

  private async _completeFromHistory(): Promise<void> {
    const messages = this.buildMessagesForApi();
    const cfg = vscode.workspace.getConfiguration("asiAssistant");
    const useStream = cfg.get<boolean>("streamResponse") !== false;

    this._view?.webview.postMessage({ type: "activity", text: "Connecting to ASI…" });
    this._view?.webview.postMessage({ type: "loading", value: true });
    this._view?.webview.postMessage({ type: "stream", reset: true });

    try {
      let content = "";
      if (useStream) {
        this._view?.webview.postMessage({ type: "activity", text: "Streaming response…" });
        const r = await completeChatStreaming(messages, (_delta, full) => {
          content = full;
          this._view?.webview.postMessage({ type: "stream", text: full });
        });
        content = r.content || content;
      } else {
        this._view?.webview.postMessage({ type: "activity", text: "Waiting for reply…" });
        const r = await completeChat(messages);
        content = r.content;
      }

      this._history.push({ role: "assistant", content });
      this._view?.webview.postMessage({ type: "stream", done: true });
      this._postState();

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
    this._view?.webview.postMessage({
      type: "state",
      history: this._history,
      extractedFiles,
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
        ? `<div class="banner-head-text"><h1 class="banner-title">${esc(title)}</h1></div>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} data: https: blob:; frame-src https:; font-src https:;" />
  <style>
    :root {
      color-scheme: dark;
      --asi-radius: 0.5rem;
      --asi-radius-lg: 0.75rem;
      --asi-border: hsl(240 6% 12%);
      --asi-card: hsl(240 10% 3.9%);
      --asi-muted: hsl(240 5% 64.9%);
      --asi-ring: hsl(240 5% 34%);
      --asi-accent: var(--vscode-textLink-foreground);
    }
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: #000000;
    }
    #banner-wrap {
      flex-shrink: 0;
      padding: 8px 10px 0;
    }
    #banner {
      border-radius: var(--asi-radius-lg);
      background: var(--asi-card);
      border: 1px solid var(--asi-border);
      padding: 10px 12px 10px;
      position: relative;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.25);
    }
    #banner.collapsed .banner-body { display: none; }
    #banner.collapsed { padding-bottom: 8px; }
    .banner-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .banner-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }
    .brand-logo {
      height: 48px;
      width: auto;
      max-width: min(220px, 58vw);
      object-fit: contain;
      flex-shrink: 0;
      opacity: 0.98;
      display: block;
    }
    .banner-head-text { min-width: 0; }
    .banner-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--vscode-sideBarTitle-foreground);
      margin: 0;
      line-height: 1.25;
    }
    .banner-sub {
      font-size: 11px;
      line-height: 1.4;
      color: var(--asi-muted);
      margin: 4px 0 0 0;
    }
    .banner-body {
      margin-top: 8px;
    }
    .link-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }
    .link-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: calc(var(--asi-radius) - 2px);
      border: 1px solid var(--asi-border);
      background: hsl(240 6% 8%);
      color: var(--vscode-foreground);
      text-decoration: none;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .link-chip:hover {
      background: hsl(240 5% 12%);
      border-color: var(--asi-ring);
      text-decoration: none;
    }
    #collapse-btn {
      flex-shrink: 0;
      height: 28px;
      width: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: hsl(240 6% 8%);
      border: 1px solid var(--asi-border);
      color: var(--vscode-foreground);
      border-radius: var(--asi-radius);
      padding: 0;
      font-size: 11px;
      line-height: 1;
      cursor: pointer;
    }
    #collapse-btn:hover { background: hsl(240 5% 12%); }
    #main.asi-dark-chat {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 8px 10px 10px;
      background: #000000;
    }
    #log {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      padding: 8px 6px;
      background: #000000;
      color: #e8e8e8;
      border-radius: var(--asi-radius-lg);
      border: 1px solid var(--asi-border);
    }
    .empty-hint {
      font-size: 12px;
      color: #888;
      padding: 12px 8px;
      text-align: center;
      line-height: 1.5;
    }
    .msg { margin: 8px 0; padding: 10px 12px; border-radius: 8px; max-width: 100%; }
    .asi-dark-chat .user {
      background: #141414;
      border: 1px solid #2a2a2a;
      color: #e0e0e0;
    }
    .asi-dark-chat .assistant {
      background: #101010;
      border: 1px solid #252525;
      color: #eaeaea;
    }
    .asi-dark-chat .role { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.65; margin-bottom: 6px; color: #888; }
    .loading-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #ccc;
      padding: 8px 4px;
    }
    .dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #3b82f6;
      animation: pulse 1s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.15s; }
    .dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
    #composer {
      flex-shrink: 0;
      border-radius: var(--asi-radius-lg);
      border: 1px solid var(--asi-border);
      background: hsl(240 6% 6%);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.2);
    }
    #row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
      border-radius: var(--asi-radius);
      border: 1px solid var(--asi-border);
      background: #000000;
      padding: 4px 4px 4px 8px;
    }
    #row:focus-within {
      border-color: var(--asi-ring);
      box-shadow: 0 0 0 1px var(--asi-ring);
    }
    #input {
      flex: 1;
      resize: none;
      min-height: 40px;
      max-height: 160px;
      padding: 8px 6px;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.45;
      background: transparent;
      color: #fafafa;
      border: none;
      outline: none;
    }
    #input::placeholder { color: hsl(240 5% 45%); opacity: 1; }
    #send {
      flex-shrink: 0;
      min-width: 72px;
      padding: 8px 14px;
      cursor: pointer;
      background: hsl(0 0% 98%);
      color: hsl(240 10% 3.9%);
      border: 1px solid hsl(240 6% 12%);
      border-radius: calc(var(--asi-radius) - 2px);
      font-weight: 600;
      font-size: 12px;
    }
    #send:hover { filter: brightness(1.03); }
    #send:disabled { opacity: 0.45; cursor: not-allowed; }
    #toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    #hint { font-size: 10px; color: #777; opacity: 1; }
    #clear {
      background: transparent;
      color: var(--vscode-textLink-foreground);
      border: none;
      cursor: pointer;
      font-size: 11px;
      padding: 2px 4px;
    }
    #clear:hover { text-decoration: underline; }
    .msg-body { font-size: 13px; line-height: 1.5; }
    .md-plain { white-space: pre-wrap; word-break: break-word; }
    .md-prose { margin: 4px 0 10px 0; color: #e4e4e4; }
    .md-prose .md-p { margin: 0 0 8px 0; line-height: 1.6; }
    .md-prose strong { color: #ffffff; font-weight: 600; }
    .md-prose em { color: #dcdcdc; }
    .md-prose .md-h { margin: 12px 0 8px 0; font-weight: 600; line-height: 1.35; color: #ffffff; }
    .md-prose h1.md-h { font-size: 1.2rem; }
    .md-prose h2.md-h { font-size: 1.1rem; }
    .md-prose h3.md-h, .md-prose h4.md-h, .md-prose h5.md-h, .md-prose h6.md-h { font-size: 1.02rem; color: #f0f0f0; }
    .md-prose .md-ul, .md-prose .md-ol { margin: 6px 0 10px 0; padding-left: 1.35em; }
    .md-prose .md-li { margin: 4px 0; line-height: 1.55; }
    .md-prose .md-task-list .md-li { list-style: none; margin-left: -1em; }
    .md-prose .md-task-box { margin-right: 6px; opacity: 0.9; }
    .md-prose .md-inline-code {
      font-family: var(--vscode-editor-font-family), ui-monospace, monospace;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #333;
    }
    .md-prose .md-a { color: #6ea8fe; text-decoration: none; }
    .md-prose .md-a:hover { text-decoration: underline; }
    .md-prose .md-hr { border: none; border-top: 1px solid #333; margin: 12px 0; }
    .md-prose .md-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 10px 0; }
    .md-prose .md-th, .md-prose .md-td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
    .md-prose .md-th { background: #1a1a1a; color: #fff; font-weight: 600; }
    .md-prose .md-td { background: #121212; }
    .md-fence-md { padding: 4px 0; }
    .code-wrap { margin: 8px 0; border-radius: 6px; overflow: hidden; border: 1px solid #333; }
    .code-label {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
      padding: 5px 10px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-weight: 600;
    }
    .code-label-typescript, .code-label-tsx { background: #3178c6; color: #fff; }
    .code-label-javascript, .code-label-js, .code-label-jsx { background: #ca8a04; color: #111; }
    .code-label-json { background: #cbcb41; color: #111; }
    .code-label-bash, .code-label-shell { background: #3fa75c; color: #fff; }
    .code-label-css, .code-label-scss { background: #264de4; color: #fff; }
    .code-label-html, .code-label-xml { background: #c6532c; color: #fff; }
    .code-label-sql { background: #336791; color: #fff; }
    .code-label-python { background: #3776ab; color: #fff; }
    .code-label-markdown, .code-label-md { background: #083fa1; color: #fff; }
    .code-label-yaml { background: #cb171e; color: #fff; }
    .code-label-dockerfile { background: #2496ed; color: #fff; }
    .code-label-graphql { background: #e10098; color: #fff; }
    .code-label-nginx { background: #009639; color: #fff; }
    .code-label-plaintext { background: #444; color: #ddd; }
    pre.code-block code.hljs { background: #0d1117 !important; }
    .hljs { background: #0d1117 !important; }
    .code-block {
      margin: 0; padding: 10px 12px;
      font-family: var(--vscode-editor-font-family), ui-monospace, monospace;
      font-size: 12px;
      line-height: 1.45;
      overflow-x: auto;
      background: #050505;
      color: #d6d6d6;
    }
    .code-block code { font-family: inherit; }
    #create-bar {
      display: none;
      flex-shrink: 0;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 8px 10px;
      margin: 0 0 8px 0;
      border-radius: var(--asi-radius);
      background: #141414;
      border: 1px solid #2a2a2a;
    }
    #create-bar.visible { display: flex; }
    #create-files-btn {
      padding: 8px 14px;
      cursor: pointer;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
    }
    #create-files-btn:hover { filter: brightness(1.05); }
    #create-list { font-size: 11px; color: #999; }
    #activity-bar {
      display: none;
      font-size: 11px;
      color: #bbb;
      padding: 6px 10px;
      margin: 0 0 8px 0;
      border-radius: 6px;
      background: #141414;
      border: 1px solid #2a2a2a;
    }
    #activity-bar.visible { display: block; }
    #setup-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
      margin: 0 0 8px 0;
      padding: 10px 10px;
      border-radius: var(--asi-radius-lg);
      border: 1px solid var(--asi-border);
      background: hsl(240 6% 5%);
    }
    #setup-row.setup-hidden { display: none !important; }
    .setup-step {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .setup-step.setup-done .setup-num {
      background: hsl(142 76% 28%);
      border-color: hsl(142 70% 40%);
      color: #ecfdf5;
    }
    .setup-num {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(240 6% 12%);
      border: 1px solid var(--asi-border);
      color: var(--vscode-foreground);
    }
    .setup-inner { min-width: 0; flex: 1; }
    .setup-head {
      font-size: 12px;
      font-weight: 600;
      color: #fafafa;
      margin: 0 0 4px 0;
    }
    .setup-desc {
      font-size: 11px;
      line-height: 1.45;
      color: var(--asi-muted);
      margin: 0 0 8px 0;
    }
    .setup-desc code {
      font-family: var(--vscode-editor-font-family), ui-monospace, monospace;
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      background: #0a0a0a;
      border: 1px solid var(--asi-border);
    }
    .setup-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 30px;
      padding: 0 12px;
      font-size: 11px;
      font-weight: 600;
      border-radius: var(--asi-radius);
      border: 1px solid var(--asi-border);
      background: hsl(240 6% 10%);
      color: var(--vscode-foreground);
      cursor: pointer;
    }
    .setup-btn:hover { background: hsl(240 5% 14%); }
    .setup-btn.primary {
      background: hsl(0 0% 96%);
      color: hsl(240 10% 3.9%);
      border-color: hsl(240 6% 12%);
    }
    .setup-btn.primary:hover { filter: brightness(1.03); }
    .msg.stream-live {
      border-left: 3px solid var(--vscode-progressBar-background);
      animation: fadeIn 0.2s ease;
    }
    .streaming-body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      white-space: normal;
      word-break: break-word;
      max-height: 45vh;
      overflow-y: auto;
      color: #eaeaea;
    }
    @keyframes fadeIn { from { opacity: 0.6; } to { opacity: 1; } }
  </style>
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
        <button type="button" id="collapse-btn" title="Show / hide intro">▲</button>
      </div>
      <div class="banner-body">
        ${subtitleHtml}
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
      <div id="row">
        <textarea id="input" rows="2" placeholder="Message ASI — plan a feature, paste an error, ask for code…"></textarea>
        <button type="button" id="send">Send</button>
      </div>
      <div id="toolbar">
        <span id="hint">Enter send · Shift+Enter newline · Stream + status above</span>
        <button type="button" id="clear">Clear chat</button>
      </div>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const log = document.getElementById('log');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('send');
    const loadingEl = document.getElementById('loading');
    const banner = document.getElementById('banner');
    const collapseBtn = document.getElementById('collapse-btn');
    let loading = false;

    try {
      if (sessionStorage.getItem('asiBannerCollapsed') === '1') {
        banner.classList.add('collapsed');
        collapseBtn.textContent = '▼';
      }
    } catch (e) {}

    collapseBtn.addEventListener('click', function () {
      banner.classList.toggle('collapsed');
      var collapsed = banner.classList.contains('collapsed');
      collapseBtn.textContent = collapsed ? '▼' : '▲';
      try {
        sessionStorage.setItem('asiBannerCollapsed', collapsed ? '1' : '0');
      } catch (e) {}
    });

    function autoResize() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    }
    input.addEventListener('input', autoResize);

    function setActivity(text) {
      var ab = document.getElementById('activity-bar');
      var at = document.getElementById('activity-text');
      if (text) {
        at.textContent = text;
        ab.classList.add('visible');
      } else {
        at.textContent = '';
        ab.classList.remove('visible');
      }
    }

    var hlTimer = null;
    function scheduleSyntaxHighlight() {
      if (hlTimer) clearTimeout(hlTimer);
      hlTimer = setTimeout(function () {
        hlTimer = null;
        if (typeof ASI_MD !== 'undefined' && ASI_MD.applySyntaxHighlight) {
          ASI_MD.applySyntaxHighlight(log);
        }
      }, 100);
    }

    function setStreamPreview(text) {
      var slot = document.getElementById('stream-live');
      if (!slot) {
        slot = document.createElement('div');
        slot.id = 'stream-live';
        slot.className = 'msg assistant stream-live';
        var role = document.createElement('div');
        role.className = 'role';
        role.textContent = 'ASI';
        slot.appendChild(role);
        var body = document.createElement('div');
        body.className = 'msg-body streaming-body';
        body.id = 'stream-live-body';
        slot.appendChild(body);
        log.appendChild(slot);
      }
      var b = document.getElementById('stream-live-body');
      if (b) {
        while (b.firstChild) b.removeChild(b.firstChild);
        if (typeof ASI_MD !== 'undefined' && ASI_MD.renderAssistant) {
          ASI_MD.renderAssistant(b, text);
        } else {
          b.textContent = text;
        }
      }
      log.scrollTop = log.scrollHeight;
      if (text && text.length) loadingEl.style.display = 'none';
      scheduleSyntaxHighlight();
    }

    function removeStreamPreview() {
      var slot = document.getElementById('stream-live');
      if (slot) slot.remove();
    }

    function renderAssistantBody(container, raw) {
      if (typeof ASI_MD !== 'undefined' && ASI_MD.renderAssistant) {
        ASI_MD.renderAssistant(container, raw);
      } else {
        var fb = document.createElement('div');
        fb.className = 'md-plain';
        fb.textContent = raw;
        container.appendChild(fb);
      }
    }

    function render(history) {
      log.innerHTML = '';
      var list = history || [];
      if (list.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'empty-hint';
        empty.textContent = 'Start a conversation below. Ask for a plan, implementation, or paste code/errors.';
        log.appendChild(empty);
        return;
      }
      list.forEach(function (m) {
        var div = document.createElement('div');
        div.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');
        var role = document.createElement('div');
        role.className = 'role';
        role.textContent = m.role === 'user' ? 'You' : 'ASI';
        div.appendChild(role);
        var body = document.createElement('div');
        body.className = 'msg-body';
        if (m.role === 'user') {
          var plain = document.createElement('div');
          plain.className = 'md-plain';
          plain.textContent = m.content;
          body.appendChild(plain);
        } else {
          renderAssistantBody(body, m.content);
        }
        div.appendChild(body);
        log.appendChild(div);
      });
      log.scrollTop = log.scrollHeight;
      scheduleSyntaxHighlight();
    }

    function updateCreateBar(files) {
      var bar = document.getElementById('create-bar');
      var btn = document.getElementById('create-files-btn');
      var list = document.getElementById('create-list');
      if (!files || files.length === 0) {
        bar.classList.remove('visible');
        return;
      }
      bar.classList.add('visible');
      list.textContent = files.map(function (f) { return f.relativePath; }).join(' · ');
    }

    window.addEventListener('message', function (e) {
      var m = e.data;
      if (m.type === 'activity') {
        setActivity(m.text || '');
      }
      if (m.type === 'stream') {
        if (m.reset || m.done) removeStreamPreview();
        if (!m.done && typeof m.text === 'string' && m.text.length) setStreamPreview(m.text);
      }
      if (m.type === 'setup') {
        applySetup(m);
      }
      if (m.type === 'state') {
        removeStreamPreview();
        render(m.history);
        updateCreateBar(m.extractedFiles);
      }
      if (m.type === 'loading') {
        loading = !!m.value;
        sendBtn.disabled = loading;
        input.disabled = loading;
        loadingEl.style.display = loading ? 'flex' : 'none';
        if (loading) log.scrollTop = log.scrollHeight;
      }
      if (m.type === 'error') {
        var div = document.createElement('div');
        div.className = 'msg user';
        div.textContent = 'Error: ' + m.value;
        log.appendChild(div);
      }
    });

    function send() {
      var t = input.value.trim();
      if (!t || loading) return;
      input.value = '';
      autoResize();
      vscode.postMessage({ type: 'send', text: t });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        send();
      }
    });
    document.getElementById('clear').addEventListener('click', function () {
      vscode.postMessage({ type: 'clear' });
    });
    document.getElementById('create-files-btn').addEventListener('click', function () {
      vscode.postMessage({ type: 'createFiles' });
    });

    var btnInstall = document.getElementById('btn-install-vsix');
    var btnApi = document.getElementById('btn-api-key');
    var stepInstall = document.getElementById('step-install');
    var stepApi = document.getElementById('step-api');
    var setupRow = document.getElementById('setup-row');

    function applySetup(m) {
      if (!m || typeof m.dev !== 'boolean') return;
      var dev = m.dev;
      var hasApiKey = !!m.hasApiKey;
      stepInstall.style.display = dev ? '' : 'none';
      if (hasApiKey) {
        stepApi.classList.add('setup-done');
        btnApi.textContent = 'Change API key';
      } else {
        stepApi.classList.remove('setup-done');
        btnApi.textContent = 'Add API key';
      }
      var hideRow = !dev && hasApiKey;
      setupRow.classList.toggle('setup-hidden', hideRow);
      if (dev && hasApiKey && !hideRow) {
        setupRow.style.flexDirection = 'column';
      }
    }

    btnInstall.addEventListener('click', function () {
      vscode.postMessage({ type: 'installVsix' });
    });
    btnApi.addEventListener('click', function () {
      vscode.postMessage({ type: 'openApiKey' });
    });

    vscode.postMessage({ type: 'setupReady' });
  </script>
</body>
</html>`;
  }
}
