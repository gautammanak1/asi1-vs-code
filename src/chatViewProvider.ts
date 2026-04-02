import { randomUUID } from "node:crypto";
import * as vscode from "vscode";
import {
  completeChat,
  completeChatStreaming,
  fetchAvailableModels,
  generateImage,
  isApiKeyConfigured,
  runChatWithTools,
  type ApiChatMessage,
  type ChatMessage,
  type ToolExecutionEvent,
} from "./asiClient";
import { extractFilesFromMarkdown, writeExtractedFiles } from "./workspaceFiles";

const CHAT_STATE_KEY = "asiAssistant.sidebarChat.v1";

interface StoredChatState {
  chatId: string;
  history: ChatMessage[];
  webSearchEnabled?: boolean;
  turnMeta?: TurnMeta[];
  tabs?: ChatTabState[];
  activeChatId?: string;
  assistantMode?: AssistantMode;
}

interface TurnMeta {
  edited?: boolean;
  editHistory?: string[];
  retryCount?: number;
  retryHistory?: string[];
}

interface ChatTabState {
  chatId: string;
  history: ChatMessage[];
  apiThread: ApiChatMessage[];
  turnMeta: TurnMeta[];
  sessionIdGenerated: string;
  title?: string;
  artifactUi?: ArtifactUiState;
}

interface ArtifactUiState {
  open: boolean;
  mode: "text" | "code" | "sheet";
  width: number;
}

