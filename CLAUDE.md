# PKM App — Claude Code Project Context

> This file is the single source of truth for this project.
> Claude Code reads it automatically on every session.

---

## What We Are Building

A privacy-first, local-first personal knowledge management (PKM) app
similar to Obsidian and SiYuan. Users write notes in Markdown, files are
stored as plain `.md` files on disk, and optional plugins extend
functionality with mindmaps, graph views, spreadsheets, sync, and more.

**Core principles:**

- No proprietary file format — plain `.md` files, always
- No heavy framework — vanilla TypeScript only (no React, Vue, or Angular)
- No required backend — the core app runs entirely in the browser
- Plugin-first architecture — every feature beyond the editor is a plugin
- Offline-first — everything works without internet

---

## Tech Stack

| Layer         | Choice                 | Reason                                       |
| ------------- | ---------------------- | -------------------------------------------- |
| Language      | TypeScript             | Type safety, same as Obsidian                |
| Build tool    | Vite                   | Fast HMR, simple config. **`base: './'` is required** — packaged Electron app loads via `file://`; absolute asset paths 404 without it |
| Editor        | CodeMirror 6           | Same engine as Obsidian, handles MD natively. **Singleton instance** shared via `window.__nodepad_cm__` — plugins MUST NOT bundle their own copy (see [[docs/architecture/editor]]) |
| File I/O      | File System Access API | Browser-native, no backend needed. Electron has a parallel path via `src/vault/electron-shim.ts` |
| Search        | Fuse.js                | Lightweight fuzzy search                     |
| Graph/mindmap | D3.js                  | Force graph + tree layouts                   |
| Diagrams      | Mermaid.js             | Fenced code block rendering                  |
| Spreadsheet   | Handsontable           | Inline table editing                         |
| Per-vault storage | Plain files under `.nodepad/` | Replaced IndexedDB/idb-keyval for anything that should travel with the vault (copyable, portable, survive reinstall). IndexedDB is used for **exactly one thing**: remembering the `FileSystemFileHandle` of the last-opened vault so the app can relaunch without a picker |
| Desktop shell | Electron (Phase 5)     | NSIS installer; native dialogs via IPC       |
| Mobile shell  | Capacitor (Phase 6)    | Same codebase in a WebView                   |
| Cloud sync    | Supabase (plugin)      | Realtime WebSocket + storage (Phase 4f, not started) |

---

## Project Folder Structure

````
my-pkm/
├── CLAUDE.md                  ← you are here
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.ts                ← entry point, boots the App
│   ├── app.ts                 ← App class, the central hub
│   │
│   ├── editor/
│   │   ├── index.ts           ← creates and exports EditorView
│   │   ├── extensions.ts      ← CodeMirror extension config
│   │   ├── markdown.ts        ← MD syntax, live preview logic
│   │   └── keymaps.ts         ← keyboard shortcuts
│   │
│   ├── layout/
│   │   ├── index.ts           ← root layout manager
│   │   ├── sidebar.ts         ← file tree sidebar
│   │   ├── tabs.ts            ← multi-tab manager
│   │   ├── split.ts           ← resizable split panes
│   │   └── statusbar.ts       ← bottom status bar
│   │
│   ├── vault/
│   │   ├── index.ts           ← Vault class, opens a folder
│   │   ├── file-tree.ts       ← recursive file tree builder
│   │   ├── search.ts          ← Fuse.js index + query
│   │   ├── backlinks.ts       ← [[wiki link]] parser + index
│   │   └── frontmatter.ts     ← YAML frontmatter parser
│   │
│   ├── plugin-api/
│   │   ├── index.ts           ← Plugin interface + App interface
│   │   ├── loader.ts          ← dynamic plugin loader
│   │   └── registry.ts        ← installed plugin registry
│   │
│   └── utils/
│       ├── id.ts              ← UUID generation
│       ├── device.ts          ← stable device ID
│       └── debounce.ts        ← debounce/throttle helpers
│
└── plugins/
    ├── offline-timeline/
    │   ├── index.ts
    │   └── ui/
    │       └── timeline-panel.ts
    ├── cloud-sync/
    │   ├── index.ts
    │   ├── queue.ts           ← offline queue
    │   ├── websocket.ts       ← Supabase realtime
    │   └── ui/
    │       └── review-panel.ts
    ├── mindmap/
    │   └── index.ts           ← D3.js tree from headings
    ├── graph-view/
    │   └── index.ts           ← D3.js force graph from [[links]]
    ├── spreadsheet/
    │   └── index.ts           ← Handsontable in fenced blocks
    ├── mermaid-diagrams/
    │   └── index.ts           ← renders ```mermaid blocks
    └── kanban/
        └── index.ts           ← - [ ] task lists as board
````

---

## Core Interfaces

### Plugin contract

Every plugin must implement this interface:

```typescript
export interface Plugin {
  id: string;
  name: string;
  version: string;
  permissions: Permission[];
  onLoad(app: App): void | Promise<void>;
  onUnload(): void | Promise<void>;
}
```

### App API (what plugins can call)

The `App` object is passed to every plugin on load. This is the ONLY
way plugins interact with the core. Do not expose internals directly.

```typescript
export interface App {
  // Editor
  getActiveEditor(): EditorView | null;
  replaceSelection(text: string): void;
  getActiveFile(): VaultFile | null;

