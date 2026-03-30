const vscode = acquireVsCodeApi();
const log = document.getElementById('log');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const loadingEl = document.getElementById('loading');
let loading = false;

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

var streamRaf = null;
var pendingStreamText = null;
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
  streamRaf = null;
  var text = pendingStreamText;
  pendingStreamText = null;
  if (text === null || text === undefined) return;
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
  if (streamRaf) return;
  streamRaf = requestAnimationFrame(flushStreamPreview);
}

function removeStreamPreview() {
  if (streamRaf) {
    cancelAnimationFrame(streamRaf);
    streamRaf = null;
  }
  pendingStreamText = null;
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
  autoResize();
  vscode.postMessage({ type: 'send', text: t, mode: mode, imageSize: imageSize });
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

var sendModeEl = document.getElementById('send-mode');
var imageSizeEl = document.getElementById('image-size');
function syncImageSizeVisibility() {
  if (sendModeEl && imageSizeEl) {
    imageSizeEl.hidden = sendModeEl.value !== 'image';
  }
}
if (sendModeEl) {
  sendModeEl.addEventListener('change', syncImageSizeVisibility);
  syncImageSizeVisibility();
}
