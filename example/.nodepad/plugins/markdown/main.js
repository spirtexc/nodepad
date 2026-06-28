// plugins/_shims/codemirror-view.ts
var mod = window.__nodepad_cm__.view;
var {
  EditorView,
  ViewPlugin,
  Decoration,
  DecorationSet,
  WidgetType,
  MatchDecorator,
  ViewUpdate,
  keymap,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  lineNumbers,
  gutter,
  GutterMarker,
  tooltips,
  showTooltip,
  showPanel,
  placeholder,
  scrollPastEnd,
  rectangularSelection,
  crosshairCursor
} = mod;

// plugins/_shims/codemirror-state.ts
var mod2 = window.__nodepad_cm__.state;
var {
  EditorState,
  EditorSelection,
  SelectionRange,
  StateField,
  StateEffect,
  StateEffectType,
  Facet,
  Compartment,
  Annotation,
  AnnotationType,
  RangeSetBuilder,
  RangeSet,
  RangeValue,
  Transaction,
  ChangeSet,
  ChangeDesc,
  MapMode,
  CharCategory,
  findClusterBreak,
  codePointAt,
  codePointSize,
  fromCodePoint
} = mod2;

// src/editor/markdown.ts
var HrWidget = class extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-md-hr";
    return div;
  }
};
var CheckboxWidget = class extends WidgetType {
  constructor(checked, togglePos) {
    super();
    this.checked = checked;
    this.togglePos = togglePos;
  }
  eq(o) {
    return this.checked === o.checked && this.togglePos === o.togglePos;
  }
  toDOM(view) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "task";
    input.autocomplete = "off";
    input.checked = this.checked;
    input.className = "cm-md-checkbox";
    input.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const insert = this.checked ? " " : "x";
      view.dispatch({ changes: { from: this.togglePos, to: this.togglePos + 1, insert } });
    });
    return input;
  }
};
var ImageWidget = class extends WidgetType {
  constructor(alt, src) {
    super();
    this.alt = alt;
    this.src = src;
  }
  eq(o) {
    return this.alt === o.alt && this.src === o.src;
  }
  toDOM() {
    if (/^https?:\/\//i.test(this.src)) {
      const img = document.createElement("img");
      img.src = this.src;
      img.alt = this.alt;
      img.className = "cm-md-image";
      return img;
    }
    const span = document.createElement("span");
    span.className = "cm-md-image-local";
    span.textContent = `\u{1F5BC} ${this.alt || "image"}`;
    return span;
  }
};
function getFences(view) {
  const { doc } = view.state;
  const fences = [];
  let openFenceTo = -1;
  for (let ln = 1; ln <= doc.lines; ln++) {
    const line = doc.line(ln);
    if (/^```/.test(line.text)) {
      if (openFenceTo === -1) {
        openFenceTo = line.to;
      } else {
        fences.push({ bodyStart: openFenceTo + 1, bodyEnd: line.from - 1 });
        openFenceTo = -1;
      }
    }
  }
  return fences;
}
function inFenceBody(pos, fences) {
  return fences.some((f) => pos >= f.bodyStart && pos <= f.bodyEnd);
}
function buildLineDecos(view) {
  const builder = new RangeSetBuilder();
  const { doc, selection } = view.state;
  const curLine = doc.lineAt(selection.main.head).number;
  const fences = getFences(view);
  for (let ln = 1; ln <= doc.lines; ln++) {
    const line = doc.line(ln);
    const text = line.text;
    if (inFenceBody(line.from, fences)) continue;
    if (/^```/.test(text)) continue;
    if (ln === curLine) continue;
    const hm = /^(#{1,6}) /.exec(text);
    if (hm) {
      builder.add(line.from, line.from, Decoration.line({ class: `cm-md-h${hm[1].length}` }));
      continue;
    }
    if (/^> /.test(text)) {
      builder.add(line.from, line.from, Decoration.line({ class: "cm-md-blockquote" }));
    }
  }
  return builder.finish();
}
function buildMarkDecos(view) {
  const { doc, selection } = view.state;
  const curLine = doc.lineAt(selection.main.head).number;
  const fences = getFences(view);
  const items = [];
  for (let ln = 1; ln <= doc.lines; ln++) {
    if (ln === curLine) continue;
    const line = doc.line(ln);
    if (inFenceBody(line.from, fences)) continue;
    const text = line.text;
    const base = line.from;
    let m;
    const boldRe = /\*\*(.+?)\*\*/g;
    while ((m = boldRe.exec(text)) !== null)
      items.push({ from: base + m.index + 2, to: base + m.index + m[0].length - 2, cls: "cm-md-bold" });
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    while ((m = italicRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: "cm-md-italic" });
    const strikeRe = /~~(.+?)~~/g;
    while ((m = strikeRe.exec(text)) !== null)
      items.push({ from: base + m.index + 2, to: base + m.index + m[0].length - 2, cls: "cm-md-strike" });
    const highlightRe = /==(.+?)==/g;
    while ((m = highlightRe.exec(text)) !== null)
      items.push({ from: base + m.index + 2, to: base + m.index + m[0].length - 2, cls: "cm-md-highlight" });
    const subRe = /(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g;
    while ((m = subRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: "cm-md-sub" });
    const supRe = /\^([^^]+?)\^/g;
    while ((m = supRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: "cm-md-sup" });
    const codeRe = /`([^`]+)`/g;
    while ((m = codeRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: "cm-md-code" });
    const linkRe = /\[([^\]]+)\]\([^)]+\)/g;
    while ((m = linkRe.exec(text)) !== null) {
      if (m.index > 0 && text[m.index - 1] === "!") continue;
      items.push({ from: base + m.index + 1, to: base + m.index + 1 + m[1].length, cls: "cm-md-link" });
    }
  }
  items.sort((a, b) => a.from - b.from);
  const builder = new RangeSetBuilder();
  for (const { from, to, cls } of items) {
    if (from < to) builder.add(from, to, Decoration.mark({ class: cls }));
  }
  return builder.finish();
}
function buildReplaceDecos(view) {
  const { doc, selection } = view.state;
  const curLine = doc.lineAt(selection.main.head).number;
  const fences = getFences(view);
  const items = [];
  const push = (from, to, deco) => items.push({ from, to, deco });
  const hide = Decoration.replace({});
  for (let ln = 1; ln <= doc.lines; ln++) {
    if (ln === curLine) continue;
    const line = doc.line(ln);
    if (inFenceBody(line.from, fences)) continue;
    const text = line.text;
    const base = line.from;
    let m;
    if (/^[-*_]{3,}$/.test(text.trim()) && !/^#+/.test(text)) {
      push(base, line.to, Decoration.replace({ widget: new HrWidget() }));
      continue;
    }
    const hm = /^(#{1,6}) /.exec(text);
    if (hm) push(base, base + hm[1].length + 1, hide);
    if (/^> /.test(text)) push(base, base + 2, hide);
    const cbm = /^(\s*[-*+] )\[([x ])\] /.exec(text);
    if (cbm) {
      const markerStart = base + cbm[1].length;
      push(
        markerStart,
        markerStart + 4,
        Decoration.replace({ widget: new CheckboxWidget(cbm[2] === "x", markerStart + 1) })
      );
    }
    const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((m = imgRe.exec(text)) !== null)
      push(
        base + m.index,
        base + m.index + m[0].length,
        Decoration.replace({ widget: new ImageWidget(m[1], m[2]) })
      );
    const boldRe = /\*\*(.+?)\*\*/g;
    while ((m = boldRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 2, hide);
      push(base + m.index + m[0].length - 2, base + m.index + m[0].length, hide);
    }
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    while ((m = italicRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide);
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide);
    }
    const strikeRe = /~~(.+?)~~/g;
    while ((m = strikeRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 2, hide);
      push(base + m.index + m[0].length - 2, base + m.index + m[0].length, hide);
    }
    const highlightRe = /==(.+?)==/g;
    while ((m = highlightRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 2, hide);
      push(base + m.index + m[0].length - 2, base + m.index + m[0].length, hide);
    }
    const subRe = /(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g;
    while ((m = subRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide);
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide);
    }
    const supRe = /\^([^^]+?)\^/g;
    while ((m = supRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide);
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide);
    }
    const codeRe = /`([^`]+)`/g;
    while ((m = codeRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide);
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide);
    }
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((m = linkRe.exec(text)) !== null) {
      if (m.index > 0 && text[m.index - 1] === "!") continue;
      push(base + m.index, base + m.index + 1, hide);
      const closeBracket = m.index + 1 + m[1].length;
      push(base + closeBracket, base + m.index + m[0].length, hide);
    }
  }
  items.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to);
  const builder = new RangeSetBuilder();
  let lastTo = -1;
  for (const { from, to, deco } of items) {
    if (from >= lastTo && from < to) {
      builder.add(from, to, deco);
      lastTo = to;
    }
  }
  return builder.finish();
}
var markdownTheme = EditorView.baseTheme({
  // Headings
  ".cm-line.cm-md-h1": { fontSize: "2em", fontWeight: "700", lineHeight: "1.3" },
  ".cm-line.cm-md-h2": { fontSize: "1.6em", fontWeight: "700", lineHeight: "1.3" },
  ".cm-line.cm-md-h3": { fontSize: "1.35em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-line.cm-md-h4": { fontSize: "1.15em", fontWeight: "600", lineHeight: "1.4" },
  ".cm-line.cm-md-h5": { fontSize: "1em", fontWeight: "600" },
  ".cm-line.cm-md-h6": { fontSize: "0.9em", fontWeight: "600", opacity: "0.7" },
  // Blockquote
  ".cm-line.cm-md-blockquote": {
    borderLeft: "3px solid var(--accent, #4a90e2)",
    paddingLeft: "1em",
    opacity: "0.8",
    fontStyle: "italic"
  },
  // Inline marks
  ".cm-md-bold": { fontWeight: "700" },
  ".cm-md-italic": { fontStyle: "italic" },
  ".cm-md-strike": { textDecoration: "line-through", opacity: "0.7" },
  ".cm-md-highlight": { backgroundColor: "rgba(255, 235, 59, 0.35)", borderRadius: "2px" },
  ".cm-md-sub": { fontSize: "0.75em", verticalAlign: "sub", lineHeight: "0" },
  ".cm-md-sup": { fontSize: "0.75em", verticalAlign: "super", lineHeight: "0" },
  ".cm-md-code": {
    fontFamily: "monospace",
    fontSize: "0.9em",
    backgroundColor: "rgba(0, 0, 0, 0.07)",
    borderRadius: "3px",
    padding: "0 3px"
  },
  ".cm-md-link": { color: "var(--accent, #4a90e2)", textDecoration: "underline", cursor: "pointer" },
  // Widgets
  ".cm-md-hr": {
    display: "block",
    width: "100%",
    height: "0",
    borderTop: "2px solid var(--border, rgba(0,0,0,0.15))",
    margin: "4px 0"
  },
  ".cm-md-checkbox": { cursor: "pointer", width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" },
  ".cm-md-image": { maxWidth: "100%", maxHeight: "280px", display: "inline-block", verticalAlign: "middle", borderRadius: "4px" },
  ".cm-md-image-local": {
    display: "inline-block",
    padding: "2px 8px",
    background: "rgba(0,0,0,0.06)",
    borderRadius: "4px",
    fontSize: "0.85em",
    opacity: "0.8"
  },
  // Dark mode overrides
  "&dark .cm-md-code": { backgroundColor: "rgba(255, 255, 255, 0.12)" },
  "&dark .cm-md-highlight": { backgroundColor: "rgba(255, 235, 59, 0.2)" },
  "&dark .cm-md-image-local": { background: "rgba(255,255,255,0.08)" }
});
function makePlugin(buildFn) {
  return ViewPlugin.fromClass(
    class {
      decorations;
      constructor(view) {
        this.decorations = buildFn(view);
      }
      update(u) {
        if (u.docChanged || u.selectionSet || u.viewportChanged)
          this.decorations = buildFn(u.view);
      }
    },
    { decorations: (v) => v.decorations }
  );
}
var markdownWYSIWYG = [
  markdownTheme,
  makePlugin(buildLineDecos),
  makePlugin(buildMarkDecos),
  makePlugin(buildReplaceDecos)
];

// src/editor/codeblock.ts
var setCodeEditing = StateEffect.define();
var FENCE_RE = /^```(\w*)\r?\n([\s\S]*?)\r?\n```/gm;
function buildDecorations(state, editing) {
  const builder = new RangeSetBuilder();
  const text = state.doc.toString();
  FENCE_RE.lastIndex = 0;
  let m;
  while ((m = FENCE_RE.exec(text)) !== null) {
    const lang = m[1].toLowerCase();
    if (lang === "mermaid") continue;
    const blockFrom = m.index;
    const blockTo = m.index + m[0].length;
    const code = m[2];
    const isEditing = editing !== null && editing.from === blockFrom && editing.to === blockTo;
    if (!isEditing) {
      builder.add(blockFrom, blockTo, Decoration.replace({
        widget: new CodeBlockWidget(lang || "text", code, blockFrom, blockTo),
        block: true
      }));
    }
  }
  return builder.finish();
}
var codeField = StateField.define({
  create(state) {
    return { editing: null, deco: buildDecorations(state, null) };
  },
  update(value, tr) {
    let { editing } = value;
    for (const e of tr.effects) {
      if (e.is(setCodeEditing)) editing = e.value;
    }
    if (editing && tr.docChanged) {
      editing = {
        from: tr.changes.mapPos(editing.from),
        to: tr.changes.mapPos(editing.to)
      };
    }
    const decoChanged = tr.docChanged || editing !== value.editing;
    const deco = decoChanged ? buildDecorations(tr.state, editing) : value.deco.map(tr.changes);
    return { editing, deco };
  },
  provide: (f) => EditorView.decorations.from(f, (s) => s.deco)
});
function enterEditMode(view, from, to, lang) {
  const prefix = `\`\`\`${lang}
`;
  view.dispatch({
    effects: setCodeEditing.of({ from, to }),
    selection: { anchor: Math.min(from + prefix.length, to) }
  });
  view.focus();
}
var codeCursorWatcher = ViewPlugin.fromClass(class {
  update(update) {
    if (!update.selectionSet && !update.docChanged) return;
    const { editing } = update.state.field(codeField);
    if (!editing) return;
    const cursor = update.state.selection.main.head;
    if (cursor < editing.from || cursor > editing.to) {
      update.view.dispatch({ effects: setCodeEditing.of(null) });
    }
  }
});
var LANG_LABELS = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  java: "Java",
  cpp: "C++",
  c: "C",
  cs: "C#",
  rb: "Ruby",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin"
};
var CodeBlockWidget = class _CodeBlockWidget extends WidgetType {
  constructor(lang, code, blockFrom, blockTo) {
    super();
    this.lang = lang;
    this.code = code;
    this.blockFrom = blockFrom;
    this.blockTo = blockTo;
  }
  eq(other) {
    return other instanceof _CodeBlockWidget && other.lang === this.lang && other.code === this.code && other.blockFrom === this.blockFrom && other.blockTo === this.blockTo;
  }
  toDOM(view) {
    const { lang, code, blockFrom, blockTo } = this;
    const wrap = document.createElement("div");
    wrap.className = "cm-code-block";
    wrap.setAttribute("contenteditable", "false");
    const header = document.createElement("div");
    header.className = "cm-code-block-header";
    const langLabel = document.createElement("span");
    langLabel.className = "cm-code-block-lang";
    langLabel.innerHTML = `<span class="cm-code-icon" aria-hidden="true">&lt;/&gt;</span> ` + escapeHtml(LANG_LABELS[lang] ?? (lang || "Plain text"));
    const actions = document.createElement("div");
    actions.className = "cm-code-block-actions";
    const copyBtn = document.createElement("button");
    copyBtn.className = "cm-code-block-btn";
    copyBtn.title = "Copy code";
    copyBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2"/></svg>`;
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.classList.add("cm-code-block-btn--copied");
        setTimeout(() => copyBtn.classList.remove("cm-code-block-btn--copied"), 1500);
      }).catch(() => {
      });
    });
    actions.appendChild(copyBtn);
    header.appendChild(langLabel);
    header.appendChild(actions);
    wrap.appendChild(header);
    const pre = document.createElement("pre");
    pre.className = "cm-code-block-body";
    const codeEl = document.createElement("code");
    codeEl.setAttribute("data-lang", lang);
    codeEl.textContent = code;
    pre.appendChild(codeEl);
    wrap.appendChild(pre);
    wrap.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      enterEditMode(view, blockFrom, blockTo, lang);
    });
    const editBtn = document.createElement("button");
    editBtn.className = "cm-code-block-btn cm-code-block-edit";
    editBtn.title = "Edit code";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      enterEditMode(view, blockFrom, blockTo, lang);
    });
    actions.insertBefore(editBtn, copyBtn);
    requestAnimationFrame(() => view.requestMeasure());
    return wrap;
  }
  ignoreEvent() {
    return false;
  }
};
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
var codeBlockTheme = EditorView.baseTheme({
  ".cm-code-block": {
    display: "block",
    margin: "6px 0",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#1a1a2e",
    border: "1px solid rgba(255,255,255,0.08)",
    fontFamily: "inherit"
  },
  ".cm-code-block-header": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    userSelect: "none"
  },
  ".cm-code-block-lang": {
    fontSize: "12px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  ".cm-code-icon": {
    fontSize: "11px",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "-0.5px"
  },
  ".cm-code-block-actions": {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  ".cm-code-block-btn": {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.8)",
    fontSize: "11px",
    fontFamily: "inherit",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
    lineHeight: "1"
  },
  ".cm-code-block-btn:hover": {
    background: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.3)",
    color: "#fff"
  },
  ".cm-code-block-btn--copied": {
    borderColor: "rgba(100,220,100,0.5)",
    color: "rgba(100,220,100,0.9)"
  },
  ".cm-code-block-edit": {
    opacity: "0",
    pointerEvents: "none",
    transition: "opacity 0.15s"
  },
  ".cm-code-block:hover .cm-code-block-edit": {
    opacity: "1",
    pointerEvents: "auto"
  },
  ".cm-code-block-body": {
    margin: "0",
    padding: "16px",
    overflowX: "auto",
    fontSize: "13px",
    lineHeight: "1.65",
    color: "#d4d4d4",
    fontFamily: `'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace`,
    background: "transparent",
    tabSize: "2"
  },
  ".cm-code-block-body code": {
    fontFamily: "inherit",
    fontSize: "inherit",
    background: "none",
    padding: "0",
    color: "inherit",
    whiteSpace: "pre"
  }
});
var codeBlockWidgets = [codeBlockTheme, codeField, codeCursorWatcher];

