const vscode = acquireVsCodeApi();
const log = document.getElementById('log');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const promptEnhanceBtn = document.getElementById('prompt-enhance-btn');
const stopBtn = document.getElementById('stop');
const loadingEl = document.getElementById('loading');
let loading = false;
let enhancingPrompt = false;
var webSearchEnabled = true;
var imageModeEnabled = false;
var toolsEnabled = true;
var attachedFiles = [];
var editTargetIndex = -1;
var detectedMentions = [];
var MAX_ATTACH_FILES = 8;
var MAX_ATTACH_BYTES = 200000;
var toolEvents = [];
var slashOpen = false;
var slashItems = [];
var slashIndex = 0;
var mentionOpen = false;
var mentionItems = [];
var mentionFlatItems = [];
var mentionIndex = 0;
var mentionQueryTimer = null;
var mentionLastQuery = "";
var assistantMode = 'code';
var currentHistory = [];
var currentTurnMeta = [];
var currentTabs = [];
var currentArtifactRaw = '';
var currentActiveChatId = '';
var pendingStatePayload = null;

function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}
input.addEventListener('input', autoResize);

function syncPromptEnhanceButton() {
  if (!promptEnhanceBtn) return;
  var hasText = !!(input && input.value && input.value.trim().length);
  var disabled = loading || enhancingPrompt || !hasText;
  promptEnhanceBtn.disabled = disabled;
  promptEnhanceBtn.classList.toggle('busy', enhancingPrompt);
  promptEnhanceBtn.setAttribute('aria-busy', enhancingPrompt ? 'true' : 'false');
  promptEnhanceBtn.title = enhancingPrompt ? 'Enhancing prompt…' : 'Enhance prompt';
}

function startComposerEdit(index, text) {
  editTargetIndex = index;
  input.value = String(text || '');
  autoResize();
  syncPromptEnhanceButton();
  input.focus();
  var end = input.value.length;
  input.setSelectionRange(end, end);
  setActivity('Editing message in composer… Press Send to save and regenerate.');
}

function clearComposerEdit() {
  editTargetIndex = -1;
  if (!loading) setActivity('');
}

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

function closeMentionMenu() {
  mentionOpen = false;
  mentionItems = [];
  mentionFlatItems = [];
  mentionIndex = 0;
  var el = document.getElementById('mention-menu');
  if (el) {
    el.classList.remove('visible');
    el.innerHTML = '';
  }
}

function renderMentionMenu() {
  var el = document.getElementById('mention-menu');
  if (!el) return;
  var hasRecent = mentionItems && Array.isArray(mentionItems.recent) && mentionItems.recent.length;
  var hasWorkspace = mentionItems && Array.isArray(mentionItems.workspace) && mentionItems.workspace.length;
  if (!mentionOpen || (!hasRecent && !hasWorkspace)) {
    el.classList.remove('visible');
    el.innerHTML = '';
    return;
  }
  mentionFlatItems = [];
  if (hasRecent) {
    mentionFlatItems = mentionFlatItems.concat(mentionItems.recent);
  }
  if (hasWorkspace) {
    mentionFlatItems = mentionFlatItems.concat(mentionItems.workspace);
  }
  if (!mentionFlatItems.length) {
    el.classList.remove('visible');
    el.innerHTML = '';
    return;
  }
  if (mentionIndex >= mentionFlatItems.length) {
    mentionIndex = mentionFlatItems.length - 1;
  }
  el.classList.add('visible');
  var html = '';
  var cursor = 0;
  if (hasRecent) {
    html += '<div class="mention-section-title">Recent</div>';
    html += mentionItems.recent.map(function (p) {
      var cls = cursor === mentionIndex ? 'mention-item active' : 'mention-item';
      cursor += 1;
      return '<button type="button" class="' + cls + '" data-path="' + escapeHtmlAttr(p) + '">@' + escapeHtml(p) + '</button>';
    }).join('');
  }
  if (hasWorkspace) {
    html += '<div class="mention-section-title">Workspace</div>';
    html += mentionItems.workspace.map(function (p) {
      var cls = cursor === mentionIndex ? 'mention-item active' : 'mention-item';
      cursor += 1;
      return '<button type="button" class="' + cls + '" data-path="' + escapeHtmlAttr(p) + '">@' + escapeHtml(p) + '</button>';
    }).join('');
  }
  el.innerHTML = html;
}

