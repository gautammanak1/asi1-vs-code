/**
 * Safe Markdown → DOM for ASI Assistant webview.
 * Normalizes some model quirks (MARKDOWN/CODE pseudo-fences), then renders prose + code fences.
 */
(function (global) {
  var NL = String.fromCharCode(10);
  var BT = String.fromCharCode(96);
  var FENCE = BT + BT + BT;

  var PSEUDO_LANG = {
    JSON: "json",
    TS: "typescript",
    TYPESCRIPT: "typescript",
    TSX: "tsx",
    JS: "javascript",
    JAVASCRIPT: "javascript",
    JSX: "jsx",
    BASH: "bash",
    SH: "bash",
    SHELL: "bash",
    ZSH: "bash",
    CSS: "css",
    SCSS: "scss",
    HTML: "html",
    XML: "xml",
    SQL: "sql",
    PY: "python",
    PYTHON: "python",
    MD: "markdown",
    MARKDOWN: "markdown",
    YAML: "yaml",
    YML: "yaml",
    ENV: "bash",
    DOCKERFILE: "dockerfile",
    NGINX: "nginx",
    GRAPHQL: "graphql",
  };

  function toHlLang(header) {
    var first = (header || "").trim().split(/\s+/)[0].toLowerCase();
    var map = {
      ts: "typescript",
      typescript: "typescript",
      tsx: "tsx",
      js: "javascript",
      javascript: "javascript",
      jsx: "jsx",
      json: "json",
      sh: "bash",
      shell: "bash",
      bash: "bash",
      zsh: "bash",
      yml: "yaml",
      yaml: "yaml",
      py: "python",
      python: "python",
      md: "markdown",
      html: "xml",
      htm: "xml",
      xml: "xml",
      css: "css",
      scss: "scss",
      sql: "sql",
      graphql: "graphql",
      nginx: "nginx",
      dockerfile: "dockerfile",
    };
    return map[first] || first || "plaintext";
  }

  /** MARKDOWN/CODE + one-line JSON, TS, BASH, … → real ``` fences; balance odd fences. */
  function normalizeAssistantContent(raw) {
    var t = String(raw).replace(/\r\n/g, NL).replace(/\r/g, NL);
    var lines = t.split(NL);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var tr = lines[i].trim();
      var up = tr.toUpperCase();
      if (PSEUDO_LANG[up]) {
        out.push(FENCE + PSEUDO_LANG[up]);
      } else if (up === "CODE") {
        out.push(FENCE);
      } else {
        out.push(lines[i]);
      }
    }
    t = out.join(NL);
    var n = 0;
    var p = 0;
    while (true) {
      p = t.indexOf(FENCE, p);
      if (p === -1) {
        break;
      }
      n++;
      p += 3;
    }
    if (n % 2 === 1) {
      t += NL + FENCE;
    }
    return t;
  }

  function applyInline(parent, str) {
    if (!str) {
      return;
    }
    var s = String(str);
    var i = 0;
    while (i < s.length) {
      if (s.charAt(i) === "`") {
        var end = s.indexOf("`", i + 1);
        if (end > i) {
          var code = document.createElement("code");
          code.className = "md-inline-code";
          code.textContent = s.slice(i + 1, end);
          parent.appendChild(code);
          i = end + 1;
          continue;
        }
      }
      if (s.slice(i, i + 2) === "**") {
        var endB = s.indexOf("**", i + 2);
        if (endB > i + 2) {
          var strong = document.createElement("strong");
          applyInline(strong, s.slice(i + 2, endB));
          parent.appendChild(strong);
          i = endB + 2;
          continue;
        }
      }
      if (s.charAt(i) === "*" && s.charAt(i + 1) !== "*") {
        var endI = s.indexOf("*", i + 1);
        if (endI > i + 1) {
          var em = document.createElement("em");
          applyInline(em, s.slice(i + 1, endI));
          parent.appendChild(em);
          i = endI + 1;
          continue;
        }
      }
      if (s.slice(i, i + 2) === "__") {
        var endU = s.indexOf("__", i + 2);
        if (endU > i + 2) {
          var em2 = document.createElement("em");
          applyInline(em2, s.slice(i + 2, endU));
          parent.appendChild(em2);
          i = endU + 2;
          continue;
        }
      }
      if (s.charAt(i) === "[") {
        var close = s.indexOf("]", i);
        if (close > i && s.slice(close, close + 2) === "](") {
          var closeParen = s.indexOf(")", close + 2);
          if (closeParen > close + 2) {
            var href = s.slice(close + 2, closeParen);
            if (/^https?:\/\//i.test(href)) {
              var label = s.slice(i + 1, close);
              var a = document.createElement("a");
              a.href = href;
              a.target = "_blank";
              a.rel = "noreferrer noopener";
              a.className = "md-a";
              applyInline(a, label);
              parent.appendChild(a);
              i = closeParen + 1;
              continue;
            }
          }
        }
      }
      parent.appendChild(document.createTextNode(s.charAt(i)));
      i++;
    }
  }

  function flushParagraph(container, buf) {
    var t = buf.join(" ").trim();
    if (!t) {
      return;
    }
    var p = document.createElement("p");
    p.className = "md-p";
    applyInline(p, t);
    container.appendChild(p);
  }

  function parseTableRow(line) {
    if (!line.includes("|")) {
      return null;
    }
    var cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(function (c) {
        return c.trim();
      });
    return cells.length ? cells : null;
  }

  function isTableSep(line) {
    var t = line.trim();
    if (!t.includes("|")) {
      return false;
    }
    return /^[\s|:\-]+$/.test(t.replace(/\|/g, ""));
  }

  /** Returns start if not a table; otherwise returns exclusive end index (next line after table). */
  function renderTable(container, lines, start) {
    var row0 = lines[start].trim();
    if (!row0.includes("|")) {
      return start;
    }
    if (start + 1 >= lines.length || !isTableSep(lines[start + 1].trim())) {
      return start;
    }
    var head = parseTableRow(row0);
    if (!head) {
      return start;
    }
    var bodyRows = [];
    var j = start + 2;
    while (j < lines.length && lines[j].trim() && lines[j].trim().includes("|")) {
      var r = parseTableRow(lines[j].trim());
      if (r) {
        bodyRows.push(r);
      }
      j++;
    }
    var table = document.createElement("table");
    table.className = "md-table";
    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    head.forEach(function (cell) {
      var th = document.createElement("th");
      th.className = "md-th";
      applyInline(th, cell);
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    bodyRows.forEach(function (row) {
      var tr = document.createElement("tr");
      row.forEach(function (cell) {
        var td = document.createElement("td");
        td.className = "md-td";
        applyInline(td, cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    return j;
  }

  function renderProse(container, md) {
    var text = String(md).replace(/\r\n/g, NL).replace(/\r/g, NL);
    var lines = text.split(NL);
    var para = [];
    var list = null;
    var listType = null;

    function endList() {
      if (list) {
        container.appendChild(list);
        list = null;
        listType = null;
      }
    }

    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var trimmed = line.trim();

      if (!trimmed) {
        flushParagraph(container, para);
        para = [];
        endList();
        continue;
      }

      if (/^([-*_])\1\1+\s*$/.test(trimmed) && trimmed.length >= 3) {
        flushParagraph(container, para);
        para = [];
        endList();
        var hr = document.createElement("hr");
        hr.className = "md-hr";
        container.appendChild(hr);
        continue;
      }

      var tableEnd = renderTable(container, lines, li);
      if (tableEnd > li) {
        flushParagraph(container, para);
        para = [];
        endList();
        li = tableEnd - 1;
        continue;
      }

      var hm = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (hm) {
        flushParagraph(container, para);
        para = [];
        endList();
        var level = Math.min(hm[1].length, 6);
        var h = document.createElement("h" + level);
        h.className = "md-h";
        applyInline(h, hm[2]);
        container.appendChild(h);
        continue;
      }

      var taskm = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (taskm) {
        flushParagraph(container, para);
        para = [];
        if (!list || listType !== "ul") {
          endList();
          list = document.createElement("ul");
          list.className = "md-ul md-task-list";
          listType = "ul";
        }
        var item = document.createElement("li");
        item.className = "md-li md-task";
        var cb = document.createElement("span");
        cb.className = "md-task-box";
        cb.textContent = taskm[1].toLowerCase() === "x" ? "☑" : "☐";
        item.appendChild(cb);
        var span = document.createElement("span");
        applyInline(span, taskm[2]);
        item.appendChild(span);
        list.appendChild(item);
        continue;
      }

      var ulm = trimmed.match(/^[-*]\s+(.+)$/);
      if (ulm) {
        flushParagraph(container, para);
        para = [];
        if (!list || listType !== "ul") {
          endList();
          list = document.createElement("ul");
          list.className = "md-ul";
          listType = "ul";
        }
        var item2 = document.createElement("li");
        item2.className = "md-li";
        applyInline(item2, ulm[1]);
        list.appendChild(item2);
        continue;
      }

      var olm = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (olm) {
        flushParagraph(container, para);
        para = [];
        if (!list || listType !== "ol") {
          endList();
          list = document.createElement("ol");
          list.className = "md-ol";
          listType = "ol";
        }
        var oitem = document.createElement("li");
        oitem.className = "md-li";
        applyInline(oitem, olm[2]);
        list.appendChild(oitem);
        continue;
      }

      endList();
      para.push(trimmed);
    }
    flushParagraph(container, para);
    endList();
  }

  function renderAssistant(container, raw) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    var normalized = normalizeAssistantContent(raw);
    var parts = normalized.split(FENCE);
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (!parts[i]) {
          continue;
        }
        var prose = document.createElement("div");
        prose.className = "md-prose";
        renderProse(prose, parts[i]);
        container.appendChild(prose);
      } else {
        var fence = parts[i];
        var lines = fence.replace(/\r/g, "").split(NL);
        var headerRaw = (lines[0] || "").trim();
        var headerLow = headerRaw.toLowerCase();
        var inner = lines.slice(1).join(NL);
        if (headerLow === "markdown" || headerLow === "md") {
          var mdInner = document.createElement("div");
          mdInner.className = "md-prose md-fence-md";
          renderProse(mdInner, inner);
          container.appendChild(mdInner);
        } else {
          var hl = toHlLang(headerRaw);
          var wrap = document.createElement("div");
          wrap.className = "code-wrap";
          wrap.setAttribute("data-lang", hl);
          var lbl = document.createElement("div");
          lbl.className = "code-label code-label-" + hl;
          lbl.textContent = headerRaw || hl || "code";
          wrap.appendChild(lbl);
          var pre = document.createElement("pre");
          pre.className = "code-block";
          var codeEl = document.createElement("code");
          codeEl.textContent = inner;
          codeEl.className = "language-" + hl;
          pre.appendChild(codeEl);
          wrap.appendChild(pre);
          container.appendChild(wrap);
        }
      }
    }
  }

  function applySyntaxHighlight(scope) {
    var root = scope || document;
    if (typeof hljs === "undefined" || !hljs.highlightElement) {
      return;
    }
    root.querySelectorAll(".code-block code").forEach(function (el) {
      try {
        el.removeAttribute("data-highlighted");
        hljs.highlightElement(el);
      } catch (e) {
        /* ignore unknown grammar */
      }
    });
  }

  global.ASI_MD = {
    renderAssistant: renderAssistant,
    renderProse: renderProse,
    normalizeAssistantContent: normalizeAssistantContent,
    applySyntaxHighlight: applySyntaxHighlight,
    toHlLang: toHlLang,
  };
})(typeof self !== "undefined" ? self : this);
