# Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript | No `any` sprawl — restricted `App` interface is the plugin boundary |
| Build tool | Vite | `base: './'` is required — packaged Electron app loads via `file://`, absolute asset paths 404 |
| Editor | CodeMirror 6 | Singleton instance shared via `window.__nodepad_cm__` — see [[plugin-cm-shims]] |
| File I/O | File System Access API | Browser-native; Electron has a parallel path via `src/vault/electron-shim.ts` — see [[electron-desktop]] |
| Search | Fuse.js | Vault-wide fuzzy search |
| Graph/mindmap | D3.js | Force graph (graph-view) + tree layout (mindmap) |
| Diagrams | Mermaid.js | Renders fenced ` ```mermaid ``` ` blocks |
| Spreadsheet | Handsontable | Inline editable grid over Markdown tables |
| Per-vault storage | Plain files under `.nodepad/` | Replaced IndexedDB/idb-keyval for anything that should travel with the vault — see [[nodepad-folder]] |
| Desktop shell | Electron | NSIS installer; see [[electron-desktop]] |
| Mobile shell | Capacitor | Not started (Phase 6) |
| Cloud sync | Supabase | Not started (Phase 4f) |

Full original rationale: [[../CLAUDE.md|CLAUDE.md]] § Tech Stack.

**Note:** IndexedDB (`idb-keyval`) is still used for exactly one thing — remembering the `FileSystemFileHandle` of the last-opened vault so the app can reopen it without a picker dialog on launch. This is the only thing that legitimately needs to survive across vault switches; everything else moved to `.nodepad/`.
