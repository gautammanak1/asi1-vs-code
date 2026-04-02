/**
 * Safe Markdown → DOM for ASI Assistant webview.
 * Normalizes some model quirks (MARKDOWN/CODE pseudo-fences), then renders prose + code fences.
 */
(function (global) {
  var NL = String.fromCharCode(10);
  var BT = String.fromCharCode(96);
  var FENCE = BT + BT + BT;

  function toHlLang(header) {
    var first = (header || "").trim().split(/\s+/)[0].toLowerCase();
    if (!first) {
      return "plaintext";
    }
    // Keep model-provided language as-is; avoid forced remapping.
    return first.replace(/[^a-z0-9_+-]/g, "") || "plaintext";
  }

  function langIconMarkup(lang) {
    var l = (lang || "").toLowerCase();
    function badge(bg, fg, txt) {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="2" y="2" width="20" height="20" rx="5" fill="' + bg + '"/>' +
        '<text x="12" y="15" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8" font-weight="700" fill="' + fg + '">' + txt + '</text>' +
        '</svg>'
      );
    }
    var icons = {
      typescript: badge("#3178c6", "#ffffff", "TS"),
      javascript: badge("#f7df1e", "#111111", "JS"),
      python: badge("#3776ab", "#ffffff", "PY"),
      java: badge("#e76f00", "#ffffff", "JV"),
      go: badge("#00add8", "#ffffff", "GO"),
      rust: badge("#dea584", "#111111", "RS"),
      csharp: badge("#68217a", "#ffffff", "C#"),
      php: badge("#777bb4", "#ffffff", "PHP"),
      ruby: badge("#cc342d", "#ffffff", "RB"),
      swift: badge("#f05138", "#ffffff", "SW"),
      kotlin: badge("#7f52ff", "#ffffff", "KT"),
      html: badge("#e34f26", "#ffffff", "HTML"),
      css: badge("#264de4", "#ffffff", "CSS"),
      scss: badge("#cd6799", "#ffffff", "SCSS"),
      json: badge("#9ca3af", "#111111", "JSON"),
      yaml: badge("#cb171e", "#ffffff", "YML"),
      sql: badge("#336791", "#ffffff", "SQL"),
      bash: badge("#3fa75c", "#ffffff", "SH"),
      shell: badge("#3fa75c", "#ffffff", "SH"),
      zsh: badge("#3fa75c", "#ffffff", "SH"),
      markdown: badge("#0ea5e9", "#ffffff", "MD"),
      plaintext: badge("#475569", "#ffffff", "TXT"),
      xml: badge("#a855f7", "#ffffff", "XML"),
      dockerfile: badge("#2496ed", "#ffffff", "DKR"),
      graphql: badge("#e10098", "#ffffff", "GQL"),
      nginx: badge("#009639", "#ffffff", "NGX"),
      cpp: badge("#00599c", "#ffffff", "C++"),
      c: badge("#64748b", "#ffffff", "C"),
      dart: badge("#0175c2", "#ffffff", "DART"),
      r: badge("#276dc3", "#ffffff", "R"),
      scala: badge("#dc322f", "#ffffff", "SC"),
      lua: badge("#000080", "#ffffff", "LUA"),
      perl: badge("#39457e", "#ffffff", "PL"),
      elixir: badge("#6e4a7e", "#ffffff", "EX"),
      haskell: badge("#5e5086", "#ffffff", "HS"),
      powershell: badge("#2c74b3", "#ffffff", "PS"),
    };
    if (l === "ts" || l === "tsx") l = "typescript";
    if (l === "js" || l === "jsx") l = "javascript";
    if (l === "py") l = "python";
    if (l === "rb") l = "ruby";
    if (l === "kt") l = "kotlin";
    if (l === "cs") l = "csharp";
    if (l === "yml") l = "yaml";
    if (l === "sh") l = "bash";
    if (l === "md") l = "markdown";
    if (l === "htm") l = "html";
    if (l === "c++") l = "cpp";
    if (icons[l]) return icons[l];
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="#334155"/><circle cx="12" cy="12" r="3" fill="#93c5fd"/></svg>';
  }

  /** Keep content raw; only balance odd fences. */
  function normalizeAssistantContent(raw) {
    var t = String(raw).replace(/\r\n/g, NL).replace(/\r/g, NL);
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
      if (s.charAt(i) === "!" && s.charAt(i + 1) === "[") {
        var imgCloseBracket = s.indexOf("]", i + 2);
        if (imgCloseBracket > i + 1 && s.slice(imgCloseBracket, imgCloseBracket + 2) === "](") {
          var imgCloseParen = s.indexOf(")", imgCloseBracket + 2);
          if (imgCloseParen > imgCloseBracket + 2) {
            var imgAlt = s.slice(i + 2, imgCloseBracket);
            var imgSrc = s.slice(imgCloseBracket + 2, imgCloseParen);
            if (/^https?:\/\//i.test(imgSrc) || /^data:image\//i.test(imgSrc)) {
              var imgEl = document.createElement("img");
              imgEl.src = imgSrc;
              imgEl.alt = imgAlt;
              imgEl.className = "md-inline-img";
              parent.appendChild(imgEl);
              i = imgCloseParen + 1;
              continue;
            }
          }
        }
      }
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
          wrap.setAttribute("data-raw", inner);
          var lbl = document.createElement("div");
          lbl.className = "code-label code-label-" + hl;
          var labelIcon = document.createElement("span");
          labelIcon.className = "code-lang-ic";
          labelIcon.innerHTML = langIconMarkup(hl);
          lbl.appendChild(labelIcon);
          var labelText = document.createElement("span");
          labelText.className = "code-label-text";
          labelText.textContent = headerRaw || hl || "code";
          lbl.appendChild(labelText);
          var labelActions = document.createElement("div");
          labelActions.className = "code-label-actions";
          var collapseBtn = document.createElement("button");
          collapseBtn.type = "button";
          collapseBtn.className = "code-collapse-btn";
          collapseBtn.textContent = "Collapse";
          collapseBtn.setAttribute("aria-label", "Collapse code block");
          labelActions.appendChild(collapseBtn);
          lbl.appendChild(labelActions);
          wrap.appendChild(lbl);
          var copyBtn = document.createElement("button");
          copyBtn.type = "button";
          copyBtn.className = "code-copy-btn";
          copyBtn.textContent = "Copy";
          copyBtn.setAttribute("aria-label", "Copy code block");
          wrap.appendChild(copyBtn);
          var pre = document.createElement("pre");
          pre.className = "code-block";
          var code = document.createElement("code");
          code.className = "code-text language-" + hl;
          code.textContent = inner;
          pre.appendChild(code);
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
    root.querySelectorAll(".code-text").forEach(function (el) {
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