  // Vault / files
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(folder?: string): VaultFile[];
  getBacklinks(path: string): VaultFile[];

  // UI
  registerView(id: string, factory: (container: HTMLElement) => View): void;
  addSidebarIcon(icon: string, title: string, onClick: () => void): void;
  addCommand(cmd: Command): void;
  addMenuItem(label: string, onClick: () => void): void;
  addStatusBarItem(): HTMLElement;
  openModal(content: HTMLElement): () => void; // returns close fn

  // Events
  onFileOpen(cb: (file: VaultFile) => void): Unsubscribe;
  onFileChange(cb: (file: VaultFile) => void): Unsubscribe;
  onFileSave(cb: (file: VaultFile) => void): Unsubscribe;
  onOnline(cb: () => void): Unsubscribe;
  onOffline(cb: () => void): Unsubscribe;
}
```

### Permission system

Plugins declare what they need. The loader checks before granting access.
If a permission is not declared, the App object omits that method entirely.

```typescript
export type Permission =
  | "read-files" // can call readFile()
  | "write-files" // can call writeFile()
  | "network" // can make fetch() requests
  | "ui-panels" // can call registerView(), addSidebarIcon()
  | "commands" // can call addCommand()
  | "editor"; // can call getActiveEditor(), replaceSelection()
