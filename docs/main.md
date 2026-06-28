# Nodepad — Developer Knowledge Base

Part-by-part reference for developing Nodepad. Open the section you need instead of loading the whole CLAUDE.md spec every task.

---

## Read this first

- [[handoff]] — phase-by-phase: what to run, what to verify, what to build next, in order
- [[main_todo]] — current build status, corrected against what's actually implemented

## Architecture (cross-cutting, spans plugins + core)

| Topic | Note | When to read it |
|---|---|---|
| Plugin contract & App API | [[architecture/plugin-api]] | Writing or modifying a plugin, changing the App interface |
| `.nodepad/` vault folder / storage | [[architecture/storage]] | Touching workspace persistence, plugin config, timeline storage |
| CodeMirror shim pattern | [[architecture/editor]] | **Read before bundling any plugin** — skipping this breaks plugins at runtime |
| Electron desktop shell | [[architecture/electron]] | Working on the packaged app, native file I/O, the installer |

## Plugins (per-plugin status)

| Plugin | Notes | Status |
|---|---|---|
| Codex (AI assistant) | [[plugins/codex/codex]] | Not started (Phase 2–5 per [[handoff]]) |
| Cloud sync | Phase 4f, spec only in [[../CLAUDE.md|CLAUDE.md]] § Sync Plugin | Not started |
| Kanban | Phase 4g, no spec written yet | Not started |

---

## Ground rules that don't change

1. No framework — vanilla TypeScript, classes own their root `HTMLElement`
2. Files are the source of truth — no document model separate from the file on disk
3. Plugins get a restricted `App` object — never expose `src/` internals directly
4. Offline-first — no feature may block on network at startup

Full detail: [[../CLAUDE.md|CLAUDE.md]] § Key Design Decisions.