type AssistantMode = "plan" | "code" | "debug" | "ask";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "asiAssistant.chatView";

  private _view?: vscode.WebviewView;
  /** User/assistant turns only; system prompt is added per request from settings. */
  private _history: ChatMessage[] = [];
  /** When tool calling is enabled: full OpenAI-style thread including tool messages. */
  private _apiThread: ApiChatMessage[] = [];
  /** Used for `x-session-id` when agentic session is on and no manual session id is set. */
  private _sessionIdGenerated: string = randomUUID();
  /** Stable id for this chat thread (shown in UI, persisted across reloads). */
  private _chatId: string;
  /** All chat tabs persisted in global state. */
  private _chatTabs: ChatTabState[] = [];
  /** UI web-search toggle state persisted across reopen. */
  private _webSearchEnabled: boolean;
  /** Per-turn UI metadata: retry/edit history and counters. */
  private _turnMeta: TurnMeta[] = [];
  /** Carries retry metadata into the next regenerated assistant turn. */
  private _pendingAssistantMeta?: TurnMeta;
  /** Active tab artifact panel state. */
  private _artifactUi: ArtifactUiState = { open: false, mode: "text", width: 460 };
  /** Tracks the currently running request so UI can cancel. */
  private _inflightAbort?: AbortController;
  /** Lightweight cache for @ mention file picker. */
  private _workspaceFileCache: { at: number; files: string[] } = { at: 0, files: [] };
  /** Current assistant mode selected from UI dropdown. */
  private _assistantMode: AssistantMode = "code";

  constructor(private readonly _context: vscode.ExtensionContext) {
    this._chatId = randomUUID();
    this._webSearchEnabled =
      vscode.workspace.getConfiguration("asiAssistant").get<boolean>("webSearch") !== false;
    const raw = this._context.globalState.get<string>(CHAT_STATE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw) as StoredChatState;
        if (Array.isArray(s.tabs) && s.tabs.length) {
          this._chatTabs = s.tabs.map((t) => ({
            chatId: t.chatId || randomUUID(),
            history: Array.isArray(t.history) ? t.history : [],
            apiThread: Array.isArray(t.apiThread) ? t.apiThread : [],
            turnMeta: Array.isArray(t.turnMeta) ? t.turnMeta.slice(0, (t.history ?? []).length) : [],
            sessionIdGenerated: t.sessionIdGenerated || randomUUID(),
            title: typeof t.title === "string" ? t.title : undefined,
            artifactUi: {
              open: t.artifactUi?.open === true,
              mode:
                t.artifactUi?.mode === "code" || t.artifactUi?.mode === "sheet"
                  ? t.artifactUi.mode
                  : "text",
              width:
                typeof t.artifactUi?.width === "number" && Number.isFinite(t.artifactUi.width)
                  ? Math.min(Math.max(t.artifactUi.width, 320), 1200)
                  : 460,
            },
          }));
          const pick = s.activeChatId || this._chatTabs[0].chatId;
          this._loadFromTab(pick);
        } else if (s.chatId && Array.isArray(s.history)) {
          this._chatId = s.chatId;
          this._history = s.history;
          this._apiThread = [];
          this._turnMeta = Array.isArray(s.turnMeta) ? s.turnMeta.slice(0, s.history.length) : [];
          while (this._turnMeta.length < this._history.length) {
            this._turnMeta.push({});
          }
          this._chatTabs = [
            {
              chatId: this._chatId,
              history: this._history,
              apiThread: this._apiThread,
              turnMeta: this._turnMeta,
              sessionIdGenerated: this._sessionIdGenerated,
              artifactUi: { open: false, mode: "text", width: 460 },
            },
          ];
        }
        if (typeof s.webSearchEnabled === "boolean") {
          this._webSearchEnabled = s.webSearchEnabled;
        }
        if (
          s.assistantMode === "plan" ||
          s.assistantMode === "code" ||
          s.assistantMode === "debug" ||
          s.assistantMode === "ask"
        ) {
          this._assistantMode = s.assistantMode;
        }
      } catch {
        /* keep fresh chat */
      }
    }
    if (!this._chatTabs.length) {
      this._chatTabs = [
        {
          chatId: this._chatId,
          history: this._history,
          apiThread: this._apiThread,
          turnMeta: this._turnMeta,
          sessionIdGenerated: this._sessionIdGenerated,
          artifactUi: { open: false, mode: "text", width: 460 },
        },
      ];
    }
  }

  private _syncActiveIntoTabs(): void {
    const i = this._chatTabs.findIndex((t) => t.chatId === this._chatId);
    const next: ChatTabState = {
      chatId: this._chatId,
      history: [...this._history],
      apiThread: [...this._apiThread],
      turnMeta: [...this._turnMeta],
      sessionIdGenerated: this._sessionIdGenerated,
      title: this._chatTabs[i]?.title,
      artifactUi: { ...this._artifactUi },
    };
    if (i >= 0) {
      this._chatTabs[i] = next;
    } else {
      this._chatTabs.push(next);
    }
  }

  private _loadFromTab(chatId: string): void {
    const tab = this._chatTabs.find((t) => t.chatId === chatId);
    if (!tab) {
      return;
    }
    this._chatId = tab.chatId;
    this._history = [...tab.history];
    this._apiThread = [...tab.apiThread];
    this._turnMeta = [...tab.turnMeta];
    this._sessionIdGenerated = tab.sessionIdGenerated || randomUUID();
    this._artifactUi = tab.artifactUi
      ? { ...tab.artifactUi }
      : { open: false, mode: "text", width: 460 };
  }

  private _newChatTab(): void {
    this._syncActiveIntoTabs();
    const tab: ChatTabState = {
      chatId: randomUUID(),
      history: [],
      apiThread: [],
      turnMeta: [],
      sessionIdGenerated: randomUUID(),
      title: "New chat",
      artifactUi: { open: false, mode: "text", width: 460 },
    };
    this._chatTabs.push(tab);
    this._loadFromTab(tab.chatId);
  }

  private _renameTab(chatId: string, title: string): void {
    const t = this._chatTabs.find((x) => x.chatId === chatId);
    if (!t) {
      return;
    }
    const next = title.trim().slice(0, 48);
    if (!next) {
      return;
    }
    t.title = next;
  }

  private _closeTab(chatId: string): void {
    if (this._chatTabs.length <= 1) {
      // Keep one tab minimum; clear current one instead.
      if (this._chatId === chatId) {
        this._history = [];
        this._apiThread = [];
        this._turnMeta = [];
        this._pendingAssistantMeta = undefined;
      }
      return;
    }
    const idx = this._chatTabs.findIndex((t) => t.chatId === chatId);
    if (idx < 0) {
      return;
    }
    const wasActive = this._chatTabs[idx].chatId === this._chatId;
    this._chatTabs.splice(idx, 1);
    if (wasActive) {
      const fallback = this._chatTabs[Math.max(0, idx - 1)] ?? this._chatTabs[0];
      this._loadFromTab(fallback.chatId);
    }
  }

  private _persistChatState(): void {
    this._syncActiveIntoTabs();
    void this._context.globalState.update(
      CHAT_STATE_KEY,
      JSON.stringify({
        chatId: this._chatId,
        history: this._history,
        webSearchEnabled: this._webSearchEnabled,
        turnMeta: this._turnMeta,
        tabs: this._chatTabs,
        activeChatId: this._chatId,
        assistantMode: this._assistantMode,
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
        await this._postModelState();
        this._postState();
        return;
      }
      if (msg.type === "enhancePrompt" && typeof msg.text === "string") {
        await this._enhancePrompt(msg.text);
        return;
      }
      if (msg.type === "searchWorkspaceFiles") {
        const query = typeof msg.query === "string" ? msg.query : "";
        await this._searchWorkspaceFiles(query);
        return;
      }
      if (msg.type === "setAssistantMode" && typeof msg.value === "string") {
        const v = msg.value;
        if (v === "plan" || v === "code" || v === "debug" || v === "ask") {
          this._assistantMode = v;
          this._persistChatState();
          this._postState();
        }
        return;
      }
      if (msg.type === "revertChat") {
        this._revertLastExchange();
        return;
      }
      if (msg.type === "send" && typeof msg.text === "string") {
        const text = msg.text.trim();
        if (!text) {
          return;
        }
        if (
          msg.assistantMode === "plan" ||
          msg.assistantMode === "code" ||
          msg.assistantMode === "debug" ||
          msg.assistantMode === "ask"
        ) {
          this._assistantMode = msg.assistantMode;
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
      if (msg.type === "setModel" && typeof msg.value === "string") {
        const v = msg.value.trim();
        if (v) {
          await vscode.workspace
            .getConfiguration("asiAssistant")
            .update("model", v, vscode.ConfigurationTarget.Global);
          await this._postModelState();
        }
        return;
      }
      if (msg.type === "setToolsEnabled" && typeof msg.value === "boolean") {
        await vscode.workspace
          .getConfiguration("asiAssistant")
          .update("enableTools", msg.value, vscode.ConfigurationTarget.Global);
        await this._postModelState();
        return;
      }
      if (msg.type === "setArtifactUi" && msg.value && typeof msg.value === "object") {
        const value = msg.value as Partial<ArtifactUiState>;
        this._artifactUi = {
          open: value.open === true,
          mode: value.mode === "code" || value.mode === "sheet" ? value.mode : "text",
          width:
            typeof value.width === "number" && Number.isFinite(value.width)
              ? Math.min(Math.max(value.width, 320), 1200)
              : this._artifactUi.width,
        };
        this._persistChatState();
        return;
      }
      if (msg.type === "newTab") {
        if (this._inflightAbort) {
          this._inflightAbort.abort();
          this._inflightAbort = undefined;
        }
        this._newChatTab();
        this._postState();
        return;
      }
      if (msg.type === "switchTab" && typeof msg.chatId === "string") {
        if (this._inflightAbort) {
          this._inflightAbort.abort();
          this._inflightAbort = undefined;
        }
        this._syncActiveIntoTabs();
        this._loadFromTab(msg.chatId);
        this._postState();
        return;
      }
      if (msg.type === "renameTab" && typeof msg.chatId === "string" && typeof msg.title === "string") {
        this._renameTab(msg.chatId, msg.title);
        this._postState();
        return;
      }
      if (msg.type === "closeTab" && typeof msg.chatId === "string") {
        if (this._inflightAbort) {
          this._inflightAbort.abort();
          this._inflightAbort = undefined;
        }
        this._syncActiveIntoTabs();
        this._closeTab(msg.chatId);
        this._postState();
        return;
      }
      if (msg.type === "regenerateTurn" && typeof msg.index === "number") {
        await this._regenerateAssistantTurn(msg.index);
        return;
      }
      if (
        msg.type === "editUserTurn" &&
        typeof msg.index === "number" &&
        typeof msg.text === "string"
      ) {
        await this._editUserTurn(msg.index, msg.text);
        return;
      }
      if (msg.type === "stop") {
        if (this._inflightAbort) {
          this._inflightAbort.abort();
        }
        return;
      }
      if (msg.type === "clear") {
        this._history = [];
        this._apiThread = [];
        this._turnMeta = [];
        this._pendingAssistantMeta = undefined;
        this._artifactUi = { ...this._artifactUi, open: false };
        if (this._inflightAbort) {
          this._inflightAbort.abort();
          this._inflightAbort = undefined;
        }
        this._sessionIdGenerated = randomUUID();
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

  private async _postModelState(): Promise<void> {
    if (!this._view) {
      return;
    }
    const cfg = vscode.workspace.getConfiguration("asiAssistant");
    const selectedModel = cfg.get<string>("model")?.trim() || "asi1";
    const enableTools = cfg.get<boolean>("enableTools") !== false;
    const streamResponse = cfg.get<boolean>("streamResponse") !== false;
    const models = await fetchAvailableModels();
    const capabilities: Record<string, { tools: boolean; reasoning: boolean; vision: boolean }> =
      {};
    for (const id of models) {
      capabilities[id] = this._inferModelCapabilities(id);
    }
    this._view.webview.postMessage({
      type: "modelState",
      selectedModel,
      models,
      capabilities,
      enableTools,
      streamResponse,
    });
  }

  public appendUserMessageAndRun(text: string): void {
    if (!text.trim()) {
      return;
    }
    this._history.push({ role: "user", content: text });
    this._turnMeta.push({});
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

  private _rebuildApiThreadFromHistory(): void {
    this._apiThread = [];
    const useTools =
      vscode.workspace.getConfiguration("asiAssistant").get<boolean>("enableTools") !== false;
    if (!useTools) {
      return;
    }
    for (const m of this._history) {
      if (m.role === "user" || m.role === "assistant") {
        this._apiThread.push({ role: m.role, content: m.content });
      }
    }
  }

  private async _regenerateAssistantTurn(index: number): Promise<void> {
    if (index < 0 || index >= this._history.length) {
      return;
    }
    const at = this._history[index];
    if (at.role !== "assistant") {
      return;
    }
    if (this._inflightAbort) {
      this._inflightAbort.abort();
      this._inflightAbort = undefined;
    }
    const meta = this._turnMeta[index] ?? {};
    this._pendingAssistantMeta = {
      ...meta,
      retryCount: (meta.retryCount ?? 0) + 1,
      retryHistory: [...(meta.retryHistory ?? []), new Date().toISOString()].slice(-12),
    };
    this._history = this._history.slice(0, index);
    this._turnMeta = this._turnMeta.slice(0, index);
    this._rebuildApiThreadFromHistory();
    this._postState();
    await this._completeFromHistory();
  }

  private async _editUserTurn(index: number, text: string): Promise<void> {
    if (index < 0 || index >= this._history.length) {
      return;
    }
    const at = this._history[index];
    if (at.role !== "user") {
      return;
    }
    const nextText = text.trim();
    if (!nextText) {
      return;
    }
    if (this._inflightAbort) {
      this._inflightAbort.abort();
      this._inflightAbort = undefined;
    }
    const oldText = this._history[index].content;
    this._history[index] = { role: "user", content: nextText };
    const meta = this._turnMeta[index] ?? {};
    this._turnMeta[index] = {
      ...meta,
      edited: true,
      editHistory: [...(meta.editHistory ?? []), oldText].slice(-8),
    };
    this._history = this._history.slice(0, index + 1);
    this._turnMeta = this._turnMeta.slice(0, index + 1);
    this._rebuildApiThreadFromHistory();
    this._postState();
    await this._completeFromHistory();
  }

  private _revertLastExchange(): void {
    if (this._inflightAbort) {
      this._inflightAbort.abort();
      this._inflightAbort = undefined;
    }
    if (!this._history.length) {
      return;
    }
    let cut = this._history.length;
    if (cut > 0 && this._history[cut - 1]?.role === "assistant") {
      cut -= 1;
    }
    if (cut > 0 && this._history[cut - 1]?.role === "user") {
      cut -= 1;
    } else if (cut === this._history.length && cut > 0) {
      cut -= 1;
    }
    cut = Math.max(0, cut);
    this._history = this._history.slice(0, cut);
    this._turnMeta = this._turnMeta.slice(0, cut);
    this._pendingAssistantMeta = undefined;
    this._artifactUi = { ...this._artifactUi, open: false };
    this._rebuildApiThreadFromHistory();
    this._postState();
  }

  private _inferModelCapabilities(id: string): {
    tools: boolean;
    reasoning: boolean;
    vision: boolean;
  } {
    const low = id.toLowerCase();
    const vision = /(vision|vl|image|multimodal|omni|4o)/.test(low) || low === "asi1";
    const reasoning = /(reason|r1|o1|o3|think|deep)/.test(low) || low === "asi1";
    const tools = true;
    return { tools, reasoning, vision };
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
    const modeHints: Record<AssistantMode, string> = {
      plan:
        "Assistant mode is PLAN. Provide a structured implementation plan only. Do not output final code unless the user explicitly asks for code.",
      code:
        "Assistant mode is CODE. Prioritize implementation-ready code and direct execution details.",
      debug:
        "Assistant mode is DEBUG. Focus on diagnosis, likely root causes, and concrete fix steps. Prefer debugging evidence over broad rewrites.",
      ask:
        "Assistant mode is ASK. Focus on explanations and answers. Avoid code changes unless the user explicitly requests implementation.",
    };
    sys = sys.trim() ? `${sys.trim()}\n\n${modeHints[this._assistantMode]}` : modeHints[this._assistantMode];
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

  private async _enhancePrompt(text: string): Promise<void> {
    const raw = text.trim();
    if (!raw) {
      this._view?.webview.postMessage({ type: "promptEnhanced", value: "" });
      return;
    }
    this._view?.webview.postMessage({ type: "enhanceLoading", value: true });
    this._view?.webview.postMessage({ type: "activity", text: "Enhancing prompt…" });
    try {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You rewrite user prompts for a coding assistant. Keep intent unchanged, preserve language, remove ambiguity, add concrete constraints if implied, and return only the rewritten prompt without commentary.",
        },
        { role: "user", content: raw },
      ];
      const r = await completeChat(messages, undefined, { webSearch: false });
      const next = (r.content || "").trim() || raw;
      this._view?.webview.postMessage({ type: "promptEnhanced", value: next });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._view?.webview.postMessage({ type: "error", value: msg });
    } finally {
      this._view?.webview.postMessage({ type: "enhanceLoading", value: false });
      setTimeout(() => {
        this._view?.webview.postMessage({ type: "activity", text: "" });
      }, 700);
    }
  }

  private async _searchWorkspaceFiles(queryRaw: string): Promise<void> {
    const q = queryRaw.trim().replace(/^@/, "").toLowerCase();
    const recent = this._collectRecentMentionPaths();
    try {
      const all = await this._getWorkspaceFilesCached();
      const ranked = all
        .map((path) => {
          const low = path.toLowerCase();
          const starts = q ? low.startsWith(q) : false;
          const contains = q ? low.includes(q) : true;
          return { path, starts, contains };
        })
        .filter((x) => x.contains)
        .sort((a, b) => {
          const ap = recent.indexOf(a.path);
          const bp = recent.indexOf(b.path);
          const ar = ap >= 0 ? ap : 10_000;
          const br = bp >= 0 ? bp : 10_000;
          if (ar !== br) return ar - br;
          if (a.starts !== b.starts) return a.starts ? -1 : 1;
          return a.path.length - b.path.length;
        })
        .slice(0, 40)
        .map((x) => x.path);
      const recentFiltered = recent.filter((p) => (q ? p.toLowerCase().includes(q) : true)).slice(0, 8);
      const recentSet = new Set(recentFiltered);
      const workspaceOnly = ranked.filter((p) => !recentSet.has(p)).slice(0, 40);
      this._view?.webview.postMessage({
        type: "mentionCandidates",
        sections: {
          recent: recentFiltered,
          workspace: workspaceOnly,
        },
      });
    } catch {
      this._view?.webview.postMessage({
        type: "mentionCandidates",
        sections: { recent: recent.slice(0, 12), workspace: [] },
      });
    }
  }

  private async _getWorkspaceFilesCached(): Promise<string[]> {
    const now = Date.now();
    if (now - this._workspaceFileCache.at < 8_000 && this._workspaceFileCache.files.length) {
      return this._workspaceFileCache.files;
    }
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      this._workspaceFileCache = { at: now, files: [] };
      return [];
    }
    const files = await vscode.workspace.findFiles(
      "**/*",
      "{**/node_modules/**,**/.git/**,**/.cursor/**,**/dist/**,**/build/**,**/.next/**,**/out/**}",
      1200
    );
    const rel = files.map((uri) => vscode.workspace.asRelativePath(uri, false)).filter(Boolean);
    this._workspaceFileCache = { at: now, files: rel };
    return rel;
  }

  private _collectRecentMentionPaths(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (let i = this._history.length - 1; i >= 0; i--) {
      const turn = this._history[i];
      if (!turn || turn.role !== "assistant" || typeof turn.content !== "string") continue;
      const files = extractFilesFromMarkdown(turn.content);
      for (const f of files) {
        const p = f.relativePath.trim();
        if (!p || seen.has(p)) continue;
        seen.add(p);
        out.push(p);
        if (out.length >= 80) return out;
      }
    }
    return out;
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
    this._turnMeta.push({});
    this._postState();
    this._view?.webview.postMessage({ type: "activity", text: "Generating image…" });
    this._view?.webview.postMessage({ type: "loading", value: true });
    const ac = new AbortController();
    this._inflightAbort = ac;
    try {
      const r = await generateImage({ prompt, size, signal: ac.signal });
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
      this._turnMeta.push(this._pendingAssistantMeta ?? {});
      this._pendingAssistantMeta = undefined;
      this._postState();
    } catch (e) {
      if (ac.signal.aborted) {
        this._history.push({ role: "assistant", content: "_Stopped._" });
        this._turnMeta.push(this._pendingAssistantMeta ?? {});
        this._pendingAssistantMeta = undefined;
        this._postState();
        return;
      }
      const errMsg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(errMsg);
      this._history.push({ role: "assistant", content: `**Error:** ${errMsg}` });
      this._turnMeta.push(this._pendingAssistantMeta ?? {});
      this._pendingAssistantMeta = undefined;
      this._postState();
    } finally {
      if (this._inflightAbort === ac) {
        this._inflightAbort = undefined;
      }
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
    this._turnMeta.push({});
    this._pendingAssistantMeta = undefined;
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
    this._view?.webview.postMessage({ type: "tools", reset: true });
    const ac = new AbortController();
    this._inflightAbort = ac;

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
          onToolEvent: (event: ToolExecutionEvent) => {
            this._view?.webview.postMessage({ type: "tools", event });
          },
          sessionId: sessionHeader,
          maxRounds: maxToolRounds,
          webSearch,
          signal: ac.signal,
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
          ac.signal,
          { sessionIdHeader: sessionHeader, webSearch }
        );
        content = r.content || content;
      } else {
        this._view?.webview.postMessage({ type: "activity", text: "Waiting for reply…" });
        const r = await completeChat(messages as ChatMessage[], ac.signal, {
          sessionIdHeader: sessionHeader,
          webSearch,
        });
        content = r.content;
      }

      this._history.push({ role: "assistant", content });
      this._turnMeta.push(this._pendingAssistantMeta ?? {});
      this._pendingAssistantMeta = undefined;
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
      if (ac.signal.aborted) {
        this._history.push({ role: "assistant", content: "_Stopped by user._" });
        this._turnMeta.push(this._pendingAssistantMeta ?? {});
        this._pendingAssistantMeta = undefined;
        this._postState();
        this._view?.webview.postMessage({ type: "activity", text: "Stopped." });
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(msg);
      this._view?.webview.postMessage({ type: "error", value: msg });
      this._view?.webview.postMessage({ type: "stream", done: true });
    } finally {
      if (this._inflightAbort === ac) {
        this._inflightAbort = undefined;
      }
      this._view?.webview.postMessage({ type: "loading", value: false });
      setTimeout(() => {
        this._view?.webview.postMessage({ type: "activity", text: "" });
      }, 1200);
    }
  }

  private _postState(): void {
    const lastAssistant = [...this._history].reverse().find((m) => m.role === "assistant");
    const extractedFiles = lastAssistant ? extractFilesFromMarkdown(lastAssistant.content) : [];
    this._syncActiveIntoTabs();
    const tabs = this._chatTabs.map((t) => {
      const firstUser = t.history.find((m) => m.role === "user")?.content.trim() || "";
      const title = t.title?.trim() || (firstUser ? firstUser.slice(0, 28) : "New chat");
      return {
        chatId: t.chatId,
        chatIdShort: t.chatId.replace(/-/g, "").slice(0, 8),
        title,
        turnCount: t.history.length,
      };
    });
    this._persistChatState();
    this._view?.webview.postMessage({
      type: "state",
      history: this._history,
      turnMeta: this._turnMeta,
      tabs,
      activeChatId: this._chatId,
      artifactUi: this._artifactUi,
      extractedFiles,
      chatId: this._chatId,
      chatIdShort: this._chatId.replace(/-/g, "").slice(0, 10),
      webSearchEnabled: this._webSearchEnabled,
      assistantMode: this._assistantMode,
    });
    void this._postModelState();
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
    <div id="tabs-bar" class="tabs-bar">
      <div id="tabs-list" class="tabs-list"></div>
      <button type="button" id="new-tab-btn" class="new-tab-btn" title="New chat tab" aria-label="New chat tab">+</button>
    </div>
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
        <span class="asi-brand">Fetch Coder</span>
        <button type="button" class="chat-meta-btn" disabled aria-hidden="true">
          <span class="chev">▸</span>
          <span id="msg-count">0</span> turns
        </button>
        <span id="chat-session-id" class="chat-session-id" title="Chat session — persisted until you Clear">…</span>
      </div>
      <div class="top-actions">
        <button type="button" id="stop" class="chat-review-btn stop-btn hidden">Stop</button>
        <button type="button" id="revert" class="chat-review-btn">Revert</button>
        <button type="button" id="clear" class="chat-review-btn">Clear</button>
      </div>
    </div>
    <div id="context-graphs" class="context-graphs">
      <div class="context-graphs-head">
        <span class="context-graphs-title">Context Graphs</span>
        <span id="context-graphs-status" class="context-graphs-status">Idle</span>
      </div>
      <div class="context-graphs-progress-track">
        <span id="context-graphs-progress" class="context-graphs-progress"></span>
      </div>
      <div id="context-graphs-list" class="context-graphs-list"></div>
    </div>
    <div id="log"></div>
    <div id="create-bar">
      <button type="button" id="create-files-btn">Create files in workspace</button>
      <span id="create-list"></span>
    </div>
    <div id="loading" class="loading-row" style="display:none">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      <span>Fetch Coder is thinking…</span>
    </div>
    <div id="tool-trace" class="tool-trace"></div>
    <div id="artifact-panel" class="artifact-panel" data-mode="text">
      <div id="artifact-resizer" class="artifact-resizer" title="Resize"></div>
      <div class="artifact-head">
        <div class="artifact-tabs">
          <button type="button" class="artifact-tab-btn active" data-mode="text">Text</button>
          <button type="button" class="artifact-tab-btn" data-mode="code">Code</button>
          <button type="button" class="artifact-tab-btn" data-mode="sheet">Sheet</button>
        </div>
        <div class="artifact-snaps">
          <button type="button" class="artifact-snap-btn" data-snap="35">35%</button>
          <button type="button" class="artifact-snap-btn" data-snap="45">45%</button>
          <button type="button" class="artifact-snap-btn" data-snap="55">55%</button>
        </div>
        <button type="button" id="artifact-close" class="artifact-close-btn">Close</button>
      </div>
      <div id="artifact-body" class="artifact-body"></div>
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
          <div id="slash-menu" class="slash-menu"></div>
          <div id="attach-list" class="attach-list"></div>
          <div id="mention-menu" class="mention-menu"></div>
          <div id="mention-list" class="mention-list"></div>
          <div class="composer-inline-bar">
            <div class="inline-left">
              <div class="mode-picker">
                <button type="button" id="assistant-mode-btn" class="mode-picker-btn" aria-haspopup="menu" aria-expanded="false">
                  <span id="assistant-mode-icon" class="mode-picker-icon">&lt;/&gt;</span>
                  <span id="assistant-mode-label" class="mode-picker-label">Code</span>
                  <span class="mode-picker-chev">▾</span>
                </button>
                <div id="assistant-mode-menu" class="mode-picker-menu" role="menu">
                  <button type="button" class="mode-item" data-mode="plan" role="menuitem">
                    <span class="mode-item-head">Plan</span>
                    <span class="mode-item-sub">Create structured plan before coding</span>
                  </button>
                  <button type="button" class="mode-item active" data-mode="code" role="menuitem">
                    <span class="mode-item-head">Code</span>
                    <span class="mode-item-sub">Write code and run commands</span>
                  </button>
                  <button type="button" class="mode-item" data-mode="debug" role="menuitem">
                    <span class="mode-item-head">Debug</span>
                    <span class="mode-item-sub">Diagnose and fix bugs</span>
                  </button>
                  <button type="button" class="mode-item" data-mode="ask" role="menuitem">
                    <span class="mode-item-head">Ask</span>
                    <span class="mode-item-sub">Get answers, ideas and explanations</span>
                  </button>
                </div>
              </div>
              <button type="button" id="upload-btn" class="inline-chip-btn" title="Attach file" aria-label="Attach file">
                📎
              </button>
            </div>
            <div class="inline-right">
              <button type="button" id="prompt-enhance-btn" class="inline-chip-btn prompt-enhance-btn" title="Enhance prompt" aria-label="Enhance prompt">
                <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z"/><path d="M18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/><path d="M6.2 14.8l3-3 3 3-3 3-3-3z"/></svg>
              </button>
              <button type="button" id="tools-btn" class="inline-chip-btn active" title="Tool calling" aria-label="Tool calling" aria-pressed="true">
                🛠
              </button>
              <button type="button" id="web-search-btn" class="inline-chip-btn" title="Web search" aria-label="Web search" aria-pressed="true">
                🌐
              </button>
              <button type="button" id="image-mode-btn" class="inline-chip-btn" title="Image mode" aria-label="Image mode" aria-pressed="false">
                🖼
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
