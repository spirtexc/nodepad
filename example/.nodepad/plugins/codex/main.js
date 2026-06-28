var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/idb-keyval/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  clear: () => clear,
  createStore: () => createStore,
  del: () => del,
  delMany: () => delMany,
  entries: () => entries,
  get: () => get,
  getMany: () => getMany,
  keys: () => keys,
  promisifyRequest: () => promisifyRequest,
  set: () => set,
  setMany: () => setMany,
  update: () => update,
  values: () => values
});
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.oncomplete = request.onsuccess = () => resolve(request.result);
    request.onabort = request.onerror = () => reject(request.error);
  });
}
function createStore(dbName, storeName) {
  let dbp;
  const getDB = () => {
    if (dbp)
      return dbp;
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    dbp = promisifyRequest(request);
    dbp.then((db) => {
      db.onclose = () => dbp = void 0;
    }, () => {
    });
    return dbp;
  };
  return (txMode, callback) => getDB().then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
}
function defaultGetStore() {
  if (!defaultGetStoreFunc) {
    defaultGetStoreFunc = createStore("keyval-store", "keyval");
  }
  return defaultGetStoreFunc;
}
function get(key, customStore = defaultGetStore()) {
  return customStore("readonly", (store) => promisifyRequest(store.get(key)));
}
function set(key, value, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    store.put(value, key);
    return promisifyRequest(store.transaction);
  });
}
function setMany(entries2, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    entries2.forEach((entry) => store.put(entry[1], entry[0]));
    return promisifyRequest(store.transaction);
  });
}
function getMany(keys2, customStore = defaultGetStore()) {
  return customStore("readonly", (store) => Promise.all(keys2.map((key) => promisifyRequest(store.get(key)))));
}
function update(key, updater, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => (
    // Need to create the promise manually.
    // If I try to chain promises, the transaction closes in browsers
    // that use a promise polyfill (IE10/11).
    new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = function() {
        try {
          store.put(updater(this.result), key);
          resolve(promisifyRequest(store.transaction));
        } catch (err) {
          reject(err);
        }
      };
      req.onerror = () => reject(req.error);
    })
  ));
}
function del(key, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    store.delete(key);
    return promisifyRequest(store.transaction);
  });
}
function delMany(keys2, customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    keys2.forEach((key) => store.delete(key));
    return promisifyRequest(store.transaction);
  });
}
function clear(customStore = defaultGetStore()) {
  return customStore("readwrite", (store) => {
    store.clear();
    return promisifyRequest(store.transaction);
  });
}
function eachCursor(store, callback) {
  store.openCursor().onsuccess = function() {
    if (!this.result)
      return;
    callback(this.result);
    this.result.continue();
  };
  return promisifyRequest(store.transaction);
}
function keys(customStore = defaultGetStore()) {
  return customStore("readonly", (store) => {
    if (store.getAllKeys) {
      return promisifyRequest(store.getAllKeys());
    }
    const items = [];
    return eachCursor(store, (cursor) => items.push(cursor.key)).then(() => items);
  });
}
function values(customStore = defaultGetStore()) {
  return customStore("readonly", (store) => {
    if (store.getAll) {
      return promisifyRequest(store.getAll());
    }
    const items = [];
    return eachCursor(store, (cursor) => items.push(cursor.value)).then(() => items);
  });
}
function entries(customStore = defaultGetStore()) {
  return customStore("readonly", (store) => {
    if (store.getAll && store.getAllKeys) {
      return Promise.all([
        promisifyRequest(store.getAllKeys()),
        promisifyRequest(store.getAll())
      ]).then(([keys2, values2]) => keys2.map((key, i) => [key, values2[i]]));
    }
    const items = [];
    return eachCursor(store, (cursor) => items.push([cursor.key, cursor.value])).then(() => items);
  });
}
var defaultGetStoreFunc;
var init_dist = __esm({
  "node_modules/idb-keyval/dist/index.js"() {
  }
});

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