function getActiveMentionToken() {
  if (!input) return null;
  var text = input.value || '';
  var caret = typeof input.selectionStart === 'number' ? input.selectionStart : text.length;
  var left = text.slice(0, caret);
  var at = left.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0) {
    var prev = left.charAt(at - 1);
    if (!/\s|\n|\t|\(|\[|\{/.test(prev)) return null;
  }
  var typed = left.slice(at + 1);
  if (/\s/.test(typed)) return null;
  return { start: at, end: caret, query: typed };
}

function requestMentionCandidates() {
  var token = getActiveMentionToken();
  if (!token) {
    closeMentionMenu();
    return;
  }
  var q = token.query || '';
  if (q === mentionLastQuery && mentionOpen) return;
  mentionLastQuery = q;
  if (mentionQueryTimer) clearTimeout(mentionQueryTimer);
  mentionQueryTimer = setTimeout(function () {
    vscode.postMessage({ type: 'searchWorkspaceFiles', query: q });
  }, 80);
}

function applyMentionPath(path) {
  var token = getActiveMentionToken();
  if (!token || !path) return;
  var text = input.value || '';
  var before = text.slice(0, token.start);
  var after = text.slice(token.end);
  var insert = '@' + path + ' ';
  input.value = before + insert + after;
  var caret = (before + insert).length;
  input.focus();
  input.setSelectionRange(caret, caret);
  closeMentionMenu();
  updateDetectedMentionsFromInput();
  autoResize();
  syncPromptEnhanceButton();
}

var streamFlushTimer = null;
var pendingStreamText = null;
var lastRenderedStreamText = "";
var typedCurrentText = "";
var typedTargetText = "";
var typedTimer = null;
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

function flushStreamPreview() {
  streamFlushTimer = null;
  var text = pendingStreamText;
  pendingStreamText = null;
  if (text === null || text === undefined) return;
  if (text === lastRenderedStreamText && text === typedTargetText) return;
  typedTargetText = text;
  var slot = document.getElementById('stream-live');
  if (!slot) {
    slot = document.createElement('div');
    slot.id = 'stream-live';
    slot.className = 'msg assistant stream-live';
    var roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role-label';
    var roleIcon = document.createElement('span');
    roleIcon.className = 'msg-role-icon';
    roleIcon.textContent = 'FC';
    roleLabel.appendChild(roleIcon);
    var roleText = document.createElement('span');
    roleText.textContent = 'Fetch Coder';
    roleLabel.appendChild(roleText);
    slot.appendChild(roleLabel);
    var body = document.createElement('div');
    body.className = 'msg-body streaming-body';
    body.id = 'stream-live-body';
    slot.appendChild(body);
    log.appendChild(slot);
  }
  var b = document.getElementById('stream-live-body');
  if (b) {
    if (typedTimer) {
      clearTimeout(typedTimer);
      typedTimer = null;
    }
    var pump = function () {
      if (!b) return;
      if (typedCurrentText.length > typedTargetText.length || !typedTargetText.startsWith(typedCurrentText)) {
        typedCurrentText = "";
      }
      if (typedCurrentText.length < typedTargetText.length) {
        var step = Math.max(1, Math.ceil((typedTargetText.length - typedCurrentText.length) / 22));
        typedCurrentText = typedTargetText.slice(0, typedCurrentText.length + step);
      }
    while (b.firstChild) b.removeChild(b.firstChild);
      renderAssistantBody(b, typedCurrentText);
      scheduleSyntaxHighlight();
      lastRenderedStreamText = typedCurrentText;
      if (typedCurrentText.length < typedTargetText.length) {
        typedTimer = setTimeout(pump, 14);
      } else {
        typedTimer = null;
        if (pendingStatePayload) {
          var queued = pendingStatePayload;
          pendingStatePayload = null;
          applyStatePayload(queued);
        }
      }
    };
    pump();
  }
  log.scrollTop = log.scrollHeight;
  if (typedTargetText && typedTargetText.length) loadingEl.style.display = 'none';
}

function setStreamPreview(text) {
  pendingStreamText = text;
  if (streamFlushTimer) return;
  // Batch token bursts so streaming looks smooth, not word-by-word.
  streamFlushTimer = setTimeout(flushStreamPreview, 110);
}

function applyStatePayload(m) {
  removeStreamPreview();
  if (editTargetIndex >= 0) {
    var h = Array.isArray(m.history) ? m.history : [];
    if (editTargetIndex >= h.length || !h[editTargetIndex] || h[editTargetIndex].role !== 'user') {
      clearComposerEdit();
    }
  }
  if (m.activeChatId && m.activeChatId !== currentActiveChatId) {
    currentArtifactRaw = '';
    currentActiveChatId = m.activeChatId;
  }
  render(m.history, m.turnMeta);
  renderTabs(m.tabs, m.activeChatId);
  applyArtifactUiState(m.artifactUi, m.history);
  updateCreateBar(m.extractedFiles);
  if (typeof m.webSearchEnabled === 'boolean') {
    webSearchEnabled = m.webSearchEnabled;
    syncWebSearchButton();
  }
  if (typeof m.assistantMode === 'string') {
    assistantMode = m.assistantMode;
    syncAssistantModeUI();
  }
  var sidEl = document.getElementById('chat-session-id');
  if (sidEl && m.chatIdShort) {
    sidEl.textContent = m.chatIdShort;
    sidEl.title = 'Session ' + (m.chatId || m.chatIdShort) + ' — history kept until Clear';
  }
}

function removeStreamPreview() {
  if (streamFlushTimer) {
    clearTimeout(streamFlushTimer);
    streamFlushTimer = null;
  }
  pendingStreamText = null;
  lastRenderedStreamText = "";
  typedCurrentText = "";
  typedTargetText = "";
  if (typedTimer) {
    clearTimeout(typedTimer);
    typedTimer = null;
  }
  pendingStatePayload = null;
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

function setTurnCount(n) {
  var mc = document.getElementById('msg-count');
  if (mc) mc.textContent = String(n);
}

function render(history, turnMeta) {
  log.innerHTML = '';
  var list = history || [];
  currentHistory = list;
  currentTurnMeta = Array.isArray(turnMeta) ? turnMeta : [];
  setTurnCount(list.length);
  if (list.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty-hint';
    empty.innerHTML =
      '<div class="empty-logo" aria-hidden="true">FC</div>' +
      '<div class="empty-title">Fetch Coder</div>' +
      '<div class="empty-sub">AI coding assistant powered by ASI1. Generate code, fix bugs, create files, and run commands — all from your editor.</div>' +
      '<div class="empty-quick-actions">' +
        '<button class="empty-action-btn" data-prompt="Create a new project">Create a project</button>' +
        '<button class="empty-action-btn" data-prompt="Explain my selected code">Explain code</button>' +
        '<button class="empty-action-btn" data-prompt="Fix the errors in my code">Fix errors</button>' +
        '<button class="empty-action-btn" data-prompt="Write unit tests for this file">Write tests</button>' +
      '</div>';
    log.appendChild(empty);
    empty.querySelectorAll('.empty-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var prompt = btn.getAttribute('data-prompt');
        if (prompt && input) {
          input.value = prompt;
          autoResize();
          send();
        }
      });
    });
    return;
  }
  list.forEach(function (m, idx) {
    var meta = currentTurnMeta[idx] || {};
    var div = document.createElement('div');
    div.className = 'msg ' + (m.role === 'user' ? 'user' : 'assistant');
    var roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role-label';
    var roleIcon = document.createElement('span');
    roleIcon.className = 'msg-role-icon';
    roleIcon.textContent = m.role === 'user' ? 'U' : 'FC';
    roleLabel.appendChild(roleIcon);
    var roleText = document.createElement('span');
    roleText.textContent = m.role === 'user' ? 'You' : 'Fetch Coder';
    roleLabel.appendChild(roleText);
    div.appendChild(roleLabel);
    var body = document.createElement('div');
    body.className = 'msg-body';
    if (m.role === 'user') {
      var plain = document.createElement('div');
      plain.className = 'md-plain';
      plain.textContent = m.content;
      body.appendChild(plain);
      if (meta.edited) {
        var edited = document.createElement('div');
        edited.className = 'msg-meta';
        edited.textContent = 'edited';
        body.appendChild(edited);
      }
    } else {
      var parsed = splitReasoning(m.content);
      if (parsed.reasoning) {
        var reasoningEl = document.createElement('details');
        reasoningEl.className = 'reasoning-panel';
        var reasoningSummary = document.createElement('summary');
        reasoningSummary.textContent = 'Reasoning';
        reasoningEl.appendChild(reasoningSummary);
        var reasoningPre = document.createElement('pre');
        reasoningPre.textContent = parsed.reasoning;
        reasoningEl.appendChild(reasoningPre);
        body.appendChild(reasoningEl);
      }
      renderAssistantBody(body, parsed.content || m.content);
    }
    var actions = document.createElement('div');
    actions.className = 'msg-actions';
    if (m.role === 'user') {
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'msg-action-btn';
      editBtn.textContent = '✏️';
      editBtn.title = 'Edit';
      editBtn.addEventListener('click', function () {
        startComposerEdit(idx, m.content || '');
      });
      actions.appendChild(editBtn);
      if (Array.isArray(meta.editHistory) && meta.editHistory.length) {
        var editsBtn = document.createElement('button');
        editsBtn.type = 'button';
        editsBtn.className = 'msg-action-btn';
        editsBtn.textContent = 'Edits ' + meta.editHistory.length;
        editsBtn.title = meta.editHistory.join('\n\n---\n\n');
        actions.appendChild(editsBtn);
      }
    } else {
      var regenBtn = document.createElement('button');
      regenBtn.type = 'button';
      regenBtn.className = 'msg-action-btn';
      var retryCount = typeof meta.retryCount === 'number' ? meta.retryCount : 0;
      regenBtn.textContent = '⟳' + (retryCount > 0 ? (' ' + retryCount) : '');
      regenBtn.title = retryCount > 0 ? ('Regenerate (' + retryCount + ')') : 'Regenerate';
      regenBtn.addEventListener('click', function () {
        vscode.postMessage({ type: 'regenerateTurn', index: idx });
      });
      actions.appendChild(regenBtn);
      if (Array.isArray(meta.retryHistory) && meta.retryHistory.length) {
        var retryInfo = document.createElement('button');
        retryInfo.type = 'button';
        retryInfo.className = 'msg-action-btn';
        retryInfo.textContent = 'History';
        retryInfo.title = meta.retryHistory.join('\n');
        actions.appendChild(retryInfo);
      }
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'msg-action-btn';
      copyBtn.textContent = '⧉';
      copyBtn.title = 'Copy';
      copyBtn.addEventListener('click', function () {
        var txt = m.content || '';
        if (!txt) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).catch(function () {
            vscode.postMessage({ type: 'copyToClipboard', text: txt });
          });
        } else {
          vscode.postMessage({ type: 'copyToClipboard', text: txt });
        }
      });
      actions.appendChild(copyBtn);
      var artifactBtn = document.createElement('button');
      artifactBtn.type = 'button';
      artifactBtn.className = 'msg-action-btn';
      artifactBtn.textContent = '◫';
      artifactBtn.title = 'Artifact';
      artifactBtn.addEventListener('click', function () {
        openArtifactPanel(m.content || '');
      });
      actions.appendChild(artifactBtn);
    }
    body.appendChild(actions);
    div.appendChild(body);
    log.appendChild(div);
  });
  log.scrollTop = log.scrollHeight;
  scheduleSyntaxHighlight();
}

