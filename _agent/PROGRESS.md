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

## 2026-06-29 — Recovery event (code intact, docs restored)

- 6 docs deleted from working tree (unstaged): codex-plugin, core-interfaces, electron-desktop, nodepad-folder, plugin-cm-shims, tech-stack. Restored via `git restore` from HEAD.
- nodepad_old/src confirmed intact (not lost).
- Migration verified against sign-off `5b2bd8a`: `plugins/codex/index.ts` byte-identical. All five Phase 2 features present (multi-line, smart range <30, line-below output, charStart/charEnd, codex:debug). nodepad_old is stale pre-rebuild code, not a valid reference.
- Root cause: earlier damage check compared against nodepad_old as ground truth and inverted the verdict. Corrected to use sign-off commit as sole reference (per SOUL.md: map wrong → fix, don't follow).

## 2026-06-29 — Phase 3 Codex chat sidebar shipped

- New files: `plugins/codex/{config,chat,retrieval,conversation-store,plugin-context}.ts`
- `plugins/codex/index.ts`: sidebar panel `codex-chat` registered; crypto/config extracted to shared `config.ts`; version 0.1.0 → 0.2.0; added `ui-panels` permission
- `src/plugin-api/index.ts` + `src/app.ts` + `src/plugin-api/loader.ts`: new `search(query, options?)` method exposing core VaultSearch to plugins (general primitive, granted under `read-files`). Return shape `{ path, name, score, excerpt? }` — path-only so consumers readFile() top-K on demand
- Context budget: top-K (K=5) primary control + token cap (6000) backstop; current-note-exceeds-budget branch truncates current note + skips search; drop-lowest, never mid-file truncate
- Conversations: `plugins/codex/conversation-store.ts` persists as `.md` in `.nodepad/codex/conversations/` (plugin-scoped, NOT first-class notes)
- Plugin-context stub: returns null, no file sniffing (correction: killed the planned probe() back door)
- Compatibility (A) closed: 6 missing MANIFESTs built, INDEX re-routed, two (B) prerequisites logged (keybinding arbitration, permission gating) + third (getLoadedPlugins())
- Known limitation: char/4 token estimate (imprecise for code/CJK — same shelf as Fuse keyword-not-semantic)
- Build verified: tsc clean, vite build 13.93s
- Phase 2 untouched: `git diff 5b2bd8a -- plugins/codex/index.ts` empty

**Next:** Phase 4 — ambient suggestions (Fuse.js/backlinks/timestamps, offline-only, gated insights panel).