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
  /** Right-side editor panel (WebviewPanel) – independent of the sidebar view. */
  private _panel?: vscode.WebviewPanel;
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

  /** Send a message to all active webview surfaces (sidebar + panel). */
  private _broadcast(msg: unknown): void {
    this._view?.webview.postMessage(msg);
    this._panel?.webview.postMessage(msg);
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
      await this._onWebviewMessage(msg);
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.refreshSetupState();
      }
    });

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _onWebviewMessage(msg: any): Promise<void> {
      if (msg.type === "installVsix") {
        await vscode.commands.executeCommand("asiAssistant.installFromVsix");
        await this.refreshSetupState();
        return;
      }
      if (msg.type === "openApiKey") {
        await vscode.commands.executeCommand("asiAssistant.insertApiKey");
        return;
      }
      if (msg.type === "runCommand" && typeof msg.command === "string") {
        await vscode.commands.executeCommand(msg.command);
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
      if (msg.type === "clickSuggestion" && typeof msg.text === "string") {
        const text = msg.text.trim();
        if (text) {
          await this._handleUserSend(text, "chat");
        }
        return;
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
      if (msg.type === "insertAtCursor" && typeof msg.text === "string") {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await editor.edit((eb) => {
            eb.insert(editor.selection.active, msg.text);
          });
        } else {
          vscode.window.showWarningMessage("No active editor to insert into.");
        }
      }
      if (msg.type === "replaceSelection" && typeof msg.text === "string") {
        const editor = vscode.window.activeTextEditor;
        if (editor && !editor.selection.isEmpty) {
          await editor.edit((eb) => {
            eb.replace(editor.selection, msg.text);
          });
        } else {
          vscode.window.showWarningMessage("Select code in the editor first.");
        }
      }
      if (msg.type === "applyCodeBlock" && typeof msg.text === "string") {
        const filePath = typeof msg.filePath === "string" ? msg.filePath : "";
        if (filePath) {
          const folder = vscode.workspace.workspaceFolders?.[0];
          if (folder) {
            await vscode.commands.executeCommand("asiAssistant.applyWorkspaceEdit", {
              relativePath: filePath,
              content: msg.text,
              skipPreview: false,
            });
          }
        } else {
          const choice = await vscode.window.showQuickPick(
            ["Insert at Cursor", "Replace Selection", "Save as New File…"],
            { title: "Apply Code Block" }
          );
          if (choice === "Insert at Cursor") {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
              await editor.edit((eb) => eb.insert(editor.selection.active, msg.text));
            }
          } else if (choice === "Replace Selection") {
            const editor = vscode.window.activeTextEditor;
            if (editor && !editor.selection.isEmpty) {
              await editor.edit((eb) => eb.replace(editor.selection, msg.text));
            }
          } else if (choice === "Save as New File…") {
            const name = await vscode.window.showInputBox({
              title: "File path",
              placeHolder: "src/components/Example.tsx",
            });
            if (name) {
              await vscode.commands.executeCommand("asiAssistant.applyWorkspaceEdit", {
                relativePath: name,
                content: msg.text,
                skipPreview: false,
              });
            }
          }
        }
      }
      if (msg.type === "openDiffPreview" && typeof msg.text === "string") {
        const filePath = typeof msg.filePath === "string" ? msg.filePath : "";
        if (filePath) {
          await vscode.commands.executeCommand("asiAssistant.previewWorkspaceEdit", {
            relativePath: filePath,
            content: msg.text,
          });
        } else {
          const doc = await vscode.workspace.openTextDocument({ content: msg.text });
          await vscode.window.showTextDocument(doc, { preview: true });
        }
      }
      if (msg.type === "saveSnippet" && typeof msg.text === "string") {
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`snippet.${msg.lang || "txt"}`),
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(msg.text));
          vscode.window.showInformationMessage(`Saved to ${uri.fsPath}`);
        }
      }
      if (msg.type === "continueGeneration" && typeof msg.index === "number") {
        await this._handleUserMessage("Continue from where you left off.");
      }
      if (msg.type === "forkChat" && typeof msg.index === "number") {
        const upTo = this._history.slice(0, msg.index + 1);
        this._newChatTab();
        this._history = [...upTo];
        this._turnMeta = upTo.map(() => ({}));
        this._apiThread = [];
        this._syncActiveIntoTabs();
        this._postState();
        vscode.window.showInformationMessage("Chat forked into new tab.");
      }
      if (msg.type === "exportMessage" && typeof msg.content === "string") {
        const doc = await vscode.workspace.openTextDocument({ content: msg.content, language: "markdown" });
        await vscode.window.showTextDocument(doc, { preview: true });
      }
      if (msg.type === "applyAllCodeBlocks" && Array.isArray(msg.files)) {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
          vscode.window.showErrorMessage("No workspace open.");
          return;
        }
        let applied = 0;
        for (const file of msg.files as Array<{ path: string; content: string }>) {
          try {
            const uri = vscode.Uri.joinPath(folder.uri, file.path);
            const segments = file.path.split("/").filter(Boolean);
            if (segments.length > 1) {
              const parentUri = vscode.Uri.joinPath(folder.uri, ...segments.slice(0, -1));
              await vscode.workspace.fs.createDirectory(parentUri);
            }
            await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(file.content));
            applied++;
          } catch { /* skip */ }
        }
        vscode.window.showInformationMessage(`Applied ${applied}/${msg.files.length} files.`);
      }
  }

  public getHistory(): ChatMessage[] {
    return [...this._history];
  }

  /**
   * Open (or reveal) the chat in a right-side editor panel.
   */
  public openAsPanel(): void {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "asiAssistant.chatPanel",
      "Fetch Coder",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this._context.extensionUri],
      }
    );

    const iconUri = vscode.Uri.joinPath(this._context.extensionUri, "resources", "icon.png");
    panel.iconPath = iconUri;

    panel.webview.html = this._buildHtml(panel.webview);
    this._panel = panel;

    panel.webview.onDidReceiveMessage(async (msg) => {
      await this._onWebviewMessage(msg);
    });

    panel.onDidDispose(() => {
      this._panel = undefined;
    });

    void this.refreshSetupState();
  }

  /** Re-post onboarding row (API key / dev install). Call after key save or settings change. */
  public async refreshSetupState(): Promise<void> {
    const dev = this._context.extensionMode === vscode.ExtensionMode.Development;
    const hasApiKey = await isApiKeyConfigured();
    this._broadcast({ type: "setup", dev, hasApiKey });
  }

  private async _postModelState(): Promise<void> {
    if (!this._view && !this._panel) {
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
    this._broadcast({
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
    const useTools =
      vscode.workspace.getConfiguration("asiAssistant").get<boolean>("enableTools") !== false;
    const styleHint = useTools
      ? [
          "You are an advanced AI coding agent inside a VS Code extension.",
          "",
          "You have access to tools that allow you to read, write, edit files, manage folders, and execute terminal commands:",
          "- workspace_read_file: Read contents of a file",
          "- workspace_write_file: Create or overwrite a file",
          "- workspace_patch_file: Modify an existing file (search-and-replace)",
          "- workspace_create_directory: Create a directory",
          "- workspace_list_directory: View directory structure",
          "- workspace_scan_recursive: Scan workspace tree",
          "- workspace_search_files: Find files matching a glob pattern",
          "- workspace_search_text: Search file contents for text or regex",
          "- workspace_delete_file: Delete a file",
          "- workspace_rename_file: Rename/move files",
          "- run_terminal_command: Execute terminal commands (npm, git, node, python, tsc, etc.)",
          "",
          "CRITICAL RULES:",
          "1. You DO NOT have direct access to the workspace.",
          "2. You MUST use tools for any real action.",
          "3. NEVER claim that you executed something without calling a tool.",
          "4. NEVER output full code if a tool can be used.",
          "5. ALWAYS prefer tool calls over plain text.",
          "6. Break tasks into multiple steps when necessary.",
          "7. Be safe and cautious with terminal commands.",
          "",
          "DIFF PREVIEW MODE:",
          "Before modifying any existing file, you MUST:",
          "1. Read the file using workspace_read_file.",
          "2. Generate a minimal diff — only the changes, not a full rewrite.",
          "3. Briefly explain what will change.",
          "4. Then apply using workspace_patch_file for small edits or workspace_write_file for full rewrites.",
          "",
          "TERMINAL SAFETY MODE:",
          "Before running terminal commands:",
          "- Briefly explain what the command will do.",
          "- Then call run_terminal_command.",
          "- Never run destructive commands (rm -rf /, sudo rm, etc.).",
          "",
          "MULTI-STEP AGENT EXECUTION:",
          "For complex tasks:",
          "1. Plan the steps internally.",
          "2. Execute step-by-step using tools.",
          "3. After each step, validate the result and continue or fix if needed.",
          "",
          "DEBUG MODE BEHAVIOR:",
          "- Read relevant files with workspace_read_file.",
          "- Identify the issue.",
          "- Fix using workspace_patch_file or workspace_write_file.",
          "- Optionally run terminal commands for testing.",
          "",
          "PROJECT SETUP BEHAVIOR:",
          "- Create folders with workspace_create_directory.",
          "- Create files with workspace_write_file.",
          "- Install dependencies with run_terminal_command.",
          "- Run the project with run_terminal_command.",
          "",
          "IMPORTANT:",
          "- Always use relative paths from workspace root.",
          "- Ensure folders exist before writing files.",
          "- Keep code production-ready — no placeholders or TODOs.",
          "- When user mentions files with @filename, FIRST read that file before responding.",
          "",
          "You are not a chatbot.",
          "You are an autonomous coding agent that safely modifies and runs real projects using tools.",
          "All real actions must go through tools with user awareness and control.",
        ].join("\n")
      : [
          "IMPORTANT RULES FOR CODE EDITS:",
          "- When the user asks to change/fix/update specific lines or a small part of their code, show ONLY the changed lines with a few lines of surrounding context — do NOT rewrite the entire file.",
          "- Use a diff-like approach: show the specific section that changed inside a code block, not the whole file.",
          "- If the user asks you to change 1 line, output only ~5-10 lines around that change, not 200 lines.",
          "- For new files or complete rewrites, output the full code.",
          "- If the user provides example code/snippets, follow that example's structure, coding style, and conventions; do not switch to an unrelated template/layout unless explicitly asked.",
        ].join("\n");
    sys = sys.trim() ? `${sys.trim()}\n\n${styleHint}` : styleHint;
    if (webSearchForRequest) {
      const hint =
        "Live web search is enabled on the ASI:One API for this turn. For current events, sports schedules and scores, breaking news, weather, prices, or any time-sensitive facts, use the retrieved web information and answer directly. Do not refuse by claiming you lack real-time or internet access.";
      sys = sys.trim() ? `${sys.trim()}\n\n${hint}` : hint;
    }
    const modeHints: Record<AssistantMode, string> = {
      plan:
        "Current mode: PLAN. Provide a structured implementation plan with clear steps. Do not write files or run commands unless the user explicitly asks. List which files will be created/modified and what each change does.",
      code: useTools
        ? "Current mode: CODE. You are a tool-using coding agent. When the user asks to create or edit files, ALWAYS use tools (workspace_write_file, workspace_patch_file) to write them. Read files first with workspace_read_file before editing. Do not just show code — execute the changes."
        : "Current mode: CODE. Prioritize implementation-ready code. When editing existing code, show ONLY the changed section with minimal context — never rewrite the entire file for a small change.",
      debug: useTools
        ? "Current mode: DEBUG. Focus on diagnosis and fixing. Use workspace_read_file to inspect relevant files and run_terminal_command to check logs/errors. Then apply fixes with workspace_write_file or workspace_patch_file."
        : "Current mode: DEBUG. Focus on diagnosis, likely root causes, and concrete fix steps. Show only the specific lines that need fixing, not the whole file.",
      ask:
        "Current mode: ASK. Focus on explanations and answers. Avoid making file changes or running commands unless the user explicitly requests implementation.",
    };
    sys = sys.trim() ? `${sys.trim()}\n\n${modeHints[this._assistantMode]}` : modeHints[this._assistantMode];
    try {
      const { getCustomInstructionsPrompt } = require("./customInstructions");
      const ci = getCustomInstructionsPrompt();
      if (ci) sys += ci;
    } catch { /* ignore */ }
    try {
      const { getProjectContextSummary } = require("./contextIndexer");
      const ctx = getProjectContextSummary();
      if (ctx && ctx !== "Project not yet indexed.") sys += `\n\nProject context: ${ctx}`;
    } catch { /* ignore */ }
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
      this._broadcast({ type: "promptEnhanced", value: "" });
      return;
    }
    this._broadcast({ type: "enhanceLoading", value: true });
    this._broadcast({ type: "activity", text: "Enhancing prompt…" });
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
      this._broadcast({ type: "promptEnhanced", value: next });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._broadcast({ type: "error", value: msg });
    } finally {
      this._broadcast({ type: "enhanceLoading", value: false });
      setTimeout(() => {
        this._broadcast({ type: "activity", text: "" });
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
      this._broadcast({
        type: "mentionCandidates",
        sections: {
          recent: recentFiltered,
          workspace: workspaceOnly,
        },
      });
    } catch {
      this._broadcast({
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
    const matches = [...text.matchAll(/(^|\s)@([\w./-][\w./-]*\.[\w]{1,10})/g)];
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

  private _generateSuggestions(
    content: string,
    files: { relativePath: string }[]
  ): string[] {
    const suggestions: string[] = [];
    const lower = content.toLowerCase();
    const fileNames = files.map(f => f.relativePath);
    const hasHtml = fileNames.some(f => f.endsWith(".html"));
    const hasCss = fileNames.some(f => f.endsWith(".css"));
    const hasJs = fileNames.some(f => /\.(js|ts|jsx|tsx)$/.test(f));
    const hasPy = fileNames.some(f => f.endsWith(".py"));
    const hasPackageJson = fileNames.some(f => f === "package.json");

    if (files.length > 0) {
      if (hasHtml) {
        suggestions.push("Add responsive design and media queries");
        suggestions.push("Add dark/light mode toggle");
      }
      if (hasJs || hasHtml) {
        suggestions.push("Add form validation");
        suggestions.push("Add animations and transitions");
      }
      if (hasCss) {
        suggestions.push("Improve the color scheme and typography");
      }
      if (hasPackageJson) {
        suggestions.push("Run npm install");
      }
      if (hasPy) {
        suggestions.push("Add error handling and logging");
        suggestions.push("Write unit tests");
      }
      suggestions.push("Add more features to this project");
      suggestions.push("Explain what this code does");
    } else if (lower.includes("error") || lower.includes("fix") || lower.includes("bug")) {
      suggestions.push("Are there any other issues?");
      suggestions.push("Add error handling for edge cases");
      suggestions.push("Write tests for this fix");
    } else if (lower.includes("```")) {
      suggestions.push("Save this to a file");
      suggestions.push("Explain this code step by step");
      suggestions.push("Add error handling");
      suggestions.push("Optimize this code");
    } else {
      suggestions.push("Show me an example");
      suggestions.push("Tell me more");
    }

    return suggestions.slice(0, 4);
  }

  /** Image generation from the same composer; appends user + assistant turns to history. */
  private async _generateImageTurn(prompt: string, size?: string): Promise<void> {
    this._history.push({ role: "user", content: prompt });
    this._turnMeta.push({});
    this._postState();
    this._broadcast({ type: "activity", text: "Generating image…" });
    this._broadcast({ type: "loading", value: true });
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
      this._broadcast({ type: "loading", value: false });
      setTimeout(() => {
        this._broadcast({ type: "activity", text: "" });
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

    this._broadcast({ type: "activity", text: "Connecting to ASI…" });
    this._broadcast({ type: "loading", value: true });
    this._broadcast({ type: "stream", reset: true });
    this._broadcast({ type: "tools", reset: true });
    const ac = new AbortController();
    this._inflightAbort = ac;

    try {
      let content = "";
      if (useTools) {
        this._broadcast({
          type: "activity",
          text: webSearch ? "ASI:One (tools + web search)…" : "ASI:One (tools)…",
        });
        const maxToolRounds =
          vscode.workspace.getConfiguration("asiAssistant").get<number>("maxToolRounds") ?? 12;
        const { apiThread, lastAssistantText } = await runChatWithTools(messages, {
          onProgress: (label) => {
            this._broadcast({ type: "activity", text: label });
          },
          onToolEvent: (event: ToolExecutionEvent) => {
            this._broadcast({ type: "tools", event });
          },
          sessionId: sessionHeader,
          maxRounds: maxToolRounds,
          webSearch,
          signal: ac.signal,
        });
        this._apiThread = apiThread;
        content = lastAssistantText;
        this._broadcast({ type: "stream", text: content });
      } else if (useStream) {
        this._broadcast({ type: "activity", text: "Streaming response…" });
        const r = await completeChatStreaming(
          messages as ChatMessage[],
          (_delta, full) => {
            content = full;
            this._broadcast({ type: "stream", text: full });
          },
          ac.signal,
          { sessionIdHeader: sessionHeader, webSearch }
        );
        content = r.content || content;
      } else {
        this._broadcast({ type: "activity", text: "Waiting for reply…" });
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
      this._broadcast({ type: "stream", done: true });

      const files = extractFilesFromMarkdown(content);
      if (files.length > 0) {
        this._broadcast({
          type: "activity",
          text: `Writing ${files.length} file(s) to workspace…`,
        });
        await writeExtractedFiles(files);
        this._broadcast({
          type: "activity",
          text: `Created ${files.length} file(s): ${files.map(f => f.relativePath).join(", ")}`,
        });
      }

      const suggestions = this._generateSuggestions(content, files);
      if (suggestions.length > 0) {
        this._broadcast({ type: "suggestions", items: suggestions });
      }
    } catch (e) {
      if (ac.signal.aborted) {
        this._history.push({ role: "assistant", content: "_Stopped by user._" });
        this._turnMeta.push(this._pendingAssistantMeta ?? {});
        this._pendingAssistantMeta = undefined;
        this._postState();
        this._broadcast({ type: "activity", text: "Stopped." });
        return;
      }
      const rawMsg = e instanceof Error ? e.message : String(e);
      const userMsg = rawMsg.replace(/<[^>]*>/g, "").trim();
      const isServerError = /HTTP\s*5\d\d|temporarily unavailable|non-JSON/i.test(userMsg);
      const displayMsg = isServerError
        ? "The ASI API is temporarily unavailable. Please try again in a moment."
        : userMsg;
      vscode.window.showErrorMessage(displayMsg);
      this._history.push({ role: "assistant", content: `**Error:** ${displayMsg}` });
      this._turnMeta.push(this._pendingAssistantMeta ?? {});
      this._pendingAssistantMeta = undefined;
      this._postState();
      this._broadcast({ type: "error", value: displayMsg });
      this._broadcast({ type: "stream", done: true });
    } finally {
      if (this._inflightAbort === ac) {
        this._inflightAbort = undefined;
      }
      this._broadcast({ type: "loading", value: false });
      setTimeout(() => {
        this._broadcast({ type: "activity", text: "" });
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
    this._broadcast({
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
      <div class="setup-step" id="step-api">
        <span class="setup-num">1</span>
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