function extractFirstCodeBlock(md) {
  var m = String(md || '').match(/```([^\n]*)\n([\s\S]*?)```/);
  if (!m) return { lang: 'text', content: '' };
  return { lang: (m[1] || 'text').trim() || 'text', content: m[2] || '' };
}

function extractFirstMarkdownTable(md) {
  var text = String(md || '');
  var lines = text.split(/\r?\n/);
  for (var i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('|') && /^[\s|:\-]+$/.test(lines[i + 1].replace(/\|/g, ''))) {
      var out = [lines[i], lines[i + 1]];
      var j = i + 2;
      while (j < lines.length && lines[j].trim() && lines[j].includes('|')) {
        out.push(lines[j]);
        j++;
      }
      return out.join('\n');
    }
  }
  return '';
}

function markdownTableToHtml(tableMd) {
  if (!tableMd) return '<div class="artifact-empty">No sheet table detected.</div>';
  var lines = tableMd.split(/\r?\n/).filter(function (l) { return l.trim(); });
  if (lines.length < 2) return '<div class="artifact-empty">No sheet table detected.</div>';
  var head = lines[0].replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (x) { return x.trim(); });
  var body = lines.slice(2).map(function (row) {
    return row.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (x) { return x.trim(); });
  });
  var h = '<table class="artifact-table"><thead><tr>' + head.map(function (c) { return '<th>' + escapeHtml(c); }).join('') + '</tr></thead><tbody>';
  body.forEach(function (row) {
    h += '<tr>' + row.map(function (c) { return '<td>' + escapeHtml(c); }).join('') + '</tr>';
  });
  h += '</tbody></table>';
  return h;
}

function openArtifactPanel(raw) {
  currentArtifactRaw = String(raw || '');
  var panel = document.getElementById('artifact-panel');
  if (!panel) return;
  var body = document.getElementById('artifact-body');
  if (!body) return;
  var mode = panel.getAttribute('data-mode') || 'text';
  var code = extractFirstCodeBlock(currentArtifactRaw);
  var table = extractFirstMarkdownTable(currentArtifactRaw);
  function renderMode(nextMode) {
    panel.setAttribute('data-mode', nextMode);
    panel.querySelectorAll('.artifact-tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === nextMode);
    });
    if (nextMode === 'code') {
      var lang = code.lang || 'text';
      var block = '<pre class="artifact-code"><code class="language-' + escapeHtml(lang) + '">' + escapeHtml(code.content || '') + '</code></pre>';
      body.innerHTML = code.content ? block : '<div class="artifact-empty">No code block detected.</div>';
    } else if (nextMode === 'sheet') {
      body.innerHTML = markdownTableToHtml(table);
    } else {
      body.innerHTML = '<pre class="artifact-text">' + escapeHtml(currentArtifactRaw || '') + '</pre>';
    }
    if (typeof ASI_MD !== 'undefined' && ASI_MD.applySyntaxHighlight) {
      ASI_MD.applySyntaxHighlight(body);
    }
  }
  renderMode(mode);
  panel.classList.add('visible');
  syncArtifactLayoutClass();
  postArtifactUiState();
}

function refreshArtifactPanel() {
  var panel = document.getElementById('artifact-panel');
  if (!panel || !panel.classList.contains('visible')) return;
  openArtifactPanel(currentArtifactRaw);
}