// plugins/codex/index.ts
var triggerState = {
  phase: "idle",
  trigger: null,
  ctrl: null,
  errorMsg: null
};
async function getOrCreateKey() {
  const { get: get2, set: set2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
  const existing = await get2("codex:encryption-key");
  if (existing) {
    const raw2 = Uint8Array.from(atob(existing), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw2, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  await set2("codex:encryption-key", btoa(String.fromCharCode(...new Uint8Array(raw))));
  return key;
}
async function encryptString(plaintext) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}
async function decryptString(b64) {
  const key = await getOrCreateKey();
  const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
async function loadConfig(app) {
  const raw = await app.readConfig("codex/credentials.enc");
  if (!raw) return { endpointUrl: "", apiKey: "", model: "" };
  try {
    const json = await decryptString(raw.trim());
    return JSON.parse(json);
  } catch {
    return { endpointUrl: "", apiKey: "", model: "" };
  }
}
async function saveConfig(app, config) {
  const json = JSON.stringify(config);
  const encrypted = await encryptString(json);
  await app.writeConfig("codex/credentials.enc", encrypted);
}
function parseLineRange(prompt) {
  const match = prompt.match(/\s*\(line\s+(\d+)-(\d+)\)\s*$/i);
  if (!match) return { cleanPrompt: prompt };
  return {
    cleanPrompt: prompt.slice(0, match.index).trim(),
    rangeFrom: parseInt(match[1], 10),
    rangeTo: parseInt(match[2], 10)
  };
}
function getSurroundingParagraph(doc, lineNumber) {
  let start = lineNumber;
  let end = lineNumber;
  while (start > 1) {
    const prevLine = doc.lineAt(start - 1);
    if (prevLine.text.trim() === "") break;
    start--;
  }
  while (end < doc.lines) {
    const nextLine = doc.lineAt(end + 1);
    if (nextLine.text.trim() === "") break;
    end++;
  }
  if (start === end) return null;
  return { from: doc.lineAt(start).from, to: doc.lineAt(end).to };
}
var statusBarEl = null;
var statusTimeout = null;
function showStatus(msg, isError = false) {
  if (!statusBarEl) return;
  statusBarEl.textContent = msg;
  statusBarEl.style.color = isError ? "#e5534b" : "#999";
  if (statusTimeout) clearTimeout(statusTimeout);
  if (!isError) {
    statusTimeout = setTimeout(() => {
      if (statusBarEl) statusBarEl.textContent = "";
    }, 5e3);
  }
}
function detectTrigger(doc, lineNumber) {
  const line = doc.lineAt(lineNumber);
  const text = line.text;
  const lineStartMatch = text.match(/^\/\/\s*(.*)/);
  if (lineStartMatch) {
    let combinedPrompt = lineStartMatch[1] || "";
    let lastLineNum = lineNumber;
    for (let next = lineNumber + 1; next <= doc.lines; next++) {
      const nextLine = doc.lineAt(next);
      const nextMatch = nextLine.text.match(/^\/\/\s*(.*)/);
      if (nextMatch) {
        combinedPrompt += "\n" + (nextMatch[1] || "");
        lastLineNum = next;
      } else {
        break;
      }
    }
    const lastLineEnd = doc.lineAt(lastLineNum).to;
    return {
      from: line.from + 2,
      // after //
      to: lastLineEnd,
      prompt: combinedPrompt,
      charStart: line.from,
      charEnd: lastLineEnd
    };
  }
  const inlineMatch = text.match(/(?:=\s*)?\/\/\s*(.+?)(?:\s*['"`]?)$/);
  if (inlineMatch && inlineMatch.index !== void 0) {
    const promptStart = line.from + inlineMatch.index + inlineMatch[0].indexOf("//") + 2;
    const promptText = inlineMatch[1].trim();
    return {
      from: promptStart,
      to: promptStart + promptText.length,
      prompt: promptText,
      charStart: line.from,
      charEnd: line.to
    };
  }
  return null;
}
var TriggerWidget = class extends WidgetType {
  constructor(prompt, hasIndicator) {
    this.prompt = prompt;
    this.hasIndicator = hasIndicator;
  }
  prompt;
  hasIndicator;
  toDOM() {
    const btn = document.createElement("span");
    btn.className = "codex-trigger-indicator";
    btn.textContent = "\u21B5 generate";
    btn.style.cssText = "display:inline-block;margin-left:4px;padding:0 6px;border-radius:10px;background:#4a90e2;color:#fff;font-size:10px;cursor:pointer;vertical-align:middle;opacity:0.7";
    btn.title = "Generate with Codex (Tab)";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("codex:generate"));
    });
    return btn;
  }
  eq(other) {
    return other.prompt === this.prompt && other.hasIndicator === this.hasIndicator;
  }
  get estimatedHeight() {
    return -1;
  }
  ignoreEvent(e) {
    return e.type !== "click" && e.type !== "mousedown" && e.type !== "mouseup";
  }
  destroy() {
  }
  updateDOM() {
    return true;
  }
};
var GhostWidget = class extends WidgetType {
  constructor(text) {
    this.text = text;
  }
  text;
  toDOM() {
    const span = document.createElement("span");
    span.className = "codex-ghost-suggestion";
    span.textContent = this.text;
    span.style.cssText = "color: #999; font-style: italic; margin-left: 4px;";
    return span;
  }
  eq(other) {
    return other.text === this.text;
  }
  get estimatedHeight() {
    return -1;
  }
  ignoreEvent() {
    return true;
  }
  destroy() {
  }
  updateDOM() {
    return true;
  }
};
var clearTrigger = StateEffect.define();
var triggerField = StateField.define({
  create() {
    return { decorations: DecorationSet.empty, trigger: null };
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(clearTrigger)) {
        return { decorations: DecorationSet.empty, trigger: null };
      }
    }
    if (tr.docChanged) {
      return updateTriggerDecorations(tr.view, value.trigger);
    }
    return value;
  }
});
function updateTriggerDecorations(view, prevTrigger) {
  const { state } = view;
  const { doc } = state;
  const builder = new DecorationSet.builder();
  let currentTrigger = null;
  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const trig = detectTrigger(doc, lineNum);
    if (!trig) continue;
    const deco = Decoration.widget({ widget: new TriggerWidget(trig.prompt, true), side: 1 });
    builder.add(trig.to, trig.to, deco);
    const { cleanPrompt } = parseLineRange(trig.prompt);
    if (cleanPrompt && !trig.prompt.match(/\(line\s+\d+-\d+\)/i)) {
      const SHORT_NOTE_THRESHOLD = 30;
      let suggestion = null;
      if (doc.lines < SHORT_NOTE_THRESHOLD) {
        const firstLine = doc.lineAt(1);
        const lastLine = doc.lineAt(doc.lines);
        suggestion = { from: firstLine.from, to: lastLine.to };
      } else {
        suggestion = getSurroundingParagraph(doc, lineNum);
      }
      if (suggestion) {
        const sugText = doc.sliceString(suggestion.from, suggestion.to).trim();
        if (sugText.length > 0) {
          trig.suggestionFrom = suggestion.from;
          trig.suggestionTo = suggestion.to;
          const firstLine = doc.lineAt(suggestion.from);
          const lastLine = doc.lineAt(suggestion.to);
          const ghostDeco = Decoration.widget({ widget: new GhostWidget(`(line ${firstLine.number}-${lastLine.number})`), side: 1 });
          builder.add(trig.to, trig.to, ghostDeco);
        }
      }
    }
    currentTrigger = trig;
    break;
  }
  return { decorations: builder.finish(), trigger: currentTrigger };
}
var _app = null;
async function generate(trigger) {
  if (triggerState.phase === "generating") return;
  if (!_app) return;
  const config = await loadConfig(_app);
  if (!config.endpointUrl || !config.apiKey) {
    showStatus("Codex: configure endpoint URL + API key in settings", true);
    return;
  }
  const view = _app.getActiveEditor();
  if (!view) return;
  const doc = view.state.doc;
  const { cleanPrompt, rangeFrom, rangeTo } = parseLineRange(trigger.prompt);
  let contextBlock = "";
  if (rangeFrom !== void 0 && rangeTo !== void 0) {
    const ctxDoc = view.state.doc;
    const startLine = ctxDoc.lineAt(rangeFrom);
    const endLine = ctxDoc.lineAt(rangeTo);
    const contextText = ctxDoc.sliceString(Math.max(0, trigger.suggestionFrom ?? rangeFrom), Math.min(ctxDoc.length, trigger.suggestionTo ?? rangeTo));
    contextBlock = `

[Context from lines ${startLine.number}-${endLine.number}]
${contextText}`;
  } else if (trigger.suggestionFrom && trigger.suggestionTo) {
    const contextText = doc.sliceString(trigger.suggestionFrom, trigger.suggestionTo);
    const startLine = doc.lineAt(trigger.suggestionFrom);
    const endLine = doc.lineAt(trigger.suggestionTo);
    contextBlock = `

[Context from lines ${startLine.number}-${endLine.number}]
${contextText}`;
  }
  const fullPrompt = cleanPrompt + contextBlock;
  if (localStorage.getItem("codex:debug")) {
    console.log("[Codex] Trigger payload:", {
      prompt: cleanPrompt,
      contextRange: rangeFrom !== void 0 ? `${rangeFrom}-${rangeTo}` : trigger.suggestionFrom ? `${trigger.suggestionFrom}-${trigger.suggestionTo}` : "none",
      contextLabel: rangeFrom !== void 0 ? "explicit" : trigger.suggestionFrom ? "auto-suggested" : "none",
      fullPromptLength: fullPrompt.length
    });
  }
  triggerState.phase = "generating";
  triggerState.ctrl = new AbortController();
  triggerState.errorMsg = null;
  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || void 0,
        stream: true,
        messages: [{ role: "user", content: fullPrompt }]
      }),
      signal: triggerState.ctrl.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");
    const decoder = new TextDecoder();
    let accumulated = "";
    const lineStartPos = doc.lineAt(trigger.charStart).from;
    const lineEndPos = doc.lineAt(trigger.charEnd).to;
    const insertAt = lineEndPos;
    view.dispatch({
      changes: { from: lineStartPos, to: lineEndPos, insert: "" }
    });
    let buffer = "";
    let firstToken = true;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.trim();
        if (!line || !line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content ?? parsed.content?.[0]?.text ?? parsed.response ?? "";
          if (token) {
            accumulated += token;
            const insertText = firstToken ? "\n" + token : token;
            firstToken = false;
            view.dispatch({
              changes: { from: insertAt, insert: insertText }
            });
          }
        } catch {
        }
      }
    }
    triggerState.phase = "idle";
    showStatus("Codex response complete");
  } catch (err) {
    if (err.name === "AbortError") {
      triggerState.phase = "idle";
      showStatus("Codex cancelled");
    } else {
      triggerState.phase = "error";
      triggerState.errorMsg = err.message;
      showStatus(err.message, true);
    }
  } finally {
    triggerState.ctrl = null;
  }
}
function handleKeydown(e) {
  if (e.key === "Escape" && triggerState.phase === "generating") {
    triggerState.ctrl?.abort();
  }
  if (e.key === "Tab" && triggerState.trigger && triggerState.phase === "armed") {
    e.preventDefault();
    void generate(triggerState.trigger);
    triggerState.phase = "generating";
  }
}
function codexExtension() {
  window.addEventListener("keydown", handleKeydown);
  const plugin = ViewPlugin.fromClass(class {
    destroy() {
      window.removeEventListener("keydown", handleKeydown);
    }
  }, {
    decorations: (v) => v.state.field(triggerField).decorations
  });
  return [
    triggerField,
    plugin,
    EditorView.theme({
      ".codex-trigger-indicator:hover": { opacity: "1 !important" },
      "@keyframes codex-pulse": { "0%, 100%": { opacity: "0.5" }, "50%": { opacity: "1" } }
    })
  ];
}
function buildSettingsUI(container, app) {
  container.innerHTML = `
    <div class="codex-settings" style="padding: 16px;">
      <h3>Codex Plugin Settings</h3>
      <label style="display:block;margin:8px 0;">
        <span style="display:block;font-size:12px;color:#999;">API Endpoint URL</span>
        <input type="url" id="codex-endpoint" placeholder="https://api.openai.com/v1/chat/completions"
          style="width:100%;padding:6px;margin-top:2px;border:1px solid #ccc;border-radius:4px;">
      </label>
      <label style="display:block;margin:8px 0;">
        <span style="display:block;font-size:12px;color:#999;">API Key</span>
        <input type="password" id="codex-apikey" placeholder="sk-..."
          style="width:100%;padding:6px;margin-top:2px;border:1px solid #ccc;border-radius:4px;">
      </label>
      <label style="display:block;margin:8px 0;">
        <span style="display:block;font-size:12px;color:#999;">Model (optional)</span>
        <input type="text" id="codex-model" placeholder="gpt-4o-mini"
          style="width:100%;padding:6px;margin-top:2px;border:1px solid #ccc;border-radius:4px;">
      </label>
      <button id="codex-save" style="margin-top:12px;padding:6px 16px;background:#4a90e2;color:#fff;border:none;border-radius:4px;cursor:pointer;">
        Save
      </button>
      <p id="codex-status" style="margin-top:8px;font-size:12px;color:#666;"></p>
    </div>
  `;
  loadConfig(app).then((config) => {
    const ep = container.querySelector("#codex-endpoint");
    const ak = container.querySelector("#codex-apikey");
    const md = container.querySelector("#codex-model");
    ep.value = config.endpointUrl;
    md.value = config.model;
  });
  container.querySelector("#codex-save").addEventListener("click", async () => {
    const ep = container.querySelector("#codex-endpoint");
    const ak = container.querySelector("#codex-apikey");
    const md = container.querySelector("#codex-model");
    const st = container.querySelector("#codex-status");
    const config = {
      endpointUrl: ep.value.trim(),
      apiKey: ak.value.trim(),
      model: md.value.trim()
    };
    try {
      await saveConfig(app, config);
      st.textContent = "Settings saved (encrypted).";
      st.style.color = "#4a9";
    } catch (err) {
      st.textContent = `Error: ${err.message}`;
      st.style.color = "#e5534b";
    }
  });
}
function makeCodexPlugin() {
  let removeExt = null;
  let removePanel = null;
  return {
    id: "codex",
    name: "Codex AI",
    version: "0.1.0",
    permissions: ["editor", "read-files", "write-files", "network"],
    onLoad(app) {
      _app = app;
      statusBarEl = app.addStatusBarItem();
      statusBarEl.textContent = "";
      removePanel = app.addSidebarPanel("codex-settings", "Codex Settings", (container) => {
        buildSettingsUI(container, app);
      });
      removeExt = app.addEditorExtension(codexExtension());
      window.addEventListener("codex:generate", () => {
        if (triggerState.trigger && triggerState.phase === "idle") {
          triggerState.phase = "armed";
          void generate(triggerState.trigger);
        }
      });
    },
    onUnload() {
      removeExt?.();
      removePanel?.();
      removeExt = null;
      removePanel = null;
      _app = null;
      triggerState.phase = "idle";
      triggerState.trigger = null;
      triggerState.ctrl?.abort();
    }
  };
}
var index_default = makeCodexPlugin();
export {
  index_default as default
};