// src/editor/wikilinks.ts
var WIKILINK_RE = /\[\[([^\]|#\n]+?)(?:\|([^\]\n]+?))?\]\]/g;
var WikilinkWidget = class extends WidgetType {
  constructor(label, path) {
    super();
    this.label = label;
    this.path = path;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-wikilink";
    span.textContent = this.label;
    span.title = `${this.path}
Ctrl+Click to open`;
    span.addEventListener("mousedown", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      span.dispatchEvent(new CustomEvent("cm-wikilink-open", {
        bubbles: true,
        detail: { path: this.path }
      }));
    });
    return span;
  }
  eq(other) {
    return this.label === other.label && this.path === other.path;
  }
  ignoreEvent() {
    return false;
  }
};
function buildDecorations2(state) {
  const decorations = [];
  const sel = state.selection;
  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum);
    WIKILINK_RE.lastIndex = 0;
    let m;
    while ((m = WIKILINK_RE.exec(line.text)) !== null) {
      const from = line.from + m.index;
      const to = from + m[0].length;
      const overlaps = sel.ranges.some((r) => r.from <= to && r.to >= from);
      if (overlaps) continue;
      const path = m[1].trim();
      const label = m[2]?.trim() ?? path.split("/").pop()?.replace(/\.md$/i, "") ?? path;
      decorations.push(
        Decoration.replace({ widget: new WikilinkWidget(label, path) }).range(from, to)
      );
    }
  }
  return Decoration.set(decorations, true);
}
var wikilinkDecorations = StateField.define({
  create(state) {
    return buildDecorations2(state);
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations2(tr.state);
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f)
});
var wikilinkTheme = EditorView.baseTheme({
  ".cm-wikilink": {
    color: "var(--accent)",
    cursor: "text",
    borderBottom: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)"
  },
  ".cm-wikilink:hover": {
    borderBottomColor: "var(--accent)"
  },
  // Show pointer when Ctrl/Meta is held so the user knows it's clickable
  "body:has(.cm-wikilink:hover) .cm-wikilink:hover": {
    cursor: "text"
  }
});

// plugins/markdown/index.ts
function makeMarkdownPlugin() {
  let removeExt = null;
  return {
    id: "markdown",
    name: "Markdown Formatting",
    version: "1.0.0",
    permissions: ["editor"],
    onLoad(app) {
      removeExt = app.addEditorExtension([markdownWYSIWYG, codeBlockWidgets, wikilinkDecorations, wikilinkTheme]);
    },
    onUnload() {
      removeExt?.();
      removeExt = null;
    }
  };
}
var markdown_default = makeMarkdownPlugin();
export {
  markdown_default as default
};