function getLastAssistantText(history) {
  var list = Array.isArray(history) ? history : [];
  for (var i = list.length - 1; i >= 0; i--) {
    if (list[i] && list[i].role === 'assistant') {
      return String(list[i].content || '');
    }
  }
  return '';
}

function clampArtifactWidth(widthPx) {
  var minW = 320;
  var maxW = Math.max(420, window.innerWidth - 260);
  return Math.min(Math.max(widthPx, minW), maxW);
}

function setArtifactWidth(widthPx) {
  var main = document.getElementById('main');
  if (!main) return;
  main.style.setProperty('--artifact-width-px', String(clampArtifactWidth(widthPx)));
}

function syncArtifactLayoutClass() {
  var panel = document.getElementById('artifact-panel');
  var main = document.getElementById('main');
  if (!main) return;
  var open = !!(panel && panel.classList.contains('visible'));
  main.classList.toggle('artifact-open', open);
}

function updateArtifactSnapActive() {
  var main = document.getElementById('main');
  if (!main) return;
  var width = parseFloat(getComputedStyle(main).getPropertyValue('--artifact-width-px') || '460');
  var ratio = (width / Math.max(window.innerWidth, 1)) * 100;
  var btns = document.querySelectorAll('.artifact-snap-btn');
  btns.forEach(function (btn) {
    var snap = Number(btn.getAttribute('data-snap') || '0');
    var active = Math.abs(ratio - snap) <= 2.5;
    btn.classList.toggle('active', active);
  });
}

function applyArtifactUiState(state, history) {
  var panel = document.getElementById('artifact-panel');
  var main = document.getElementById('main');
  if (!panel || !main) return;
  if (!state || typeof state !== 'object') {
    panel.classList.remove('visible');
    syncArtifactLayoutClass();
    return;
  }
  var mode = state.mode === 'code' || state.mode === 'sheet' ? state.mode : 'text';
  var width = typeof state.width === 'number' && isFinite(state.width) ? state.width : 460;
  setArtifactWidth(width);
  panel.setAttribute('data-mode', mode);
  if (state.open === true) {
    if (!currentArtifactRaw) {
      currentArtifactRaw = getLastAssistantText(history);
    }
    openArtifactPanel(currentArtifactRaw);
  } else {
    panel.classList.remove('visible');
    syncArtifactLayoutClass();
  }
  updateArtifactSnapActive();
}

function postArtifactUiState() {
  var panel = document.getElementById('artifact-panel');
  var main = document.getElementById('main');
  if (!panel || !main) return;
  var width = parseFloat(getComputedStyle(main).getPropertyValue('--artifact-width-px') || '460');
  var mode = panel.getAttribute('data-mode') || 'text';
  var open = panel.classList.contains('visible');
  vscode.postMessage({
    type: 'setArtifactUi',
    value: {
      open: open,
      mode: mode,
      width: isFinite(width) ? width : 460,
    }
  });
  updateArtifactSnapActive();
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

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderToolTrace() {
  var trace = document.getElementById('tool-trace');
  if (!trace) return;
  if (!toolEvents.length) {
    trace.classList.remove('visible');
    trace.innerHTML = '';
    return;
  }
  trace.classList.add('visible');
  var recent = toolEvents.slice(-8);
  var html = recent.map(function (e) {
    var cls = e.phase === 'result' ? 'tool-pill done' : 'tool-pill';
    var text = e.phase === 'result'
      ? ('Round ' + e.round + ' · ' + e.name + ' done')
      : ('Round ' + e.round + ' · ' + e.name + ' running');
    var preview = e.phase === 'result' ? e.resultPreview : e.argsPreview;
    var previewHtml = preview
      ? '<div class="tool-preview"><pre>' + escapeHtml(preview.slice(0, 320)) + '</pre></div>'
      : '';
    return '<details class="' + cls + '"><summary>' + escapeHtml(text) + '</summary>' + previewHtml + '</details>';
  }).join('');
  trace.innerHTML = html;
}

function renderTabs(tabs, activeChatId) {
  var listEl = document.getElementById('tabs-list');
  if (!listEl) return;
  currentTabs = Array.isArray(tabs) ? tabs : [];
  listEl.innerHTML = currentTabs.map(function (t) {
    var active = t.chatId === activeChatId ? 'tab-chip active' : 'tab-chip';
    var title = (t.title || 'New chat').replace(/\s+/g, ' ').trim();
    return '<button type="button" data-chat-id="' + escapeHtml(t.chatId) + '" class="' + active + '" title="' + escapeHtml(title) + '"><span class="tab-title">' + escapeHtml(title) + '</span><span class="tab-close" data-close="1" title="Close">×</span></button>';
  }).join('');
}

function splitReasoning(raw) {
  var text = String(raw || '');
  var m = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (m && m[1]) {
    return {
      reasoning: m[1].trim(),
      content: text.replace(m[0], '').trim()
    };
  }
  return { reasoning: '', content: text };
}

window.addEventListener('message', function (e) {
  var m = e.data;
  if (m.type === 'activity') {
    setActivity(m.text || '');
  }
  if (m.type === 'stream') {
    if (m.reset) removeStreamPreview();
    if (typeof m.text === 'string' && m.text.length) setStreamPreview(m.text);
  }
  if (m.type === 'tools') {
    if (m.reset) {
      toolEvents = [];
      renderToolTrace();
    }
    if (m.event) {
      toolEvents.push(m.event);
      renderToolTrace();
    }
  }
  if (m.type === 'setup') {
    applySetup(m);
  }
  if (m.type === 'modelState') {
    applyModelState(m);
  }
  if (m.type === 'mentionCandidates') {
    var recent = [];
    var workspace = [];
    if (m.sections && typeof m.sections === 'object') {
      recent = Array.isArray(m.sections.recent)
        ? m.sections.recent.filter(function (x) { return typeof x === 'string'; }).slice(0, 10)
        : [];
      workspace = Array.isArray(m.sections.workspace)
        ? m.sections.workspace.filter(function (x) { return typeof x === 'string'; }).slice(0, 40)
        : [];
    } else if (Array.isArray(m.items)) {
      workspace = m.items.filter(function (x) { return typeof x === 'string'; }).slice(0, 40);
    }
    mentionItems = { recent: recent, workspace: workspace };
    mentionIndex = 0;
    mentionOpen = (recent.length > 0 || workspace.length > 0) && !!getActiveMentionToken();
    renderMentionMenu();
  }
  if (m.type === 'state') {
    if (
      (typedTimer && typedTargetText.length > typedCurrentText.length) ||
      pendingStreamText !== null ||
      typedTargetText.length > typedCurrentText.length
    ) {
      pendingStatePayload = m;
    } else {
      applyStatePayload(m);
    }
  }
  if (m.type === 'loading') {
    loading = !!m.value;
    sendBtn.disabled = loading;
    if (stopBtn) {
      stopBtn.classList.toggle('hidden', !loading);
      stopBtn.disabled = !loading;
    }
    loadingEl.style.display = loading ? 'flex' : 'none';
    if (loading) log.scrollTop = log.scrollHeight;
    syncPromptEnhanceButton();
  }
  if (m.type === 'enhanceLoading') {
    enhancingPrompt = !!m.value;
    syncPromptEnhanceButton();
  }
  if (m.type === 'promptEnhanced' && typeof m.value === 'string') {
    if (input) {
      input.value = m.value;
      autoResize();
      updateDetectedMentionsFromInput();
      input.focus();
      var end = input.value.length;
      input.setSelectionRange(end, end);
    }
    syncPromptEnhanceButton();
  }
  if (m.type === 'suggestions' && Array.isArray(m.items) && m.items.length) {
    removeSuggestions();
    var box = document.createElement('div');
    box.id = 'suggestion-chips';
    box.className = 'suggestion-chips';
    m.items.forEach(function (text) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'suggestion-chip';
      chip.textContent = text;
      chip.addEventListener('click', function () {
        removeSuggestions();
        vscode.postMessage({ type: 'clickSuggestion', text: text });
      });
      box.appendChild(chip);
    });
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }
  if (m.type === 'error') {
    var div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = 'Error: ' + m.value;
    log.appendChild(div);
  }
});

