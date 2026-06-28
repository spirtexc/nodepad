# Nodepad — Developer Knowledge Base

This is a part-by-part knowledge vault for developing Nodepad itself (not the example/ vault, which is end-user-facing demo content).

**Why this exists:** [[../CLAUDE.md|CLAUDE.md]] at the repo root holds the full spec and auto-loads on every session — but reading the whole thing for every small task wastes context. Open one note here for the part you're touching instead.

---

## Read this first

- [[handoff]] — phase-by-phase, hands-on: what to run, what to verify, what to build next, in order
- [[main_todo]] — current build status, checked off against what's actually implemented (not the original CLAUDE.md plan, which has since diverged in places)

## Pick a topic

| Topic | Note | When to read it |
|---|---|---|
| Tech stack | [[tech-stack]] | Picking a library, confirming a dependency choice |
| Plugin contract & App API | [[core-interfaces]] | Writing or modifying a plugin, changing the App interface |
| `.nodepad/` vault folder | [[nodepad-folder]] | Touching workspace persistence, plugin config, timeline storage |
| CodeMirror shim pattern | [[plugin-cm-shims]] | **Read before bundling any plugin** — skipping this breaks plugins at runtime |
| Electron desktop shell | [[electron-desktop]] | Working on the packaged app, native file I/O, the installer |
| Codex plugin (next task) | [[codex-plugin]] | Starting the AI-assistant plugin |

---

## Ground rules that don't change

1. No framework — vanilla TypeScript, classes own their root `HTMLElement`
2. Files are the source of truth — no document model separate from the file on disk
3. Plugins get a restricted `App` object — never expose `src/` internals directly
4. Offline-first — no feature may block on network at startup

Full detail on these: [[../CLAUDE.md|CLAUDE.md]] § Key Design Decisions.
