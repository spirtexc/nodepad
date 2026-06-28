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

## 2026-06-28 — Phase 2 Codex inline // trigger shipped

- Implemented 5 changes in `plugins/codex/index.ts`:
  1. Multi-line `//` combining — consecutive `//` lines merge into one prompt (Q4=a)
  2. Smart range suggestion — <30 lines → whole note, ≥30 → paragraph (Q1=d)
  3. Multi-line output inserted on new lines below trigger (Q5=b)
  4. `detectTrighet` → `detectTrigger` rename + `lineStart/lineEnd` → `charStart/charEnd` rename
  5. `TriggerWidget` constructor fix (separated from `toDOM`) + dead code removal
- Debug log gated behind `localStorage.getItem('codex:debug')` — kept for future phases, not deleted
- Verified: tsc clean, esbuild bundle 22.1kb, 3 logic test cases pass (combining/short-note/collision)
- Commit: `5b2bd8a`

**Checked boxes:**
- [x] No CLAUDE.md invariant violated
- [x] All 5 PLAN.md decisions implemented and verified
- [x] Two-stage review passed (spec compliance + code quality)
- [x] Cross-references correct, dead code removed

**Deviations from plan:**
- Two-stage review done manually (not via subagent) — `delegate_task` unavailable in terminal session
- `charStart`/`charEnd` rename added after review caught the misnomer (cost a verification round)

**Next:** Phase 3 — Codex chat sidebar. Read handoff.md Phase 3 spec, brainstorm scope with user (vault-aware context strategy, context budgeting), then plan.
