# Progress — Chronological Log

> Append-only. Newest last. One entry per work session.

---

## 2026-06-28 — Scaffold & Docs Migration

- Renamed existing `nodepad/` → `nodepad_old/` (reference, read-only)
- Created new `nodepad/` repo with clean git history
- Pass 1: verbatim copy all docs/* + CLAUDE.md + README.md from nodepad_old (commit `2ab53b2`)
- Pass 2: restructured into new layout:
  - `docs/nodepad-folder.md` → `docs/architecture/storage.md`
  - `docs/plugin-cm-shims.md` → `docs/architecture/editor.md`
  - `docs/core-interfaces.md` → `docs/architecture/plugin-api.md`
  - `docs/electron-desktop.md` → `docs/architecture/electron.md`
  - `docs/codex-plugin.md` → `docs/plugins/codex/codex.md`
  - `docs/tech-stack.md` → folded into `CLAUDE.md` § Tech Stack (rationale preserved)
  - `docs/main.md` → trimmed to index linking into architecture/ and plugins/
- Updated all cross-references (verified 0 stale `[[links]]` to old paths)
- Created `docs/plugins/codex/_todo.md` (Phase 2–5 checklist from handoff)
- Created `docs/plugins/codex/_changes.md` (seed, empty)
- Seeded `_agent/`: TASKS.md, PROGRESS.md (this), DECISIONS.md, blockers.md

**Checked boxes:**
- [x] No CLAUDE.md invariant violated
- [x] All docs restructured, no duplicated facts
- [x] Cross-references all point to valid new paths

**Deviations from plan:**

None — executed per approved mapping.

**Next:** User to confirm scaffold looks correct, then proceed to Phase 1 (verify `clearAllTabs()`).