```

---

## Build Phases

### Phase 1 — Core editor (build first, everything else depends on this)

- [ ] Vite + TypeScript project scaffold
- [ ] CodeMirror 6 with Markdown extensions
- [ ] File open / save via File System Access API
- [ ] Split pane: editor (left) + rendered preview (right)
- [ ] Auto-save on idle (debounced 1000ms)
- [ ] Basic sidebar showing open files

### Phase 2 — Vault & search

- [ ] Open a folder as a "vault" (directory picker)
- [ ] Recursive file tree in sidebar (folders + .md files)
- [ ] Fuse.js full-text search across all vault files
- [ ] `[[wiki link]]` detection and backlink index
- [ ] YAML frontmatter parser (tags, title, date)
- [ ] Quick switcher modal (Ctrl+P opens file by name)

### Phase 3 — Plugin API scaffold

- [ ] Define Plugin and App interfaces in `src/plugin-api/`
- [ ] Plugin loader: dynamic `import()` from `/plugins/` folder
- [ ] Permission checker in loader (strips methods not in permissions[])
- [ ] Error isolation: each plugin load/unload wrapped in try/catch
- [ ] Plugin settings panel in UI
- [ ] Plugin enable/disable toggle

### Phase 4 — Plugins (build in this order)

**4a. Mermaid diagrams** — easiest, no App API needed beyond editor

- Detect ` ```mermaid ``` ` blocks in preview
- Render via mermaid.js

**4b. Offline timeline** (requires `write-files`, `read-files`)

- On every `onFileSave` event: write snapshot to IndexedDB
- Timeline panel UI: scrollable list of past versions
- Restore button: writes selected snapshot back to file

**4c. Mindmap** (requires `read-files`, `ui-panels`)

- Parse active file headings into a tree structure
- Render with D3.js tree layout in a new panel

**4d. Graph view** (requires `read-files`, `ui-panels`)

- Index all `[[wiki links]]` across vault
- Render with D3.js force-directed graph
- Click node to open file

**4e. Spreadsheet** (requires `editor`)

- Detect Markdown tables in editor
- Replace with Handsontable inline widget
- Serialize back to Markdown on change

**4f. Cloud sync** (requires `read-files`, `write-files`, `network`, `ui-panels`)

- See full spec below

**4g. Kanban** (requires `editor`, `read-files`)

- Parse `- [ ]` / `- [x]` task lists into a board view

### Phase 5 — Electron desktop wrapper

- [ ] Add `electron/` directory with main process
- [ ] Replace File System Access API with Node.js `fs` module
- [ ] Native file open/save dialogs
- [ ] System tray icon
- [ ] Auto-updater

### Phase 6 — Mobile (Capacitor)

- [ ] Wrap the Vite web app with Capacitor
- [ ] Replace File System Access API with Capacitor Filesystem plugin
- [ ] Mobile-optimised layout (single pane, bottom toolbar)

---

## Sync Plugin — Full Spec

This is a two-plugin system. Users can install either or both.

### Plugin A: `offline-timeline`

Saves a full snapshot of every file to IndexedDB on every save.
Works entirely offline, no cloud required.

```typescript
interface Snapshot {
  id: string; // UUID
  fileId: string; // vault-relative path
  content: string; // full file content at this point in time
  timestamp: number; // Date.now()
  deviceId: string; // stable ID for this device
}
```

Storage key pattern: `snapshots:{fileId}:{timestamp}`

UI: A timeline panel (sidebar panel) showing snapshots for the
currently open file. Each entry shows timestamp + first line of
content. "Restore" button writes the snapshot back.

### Plugin B: `cloud-sync`

Requires `offline-timeline` to be installed (shares the snapshot model).
Pushes snapshots to Supabase when online. Delivers diffs to other
devices via Supabase Realtime WebSocket.

**Online behaviour:**

1. `onFileSave` fires → snapshot written to IndexedDB (by timeline plugin)
2. Cloud sync reads the new snapshot and POSTs to Supabase
3. Supabase broadcasts to all other connected devices via Realtime

**Offline behaviour:**

1. `onFileSave` fires → snapshot written to IndexedDB only
2. Cloud sync adds snapshot ID to an offline queue (also in IndexedDB)
3. On `window online` event → flush the queue in order, oldest first

**Receiving changes (Device B):**

1. Supabase Realtime delivers a diff payload
2. Plugin computes a line-by-line diff (use `diff` npm package)
3. Review panel opens as a modal or sidebar panel

**Review panel UI (the "tick to accept" UX):**
Each changed line is shown as a diff row, exactly like a GitHub PR review:

```
file: project-notes.md     3 changes incoming from Device A

  line 4   - old text here
            + new text here           [✓] accept   [✗] reject

  line 12  + new line added           [✓] accept   [✗] reject

  line 18  - this line removed        [✓] accept   [✗] reject

            [Apply selected (2/3)]    [Accept all]    [Reject all]