function removeSuggestions() {
  var old = document.getElementById('suggestion-chips');
  if (old) old.remove();
}

function send() {
  var t = input.value.trim();
  if (!t || loading) return;
  removeSuggestions();
  if (editTargetIndex >= 0) {
    var editIdx = editTargetIndex;
    clearComposerEdit();
    input.value = '';
    closeSlashMenu();
    closeMentionMenu();
    detectedMentions = [];
    renderMentionList();
    autoResize();
    syncPromptEnhanceButton();
    vscode.postMessage({ type: 'editUserTurn', index: editIdx, text: t });
    attachedFiles = [];
    renderAttachList();
    return;
  }
  var modeEl = document.getElementById('send-mode');
  var mode = modeEl && modeEl.value === 'image' ? 'image' : 'chat';
  var sizeEl = document.getElementById('image-size');
  var imageSize = mode === 'image' && sizeEl && sizeEl.value ? sizeEl.value : undefined;
  input.value = '';
  closeSlashMenu();
  closeMentionMenu();
  detectedMentions = [];
  renderMentionList();
  autoResize();
  syncPromptEnhanceButton();
  vscode.postMessage({
    type: 'send',
    text: t,
    assistantMode: assistantMode,
    mode: mode,
    imageSize: imageSize,
    webSearch: webSearchEnabled,
    attachments: attachedFiles
  });
  attachedFiles = [];
  renderAttachList();
}

function syncToolsButton() {
  var toolsBtnEl = document.getElementById('tools-btn');
  if (!toolsBtnEl) return;
  toolsBtnEl.setAttribute('aria-pressed', toolsEnabled ? 'true' : 'false');
  toolsBtnEl.classList.toggle('active', toolsEnabled);
  toolsBtnEl.title = toolsEnabled ? 'Tool calling: ON' : 'Tool calling: OFF';
}

function applyModelState(m) {
  var modelSel = document.getElementById('model-select');
  var capabilityMap = m && typeof m === 'object' ? m.capabilities : undefined;
  function renderModelBadges(modelId) {
    var el = document.getElementById('model-badges');
    if (!el) return;
    var caps = capabilityMap && capabilityMap[modelId] ? capabilityMap[modelId] : null;
    var items = [];
    if (caps && caps.tools) items.push('tools');
    if (caps && caps.reasoning) items.push('reasoning');
    if (caps && caps.vision) items.push('vision');
    if (!items.length) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = items.map(function (k) {
      return '<span class="model-badge">' + escapeHtml(k) + '</span>';
    }).join('');
  }
  if (modelSel && Array.isArray(m.models) && m.models.length) {
    var current = m.selectedModel || 'asi1';
    modelSel.innerHTML = '';
    m.models.forEach(function (id) {
      var opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      modelSel.appendChild(opt);
    });
    modelSel.value = current;
    renderModelBadges(current);
  }
  if (typeof m.enableTools === 'boolean') {
    toolsEnabled = m.enableTools;
    syncToolsButton();
  }
}

