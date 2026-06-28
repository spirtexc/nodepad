# Build Status — vs. CLAUDE.md Phases

Mirrors the Phase checklist in [[../CLAUDE.md|CLAUDE.md]], updated to reflect what's actually built as of commit `66df626`. Where reality diverged from the original plan, the divergence is called out — don't "fix" it back to the original plan without checking with the user first.

---

### Phase 1 — Core editor
- [x] Vite + TypeScript scaffold
- [x] CodeMirror 6 with Markdown extensions
- [x] File open/save via File System Access API (+ Electron `fs` fallback, see [[electron-desktop]])
- [x] Split pane editor + preview
- [x] Auto-save on idle (debounced)
- [x] Sidebar showing open files

### Phase 2 — Vault & search
- [x] Open a folder as a vault
- [x] Recursive file tree sidebar
- [x] Fuse.js search (`vaultSearch`)
- [x] `[[wiki link]]` detection + backlink index
- [x] Tag index (frontmatter-derived)
- [x] Quick switcher modal (Ctrl+P by name) — confirmed in README.md § Quick Start

### Phase 3 — Plugin API scaffold
- [x] `Plugin` / `App` interfaces — see [[core-interfaces]]
- [x] Plugin loader with dynamic loading
- [x] Permission checker (strips ungranted methods)
- [x] Error isolation per plugin load/unload
- [x] Plugin enable/disable toggle, persisted per-vault — see [[nodepad-folder]]
- [ ] Plugin settings UI panel — basic enable/disable exists; no settings-fields UI yet

### Phase 4 — Plugins
**Architectural deviation from CLAUDE.md:** plugins are no longer built into `src/` and shipped with the app. The app ships with **zero** built-in plugins. Plugins live as compiled `main.js` + `manifest.json` under a vault's `.nodepad/plugins/`, loaded at runtime. The `plugins/` folder at repo root holds TypeScript *source* for plugins the project maintains, compiled into `example/.nodepad/plugins/` for end users to copy. See [[plugin-cm-shims]] for the CodeMirror singleton requirement this introduces.

- [x] 4a. Mermaid diagrams
- [x] 4b. Offline timeline — snapshots write to `.nodepad/timeline/`, not IndexedDB
- [x] 4c. Mindmap
- [x] 4d. Graph view
- [x] 4e. Spreadsheet
- [ ] 4f. Cloud sync — not started
- [ ] 4g. Kanban — not started

### Phase 5 — Electron desktop
- [x] `electron/` main process (`main.ts`, `preload.ts`, `dev.ts`)
- [x] NSIS installer builds successfully (`npm run electron:build`)
- [x] `vite.config.ts` `base: './'` fix for `file://` asset loading
- [x] Native file open/save dialogs — `dialog.showOpenDialog` wired via `ipcMain.handle('fs:select-directory'/'fs:select-file', ...)`, consumed through `src/vault/electron-shim.ts`
- [x] System tray icon — `Tray` initialized in `electron/main.ts` `initTray()`, using `public/tray-icon.png`
- [ ] Auto-updater — not started

### Phase 6 — Mobile (Capacitor)
- [ ] Not started

---

## Active backlog (not from CLAUDE.md)

- [ ] **Codex plugin** — fully spec'd in `plugins/codex/PLAN.md`, not started. See [[codex-plugin]].
- [ ] **Verify `clearAllTabs()`** (`src/app.ts`) — opening a new folder should clear the previous folder's tabs and restore the new folder's own `.nodepad/workspace.json`. Built and packaged, not yet manually tested in the running app.
- [ ] One-time migration script for old IndexedDB timeline snapshots (orphaned after the move to `.nodepad/timeline/`) — discussed, not built. Low priority, no user has reported needing it.
