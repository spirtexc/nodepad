# Tasks — Master Queue

> Whole-project task queue. Per-plugin status lives in `docs/plugins/<name>/_todo.md`.
> Active phase per [[docs/handoff]]: **Phase 2 — Codex inline `//` trigger**.

---

## Current: Phase 2 — Codex inline `//` trigger

Non-started. Full plan in `docs/plugins/codex/_todo.md`. Blocked on:
- Open questions in `plugins/codex/PLAN.md` § 3b/2b (auto-suggest range, bare `//`, visual style, consecutive `//`, multi-line output)
- Phase 1 (verify `clearAllTabs()` in `src/app.ts`) not yet manually verified

## Up next (dependency order)

1. **Phase 1 verify** — manually test folder-switch clears tabs
2. **Phase 2 build** — Codex inline `//` trigger (once open questions answered)
3. **Phase 3** — Codex chat sidebar
4. **Phase 4** — Codex ambient suggestions
5. **Phase 5** — Codex structural organization

## Backlog (lower priority, no spec — ask before starting)

- Cloud sync plugin (Phase 4f) — spec in [[CLAUDE.md]] § Sync Plugin
- Kanban plugin (Phase 4g)
- Auto-updater for Electron build
- Capacitor / mobile shell (Phase 6)
- One-time migration script for orphaned IndexedDB timeline snapshots