sendBtn.addEventListener('click', send);
if (promptEnhanceBtn) {
  promptEnhanceBtn.addEventListener('click', function () {
    if (loading || enhancingPrompt) return;
    var raw = input && typeof input.value === 'string' ? input.value.trim() : '';
    if (!raw) return;
    vscode.postMessage({ type: 'enhancePrompt', text: raw });
  });
}
if (stopBtn) {
  stopBtn.addEventListener('click', function () {
    if (!loading) return;
    vscode.postMessage({ type: 'stop' });
  });
}
input.addEventListener('keydown', function (ev) {
  if (mentionOpen) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      mentionIndex = Math.min(mentionIndex + 1, mentionFlatItems.length - 1);
      renderMentionMenu();
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      mentionIndex = Math.max(mentionIndex - 1, 0);
      renderMentionMenu();
      return;
    }
    if (ev.key === 'Tab' || ev.key === 'Enter') {
      ev.preventDefault();
      applyMentionPath(mentionFlatItems[mentionIndex]);
      return;
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      closeMentionMenu();
      return;
    }
  }
  if (slashOpen) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      slashIndex = Math.min(slashIndex + 1, slashItems.length - 1);
      renderSlashMenu();
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      slashIndex = Math.max(slashIndex - 1, 0);
      renderSlashMenu();
      return;
    }
    if (ev.key === 'Tab' || ev.key === 'Enter') {
      ev.preventDefault();
      executeSlash(slashItems[slashIndex]);
      return;
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      closeSlashMenu();
      return;
    }
  }
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault();
    if (slashOpen) return;
    send();
  }
});
document.getElementById('clear').addEventListener('click', function () {
  vscode.postMessage({ type: 'clear' });
  clearComposerEdit();
  toolEvents = [];
  renderToolTrace();
});
var revertBtnEl = document.getElementById('revert');
if (revertBtnEl) {
  revertBtnEl.addEventListener('click', function () {
    clearComposerEdit();
    vscode.postMessage({ type: 'revertChat' });
  });
}
document.getElementById('create-files-btn').addEventListener('click', function () {
  vscode.postMessage({ type: 'createFiles' });
});
var tabsListEl = document.getElementById('tabs-list');
if (tabsListEl) {
  tabsListEl.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    var btn = target.closest('.tab-chip');
    if (!btn) return;
    var id = btn.getAttribute('data-chat-id');
    if (!id) return;
    if (target.closest('.tab-close')) {
      ev.preventDefault();
      ev.stopPropagation();
      vscode.postMessage({ type: 'closeTab', chatId: id });
      return;
    }
    vscode.postMessage({ type: 'switchTab', chatId: id });
  });
  tabsListEl.addEventListener('dblclick', function (ev) {
    var target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    var btn = target.closest('.tab-chip');
    if (!btn) return;
    var id = btn.getAttribute('data-chat-id');
    if (!id) return;
    var titleEl = btn.querySelector('.tab-title');
    var prev = titleEl ? titleEl.textContent || '' : '';
    var next = window.prompt('Rename tab', prev);
    if (typeof next !== 'string') return;
    if (!next.trim()) return;
    vscode.postMessage({ type: 'renameTab', chatId: id, title: next.trim() });
  });
}
var newTabBtnEl = document.getElementById('new-tab-btn');
if (newTabBtnEl) {
  newTabBtnEl.addEventListener('click', function () {
    vscode.postMessage({ type: 'newTab' });
  });
}
var artifactCloseBtn = document.getElementById('artifact-close');
if (artifactCloseBtn) {
  artifactCloseBtn.addEventListener('click', function () {
    var panel = document.getElementById('artifact-panel');
    if (panel) panel.classList.remove('visible');
    syncArtifactLayoutClass();
    postArtifactUiState();
  });
}
var artifactTabBtns = document.querySelectorAll('.artifact-tab-btn');
artifactTabBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var panel = document.getElementById('artifact-panel');
    var mode = btn.getAttribute('data-mode') || 'text';
    if (panel) panel.setAttribute('data-mode', mode);
    refreshArtifactPanel();
    postArtifactUiState();
  });
});
var artifactResizerEl = document.getElementById('artifact-resizer');
if (artifactResizerEl) {
  var dragState = null;
  artifactResizerEl.addEventListener('mousedown', function (ev) {
    ev.preventDefault();
    var main = document.getElementById('main');
    if (!main) return;
    var startX = ev.clientX;
    var startWidth = parseFloat(getComputedStyle(main).getPropertyValue('--artifact-width-px') || '460');
    dragState = { startX: startX, startWidth: startWidth };
    document.body.classList.add('artifact-resizing');
  });
  window.addEventListener('mousemove', function (ev) {
    if (!dragState) return;
    var dx = dragState.startX - ev.clientX;
    setArtifactWidth(dragState.startWidth + dx);
    updateArtifactSnapActive();
  });
  window.addEventListener('mouseup', function () {
    if (!dragState) return;
    dragState = null;
    document.body.classList.remove('artifact-resizing');
    postArtifactUiState();
  });
}
var artifactSnapBtns = document.querySelectorAll('.artifact-snap-btn');
artifactSnapBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var snap = Number(btn.getAttribute('data-snap') || '0');
    if (!snap) return;
    var px = (window.innerWidth * snap) / 100;
    setArtifactWidth(px);
    postArtifactUiState();
  });
});
log.addEventListener('click', function (ev) {
  var target = ev.target;
  if (target instanceof HTMLElement && target.classList.contains('code-wrap-btn')) {
    var wrapForWrap = target.closest('.code-wrap');
    if (!wrapForWrap) return;
    var enabled = wrapForWrap.classList.toggle('wrap-on');
    target.textContent = enabled ? 'Wrap: On' : 'Wrap: Off';
    return;
  }
  if (target instanceof HTMLElement && target.classList.contains('code-collapse-btn')) {
    var wrapForToggle = target.closest('.code-wrap');
    if (!wrapForToggle) return;
    var collapsed = wrapForToggle.classList.toggle('collapsed');
    target.textContent = collapsed ? 'Expand' : 'Collapse';
    return;
  }
  if (!(target instanceof HTMLElement) || !target.classList.contains('code-copy-btn')) {
    return;
  }
  var wrap = target.closest('.code-wrap');
  var raw = wrap ? wrap.getAttribute('data-raw') : '';
  var codeEl = wrap ? wrap.querySelector('.code-block code') : null;
  var codeText = raw || (codeEl ? codeEl.textContent || '' : '');
  if (!codeText) return;
  var onDone = function () {
    target.textContent = 'Copied';
    target.disabled = true;
    setTimeout(function () {
      target.textContent = 'Copy';
      target.disabled = false;
    }, 1000);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codeText).then(onDone).catch(function () {
      vscode.postMessage({ type: 'copyToClipboard', text: codeText });
      onDone();
    });
    return;
  }
  vscode.postMessage({ type: 'copyToClipboard', text: codeText });
  onDone();
});

var btnApi = document.getElementById('btn-api-key');
var stepApi = document.getElementById('step-api');
var setupRow = document.getElementById('setup-row');

function applySetup(m) {
  if (!m || typeof m.dev !== 'boolean') return;
  var hasApiKey = !!m.hasApiKey;
  if (stepApi && hasApiKey) {
    stepApi.classList.add('setup-done');
  } else if (stepApi) {
    stepApi.classList.remove('setup-done');
  }
  if (btnApi) {
    if (hasApiKey) {
    btnApi.textContent = 'Change API key';
  } else {
    btnApi.textContent = 'Add API key';
  }
  }
  if (setupRow) {
  // If API key is already set, hide onboarding completely.
  var hideRow = hasApiKey;
  setupRow.classList.toggle('setup-hidden', hideRow);
  }
}

if (btnApi) {
btnApi.addEventListener('click', function () {
  vscode.postMessage({ type: 'openApiKey' });
});
}

vscode.postMessage({ type: 'setupReady' });

