# Tasks — Master Queue

> Whole-project task queue. Per-plugin status lives in `docs/plugins/<name>/_todo.md`.
> Active phase per [[docs/handoff]]: **Phase 2 — Codex inline `//` trigger**.

---

## Current: Phase 3 — Codex chat sidebar

Not started. Spec in [[docs/handoff]] Phase 3 + `plugins/codex/PLAN.md` § Mode 2. Needs scope clarification before planning:
- What does "vault-aware" mean? Whole vault, active note + linked notes, or search-retrieved chunks?
- How is context budgeted? (token limits, truncation strategy)
- Conversation persistence: saved as `.md` note (decided), but where? Which folder?
- Hybrid context: starts with current file, expands to vault — what triggers expansion? No answer found?

## Up next (dependency order)

1. **Phase 3 scope brainstorm** — clarify vault-aware context strategy with user
2. **Phase 3 plan** — write implementation plan, show user, wait for approval
3. **Phase 3 build** — chat sidebar panel
4. **Phase 4** — Codex ambient suggestions (Insights panel)
5. **Phase 5** — Codex structural organization

## Backlog (lower priority, no spec — ask before starting)

- Cloud sync plugin (Phase 4f) — spec in [[CLAUDE.md]] § Sync Plugin
- Kanban plugin (Phase 4g)
- Auto-updater for Electron build
- Capacitor / mobile shell (Phase 6)
- One-time migration script for orphaned IndexedDB timeline snapshots