```

"Apply selected" merges only the ticked lines. Non-ticked lines stay
as they are on Device B. After merge, a new snapshot is written
locally and pushed to cloud so all devices converge.

**Conflict detection:**
If Device B has also edited the same file while offline, show a
three-way diff: Device A version | Base (last common snapshot) |
Device B version. User resolves line by line.

**Supabase schema (minimal):**

```sql
create table snapshots (
  id uuid primary key,
  file_id text not null,        -- vault-relative path
  device_id text not null,
  content text not null,
  created_at timestamptz default now()
);

create table devices (
  id text primary key,          -- stable device UUID
  user_id uuid references auth.users,
  name text,
  last_seen timestamptz
);
```

---

## CodeMirror 6 Setup Notes

Always use these extensions as a baseline:

```typescript
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

const state = EditorState.create({
  doc: initialContent,
  extensions: [
    basicSetup,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    // add custom extensions here
  ],
});
```

For live preview (WYSIWYG), use the `@codemirror/view` `Decoration`
API to hide Markdown syntax when the cursor is not on that line.
Do not use a separate preview pane for WYSIWYG — decorate in place.

For a separate rendered preview pane, use `marked` or `markdown-it`
to convert the editor content to HTML on every change (debounced).

---

## File System Access API Notes

```typescript
// Open a single file
const [handle] = await window.showOpenFilePicker({
  types: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }],
});
const file = await handle.getFile();
const content = await file.text();

// Save a file
const writable = await handle.createWritable();
await writable.write(content);
await writable.close();

// Open a folder (vault)
const dirHandle = await window.showDirectoryPicker();
// then recursively call dirHandle.entries() to walk the tree
```

Store `FileSystemFileHandle` references in IndexedDB so the app
can reopen files without a new picker on next launch. Use the
`idb-keyval` package for simple IndexedDB key-value storage.

---

## Styling Conventions

- Use CSS custom properties for all colours (theme support)
- No CSS-in-JS, no Tailwind — plain `.css` files per component
- Dark mode via `[data-theme="dark"]` on `<html>`
- Font: system UI stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border: rgba(0, 0, 0, 0.1);
  --accent: #4a90e2;
}

[data-theme="dark"] {
  --bg-primary: #1e1e2e;
  --bg-secondary: #181825;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --border: rgba(255, 255, 255, 0.1);
  --accent: #89b4fa;
}
```

---

## Key Design Decisions (do not change without discussion)

1. **No framework** — vanilla TypeScript. Components are classes that
   own a root `HTMLElement`. No virtual DOM. This keeps the bundle
   small and the editor fast.

2. **Plugin isolation** — plugins receive a restricted `App` object.
   They cannot import from `src/` directly. If a plugin needs something
   not in the API, extend the API, do not break encapsulation.

3. **Files are source of truth** — there is no internal document model
   separate from the file. The editor's content IS the file. Saving
   means writing to disk. No in-memory object graph.

4. **Snapshots not diffs** — the timeline plugin stores full file
   content per snapshot, not diffs. Storage is cheap. Full snapshots
   make restore trivially simple and avoid compounding diff errors.

5. **Offline first** — every feature must work without network. Cloud
   sync is additive. The app must never show a loading spinner waiting
   for cloud on startup.

---

## Commands Reference

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Build Electron app (Phase 5)
npm run electron:build
```

---

## Where to Start (Phase 1 Checklist)

When starting a new session, begin here:

```
1. Scaffold Vite + TypeScript project
2. Install: codemirror @codemirror/lang-markdown @codemirror/view
            @codemirror/state @codemirror/language-data idb-keyval
3. Create src/editor/index.ts — basic CodeMirror 6 setup
4. Create src/layout/split.ts — resizable two-pane layout
5. Create src/layout/sidebar.ts — file list sidebar
6. Wire File System Access API for open + save in src/vault/index.ts
7. Connect editor content to live Markdown preview in right pane
8. Add auto-save (debounced 1000ms) on editor change
```

Target for end of Phase 1: open a .md file, edit it, see live
preview on the right, save with Ctrl+S, sidebar shows open files.