var sendModeEl = document.getElementById('send-mode');
var webSearchBtnEl = document.getElementById('web-search-btn');
var imageModeBtnEl = document.getElementById('image-mode-btn');
var toolsBtnEl = document.getElementById('tools-btn');
var modelSelEl = document.getElementById('model-select');
var uploadBtnEl = document.getElementById('upload-btn');
var attachInputEl = document.getElementById('attach-input');
var attachListEl = document.getElementById('attach-list');
var mentionMenuEl = document.getElementById('mention-menu');
var mentionListEl = document.getElementById('mention-list');
var rowEl = document.getElementById('row');
var composerEl = document.getElementById('composer');
var slashMenuEl = document.getElementById('slash-menu');
var assistantModeBtnEl = document.getElementById('assistant-mode-btn');
var assistantModeMenuEl = document.getElementById('assistant-mode-menu');
var assistantModeLabelEl = document.getElementById('assistant-mode-label');
var assistantModeIconEl = document.getElementById('assistant-mode-icon');
function syncImageSizeVisibility() {
  // kept for compatibility; no inline size picker in compact UI
}
function modeIcon(mode) {
  if (mode === 'plan') return '✓';
  if (mode === 'debug') return '⨯';
  if (mode === 'ask') return '?';
  return '</>';
}
function modeLabel(mode) {
  if (mode === 'plan') return 'Plan';
  if (mode === 'debug') return 'Debug';
  if (mode === 'ask') return 'Ask';
  return 'Code';
}
function syncAssistantModeUI() {
  if (assistantModeLabelEl) assistantModeLabelEl.textContent = modeLabel(assistantMode);
  if (assistantModeIconEl) assistantModeIconEl.textContent = modeIcon(assistantMode);
  if (!assistantModeMenuEl) return;
  assistantModeMenuEl.querySelectorAll('.mode-item').forEach(function (btn) {
    var active = btn.getAttribute('data-mode') === assistantMode;
    btn.classList.toggle('active', active);
  });
}
function closeAssistantModeMenu() {
  if (!assistantModeMenuEl || !assistantModeBtnEl) return;
  assistantModeMenuEl.classList.remove('visible');
  assistantModeBtnEl.setAttribute('aria-expanded', 'false');
}
function syncWebSearchButton() {
  if (!webSearchBtnEl) return;
  webSearchBtnEl.setAttribute('aria-pressed', webSearchEnabled ? 'true' : 'false');
  webSearchBtnEl.classList.toggle('active', webSearchEnabled);
  webSearchBtnEl.title = webSearchEnabled ? 'Web search: ON' : 'Web search: OFF';
}
function syncImageModeButton() {
  if (sendModeEl) {
    sendModeEl.value = imageModeEnabled ? 'image' : 'chat';
  }
  if (!imageModeBtnEl) return;
  imageModeBtnEl.setAttribute('aria-pressed', imageModeEnabled ? 'true' : 'false');
  imageModeBtnEl.classList.toggle('active', imageModeEnabled);
  imageModeBtnEl.title = imageModeEnabled
    ? 'Image mode: ON (prompts go to image API)'
    : 'Image mode: OFF (chat)';
  if (input) {
    input.placeholder = imageModeEnabled
      ? 'Describe the image to generate…'
      : 'Plan, @ for context, / for commands';
  }
}
function renderAttachList() {
  if (!attachListEl) return;
  var list = attachedFiles.map(function (f) { return f.name; });
  if (!list.length) {
    attachListEl.textContent = '';
    return;
  }
  attachListEl.textContent = list.join(' · ');
}
function updateDetectedMentionsFromInput() {
  var text = input && typeof input.value === 'string' ? input.value : '';
  var re = /(^|\s)@([./\w-]+(?:\/[./\w-]+)+)/g;
  var set = {};
  var found = [];
  var m;
  while ((m = re.exec(text)) !== null) {
    var p = (m[2] || '').trim();
    if (!p || set[p]) continue;
    set[p] = true;
    found.push(p);
    if (found.length >= 8) break;
  }
  detectedMentions = found;
  renderMentionList();
}
function renderMentionList() {
  if (!mentionListEl) return;
  mentionListEl.innerHTML = '';
  if (!detectedMentions.length) return;
  detectedMentions.forEach(function (p) {
    var chip = document.createElement('span');
    chip.className = 'mention-chip';
    chip.textContent = '@' + p;
    mentionListEl.appendChild(chip);
  });
}
function readFileAsText(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(String(reader.result || '')); };
    reader.onerror = function () { reject(new Error('Failed to read file')); };
    reader.readAsText(file);
  });
}
async function handleFiles(fileList) {
  var files = Array.prototype.slice.call(fileList || []);
  if (!files.length) return;
  for (var i = 0; i < files.length; i++) {
    if (attachedFiles.length >= MAX_ATTACH_FILES) break;
    var file = files[i];
    if (!file || !file.name) continue;
    try {
      var text = await readFileAsText(file);
      if (text.length > MAX_ATTACH_BYTES) {
        text = text.slice(0, MAX_ATTACH_BYTES) + '\n… [truncated]';
      }
      attachedFiles.push({ name: file.name, content: text });
    } catch (_e) {
      // ignore unreadable file
    }
  }
  renderAttachList();
}
if (sendModeEl) {
  sendModeEl.addEventListener('change', syncImageSizeVisibility);
  syncImageSizeVisibility();
}
if (webSearchBtnEl) {
  webSearchBtnEl.addEventListener('click', function () {
    webSearchEnabled = !webSearchEnabled;
    syncWebSearchButton();
    vscode.postMessage({ type: 'setWebSearch', value: webSearchEnabled });
  });
  syncWebSearchButton();
}
if (imageModeBtnEl) {
  imageModeBtnEl.addEventListener('click', function () {
    imageModeEnabled = !imageModeEnabled;
    syncImageModeButton();
  });
  syncImageModeButton();
}
if (toolsBtnEl) {
  toolsBtnEl.addEventListener('click', function () {
    toolsEnabled = !toolsEnabled;
    syncToolsButton();
    vscode.postMessage({ type: 'setToolsEnabled', value: toolsEnabled });
  });
  syncToolsButton();
}
if (modelSelEl) {
  modelSelEl.addEventListener('change', function () {
    if (!modelSelEl.value) return;
    var badgesEl = document.getElementById('model-badges');
    if (badgesEl) {
      badgesEl.innerHTML = '';
    }
    vscode.postMessage({ type: 'setModel', value: modelSelEl.value });
  });
}
if (assistantModeBtnEl && assistantModeMenuEl) {
  assistantModeBtnEl.addEventListener('click', function () {
    var open = assistantModeMenuEl.classList.toggle('visible');
    assistantModeBtnEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  assistantModeMenuEl.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    var btn = target.closest('.mode-item');
    if (!btn) return;
    var next = btn.getAttribute('data-mode');
    if (next !== 'plan' && next !== 'code' && next !== 'debug' && next !== 'ask') return;
    assistantMode = next;
    syncAssistantModeUI();
    closeAssistantModeMenu();
    vscode.postMessage({ type: 'setAssistantMode', value: assistantMode });
  });
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.closest('#assistant-mode-btn') || t.closest('#assistant-mode-menu')) return;
    closeAssistantModeMenu();
  });
  syncAssistantModeUI();
}
var slashCommands = [
  { name: 'plan', help: 'Switch to plan mode', run: function () {
    assistantMode = 'plan';
    syncAssistantModeUI();
    vscode.postMessage({ type: 'setAssistantMode', value: assistantMode });
  } },
  { name: 'code', help: 'Switch to code mode', run: function () {
    assistantMode = 'code';
    syncAssistantModeUI();
    vscode.postMessage({ type: 'setAssistantMode', value: assistantMode });
  } },
  { name: 'debug', help: 'Switch to debug mode', run: function () {
    assistantMode = 'debug';
    syncAssistantModeUI();
    vscode.postMessage({ type: 'setAssistantMode', value: assistantMode });
  } },
  { name: 'ask', help: 'Switch to ask mode', run: function () {
    assistantMode = 'ask';
    syncAssistantModeUI();
    vscode.postMessage({ type: 'setAssistantMode', value: assistantMode });
  } },
  { name: 'revert', help: 'Revert last exchange', run: function () { vscode.postMessage({ type: 'revertChat' }); } },
  { name: 'enhance', help: 'Enhance current prompt', run: function () {
    if (promptEnhanceBtn) promptEnhanceBtn.click();
  } },
  { name: 'clear', help: 'Clear chat', run: function () { vscode.postMessage({ type: 'clear' }); } },
  { name: 'new', help: 'Start new chat tab', run: function () { vscode.postMessage({ type: 'newTab' }); } },
  { name: 'close-tab', help: 'Close active tab', run: function () {
    var active = document.querySelector('.tab-chip.active');
    var id = active ? active.getAttribute('data-chat-id') : null;
    if (id) vscode.postMessage({ type: 'closeTab', chatId: id });
  } },
  { name: 'rename-tab', help: 'Rename active tab', run: function () {
    var active = document.querySelector('.tab-chip.active');
    var id = active ? active.getAttribute('data-chat-id') : null;
    var prev = active ? ((active.querySelector('.tab-title') || {}).textContent || '') : '';
    if (!id) return;
    var next = window.prompt('Rename tab', prev);
    if (typeof next === 'string' && next.trim()) {
      vscode.postMessage({ type: 'renameTab', chatId: id, title: next.trim() });
    }
  } },
  { name: 'stop', help: 'Stop generation', run: function () { vscode.postMessage({ type: 'stop' }); } },
  { name: 'web', help: 'Toggle web search', run: function () { webSearchBtnEl && webSearchBtnEl.click(); } },
  { name: 'image', help: 'Toggle image mode', run: function () { imageModeBtnEl && imageModeBtnEl.click(); } },
  { name: 'tools', help: 'Toggle tools', run: function () { toolsBtnEl && toolsBtnEl.click(); } },
  { name: 'files', help: 'Create files from last answer', run: function () { vscode.postMessage({ type: 'createFiles' }); } },
  { name: 'api-key', help: 'Open API key prompt', run: function () { vscode.postMessage({ type: 'openApiKey' }); } },
];
function closeSlashMenu() {
  slashOpen = false;
  slashItems = [];
  slashIndex = 0;
  if (slashMenuEl) slashMenuEl.classList.remove('visible');
}
function renderSlashMenu() {
  if (!slashMenuEl) return;
  if (!slashOpen || !slashItems.length) {
    slashMenuEl.classList.remove('visible');
    slashMenuEl.innerHTML = '';
    return;
  }
  slashMenuEl.classList.add('visible');
  slashMenuEl.innerHTML = slashItems.map(function (c, i) {
    var cls = i === slashIndex ? 'slash-item active' : 'slash-item';
    return '<button type="button" data-name="' + c.name + '" class="' + cls + '">/' + c.name + '<span>' + c.help + '</span></button>';
  }).join('');
}
function executeSlash(cmd) {
  if (!cmd) return;
  closeSlashMenu();
  closeMentionMenu();
  input.value = '';
  cmd.run();
}
if (slashMenuEl) {
  slashMenuEl.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    var btn = target.closest('.slash-item');
    if (!btn) return;
    var name = btn.getAttribute('data-name');
    var cmd = slashCommands.find(function (c) { return c.name === name; });
    executeSlash(cmd);
  });
}
if (mentionMenuEl) {
  mentionMenuEl.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    var btn = target.closest('.mention-item');
    if (!btn) return;
    var p = btn.getAttribute('data-path');
    if (!p) return;
    applyMentionPath(p);
  });
}
input.addEventListener('input', function () {
  updateDetectedMentionsFromInput();
  requestMentionCandidates();
  var val = input.value || '';
  if (!val.startsWith('/') || val.includes(' ')) {
    closeSlashMenu();
    syncPromptEnhanceButton();
    return;
  }
  var q = val.slice(1).toLowerCase();
  slashItems = slashCommands.filter(function (c) { return c.name.indexOf(q) === 0; });
  slashOpen = slashItems.length > 0;
  slashIndex = 0;
  renderSlashMenu();
  syncPromptEnhanceButton();
});
if (uploadBtnEl && attachInputEl) {
  uploadBtnEl.addEventListener('click', function () {
    attachInputEl.click();
  });
}
if (attachInputEl) {
  attachInputEl.addEventListener('change', function () {
    void handleFiles(attachInputEl.files);
    attachInputEl.value = '';
  });
}
function setupDropZone(el) {
  if (!el) return;
  el.addEventListener('dragover', function (ev) {
    ev.preventDefault();
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', function () {
    el.classList.remove('drag-over');
  });
  el.addEventListener('drop', function (ev) {
    ev.preventDefault();
    el.classList.remove('drag-over');
    if (ev.dataTransfer && ev.dataTransfer.files) {
      void handleFiles(ev.dataTransfer.files);
    }
  });
}
setupDropZone(rowEl);
setupDropZone(composerEl);
syncPromptEnhanceButton();
document.addEventListener('dragover', function (ev) {
  ev.preventDefault();
});
document.addEventListener('drop', function (ev) {
  ev.preventDefault();
});
renderAttachList();
renderMentionList();
