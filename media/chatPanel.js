const vscode = acquireVsCodeApi();
const log = document.getElementById('log');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const loadingEl = document.getElementById('loading');
let loading = false;
var webSearchEnabled = true;
var imageModeEnabled = false;
var attachedFiles = [];
var detectedMentions = [];
var MAX_ATTACH_FILES = 8;
var MAX_ATTACH_BYTES = 200000;

function autoResize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
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

var streamFlushTimer = null;
var pendingStreamText = null;
var lastRenderedStreamText = "";
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
  if (text === lastRenderedStreamText) return;
  lastRenderedStreamText = text;
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
    var pre = document.createElement('pre');
    pre.className = 'streaming-plain';
    pre.textContent = text;
    b.appendChild(pre);
  }
  log.scrollTop = log.scrollHeight;
  if (text && text.length) loadingEl.style.display = 'none';
}

function setStreamPreview(text) {
  pendingStreamText = text;
  if (streamFlushTimer) return;
  // Batch token bursts so streaming looks smooth, not word-by-word.
  streamFlushTimer = setTimeout(flushStreamPreview, 110);
}

function removeStreamPreview() {
  if (streamFlushTimer) {
    clearTimeout(streamFlushTimer);
    streamFlushTimer = null;
  }
  pendingStreamText = null;
  lastRenderedStreamText = "";
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

function render(history) {
  log.innerHTML = '';
  var list = history || [];
  setTurnCount(list.length);
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
    if (typeof m.webSearchEnabled === 'boolean') {
      webSearchEnabled = m.webSearchEnabled;
      syncWebSearchButton();
    }
    var sidEl = document.getElementById('chat-session-id');
    if (sidEl && m.chatIdShort) {
      sidEl.textContent = m.chatIdShort;
      sidEl.title = 'Session ' + (m.chatId || m.chatIdShort) + ' — history kept until Clear';
    }
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
  var modeEl = document.getElementById('send-mode');
  var mode = modeEl && modeEl.value === 'image' ? 'image' : 'chat';
  var sizeEl = document.getElementById('image-size');
  var imageSize = mode === 'image' && sizeEl && sizeEl.value ? sizeEl.value : undefined;
  input.value = '';
  detectedMentions = [];
  renderMentionList();
  autoResize();
  vscode.postMessage({
    type: 'send',
    text: t,
    mode: mode,
    imageSize: imageSize,
    webSearch: webSearchEnabled,
    attachments: attachedFiles
  });
  attachedFiles = [];
  renderAttachList();
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
log.addEventListener('click', function (ev) {
  var target = ev.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains('code-copy-btn')) {
    return;
  }
  var wrap = target.closest('.code-wrap');
  var codeEl = wrap ? wrap.querySelector('.code-block code') : null;
  var codeText = codeEl ? codeEl.textContent || '' : '';
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
  // If API key is already set, hide onboarding completely.
  var hideRow = hasApiKey;
  setupRow.classList.toggle('setup-hidden', hideRow);
}

btnInstall.addEventListener('click', function () {
  vscode.postMessage({ type: 'installVsix' });
});
btnApi.addEventListener('click', function () {
  vscode.postMessage({ type: 'openApiKey' });
});

vscode.postMessage({ type: 'setupReady' });

var sendModeEl = document.getElementById('send-mode');
var webSearchBtnEl = document.getElementById('web-search-btn');
var imageModeBtnEl = document.getElementById('image-mode-btn');
var uploadBtnEl = document.getElementById('upload-btn');
var attachInputEl = document.getElementById('attach-input');
var attachListEl = document.getElementById('attach-list');
var mentionListEl = document.getElementById('mention-list');
var rowEl = document.getElementById('row');
var composerEl = document.getElementById('composer');
function syncImageSizeVisibility() {
  // kept for compatibility; no inline size picker in compact UI
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
  if (!attachedFiles.length) {
    attachListEl.textContent = '';
    return;
  }
  attachListEl.textContent = attachedFiles.map(function (f) { return f.name; }).join(' · ');
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
input.addEventListener('input', updateDetectedMentionsFromInput);
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
document.addEventListener('dragover', function (ev) {
  ev.preventDefault();
});
document.addEventListener('drop', function (ev) {
  ev.preventDefault();
});
renderAttachList();
renderMentionList();
