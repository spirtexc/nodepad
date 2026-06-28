# Handoff — Start Here

This is the single file to read first when picking up this project cold. It tells you what to do, in order, not just what exists. For background on *why* things are built the way they are, each phase links into [[main]]'s knowledge vault — read those notes only when you reach the phase that needs them, not all at once.

---

## Phase 0 — Orient yourself

1. Confirm you're on the right code: `git log --oneline -3` should show commit `f09193f` ("Add docs/ developer knowledge vault and phase-by-phase handoff guide") at or near the top, branch `main`.
2. Read `CLAUDE.md` at repo root (architecture spec, auto-loads in Claude Code sessions) and `README.md` (Quick Start, keyboard shortcuts).
3. If the **Superpowers** Claude Code plugin is installed in your session (`/plugin install superpowers@claude-plugins-official`), use its plan → TDD (red-green-refactor) → review workflow for the Codex plugin phases below (Phase 2–5) — they're exactly the kind of multi-step, testable feature work that workflow is built for. Not required if the plugin isn't installed; nothing here depends on it.
4. Skim [[main_todo]] — it's CLAUDE.md's phase checklist corrected against what's *actually* built. Don't trust CLAUDE.md's checklist alone; some items there are stale.
5. Run it:
   ```bash
   npm install
   npm run dev
   # open http://localhost:5173, click the folder icon, select the example/ folder
   ```
   You should see the demo vault with working tabs, a sidebar file tree, and a Timeline panel at the bottom of the sidebar (if the `offline-timeline` plugin is enabled — check the Plugins panel).

**Done when:** the app runs, the example vault opens, and you've read [[main_todo]].

---

## Phase 1 — Verify the most recent unverified change

`clearAllTabs()` in `src/app.ts` was added to fix tab/workspace state leaking between vaults, but has only been build-tested, not run-tested.

1. Open `example/` as a vault. Open 2–3 files as tabs.
2. Open a *different* folder (any folder with a few `.md` files works, doesn't need its own `.nodepad/`).
3. **Expected:** the `example/` tabs are gone, replaced by nothing (fresh folder, no `workspace.json` yet) or by that folder's own previously-saved tabs if it has a `.nodepad/workspace.json`.
4. **Bug signature if this fails:** old tabs from `example/` still showing, or the editor pane showing stale content from the previous vault.

If it's broken, the relevant code is `handleOpenFolder()` and `clearAllTabs()` in `src/app.ts` — read [[architecture/storage]] for how `workspace.json` round-trips.

**Done when:** folder switching cleanly resets tabs and restores the new folder's own workspace state.

---

## Phase 2 — Codex plugin: inline `//` trigger

Full spec: `plugins/codex/PLAN.md` (read it directly — it's outside this `docs/` vault). Digest: [[plugins/codex/codex]].

**Before writing any code:** [[architecture/editor]] — this plugin uses `addEditorExtension`, so it must be compiled with the CodeMirror `--alias` flags or it will silently break at runtime with no compile-time warning.

Build order for this phase only:
1. Detect `//` inline trigger, show the indicator widget (click or `Tab` to fire)
2. Parse `(line X-Y)` context syntax, pull those lines from the active file
3. Wire the custom-endpoint settings panel — credentials go in `.nodepad/codex.yaml`, AES-256-GCM encrypted (see [[plugins/codex/codex]] for the exact key-storage flow)
4. Streaming response, replaces `//prompt` in place when done
5. `Escape` cancels

**Before starting, these PLAN.md sub-questions are still unanswered — go back to the user, don't assume:**
- 3b-i: how the auto-suggested line range is calculated
- 3b-ii: what context is sent for a bare `//` with no range
- 2b-i: exact visual style of the trigger indicator
- 2b-ii: whether consecutive `//` lines combine into one prompt
- 2b-iv: where multi-line output goes for an inline trigger

**Done when:** typing `// <prompt>` in a note produces a custom-endpoint AI response inserted in place, with the indicator/streaming/cancel behavior all working in the actual running app — not just compiling.

---

## Phase 3 — Codex plugin: chat sidebar

Only start after Phase 2 is verified working. Spec: [[plugins/codex/codex]] § Build order, item 2.

- Sidebar panel (`ui-panels` permission, `addSidebarPanel`)
- Hybrid context: starts with current file, expands to vault-wide search if no answer found in current file alone
- Conversation saved as a `.md` note in the vault (not IndexedDB, not `localStorage` — per the user's explicit decision in PLAN.md)
- Feed in Mindmap heading tree + Graph View wikilink map as extra context when those plugins are loaded (check at runtime, no user config)

**Done when:** you can ask a question in the sidebar, get an answer grounded in vault content, and the conversation persists as a note you can reopen.

---

## Phase 4 — Codex plugin: ambient suggestions

Spec: [[plugins/codex/codex]] § Build order, item 3. Scoped deliberately to what's reliable in a browser-only app — **no AI call on file open**, just Fuse.js/backlink/timestamp checks already built into the app's existing indexes.

**Done when:** opening or saving a note can surface "related notes," "not opened in 60+ days," or "missing wikilinks" hints, all computed offline with zero added latency.

---

## Phase 5 — Codex plugin: structural organization

Spec: [[plugins/codex/codex]] § Build order, item 4. `//auto-tag`, `//find duplicates`, `//suggest links`, `//create index of this folder`, `//split this note`.

**Done when:** each of those five commands works end-to-end on a real note in the example vault.

---

## Backlog after Codex (lower priority, no current spec — ask the user before starting any of these)

- Cloud sync plugin (Phase 4f in [[main_todo]]) — full spec exists in `CLAUDE.md` § Sync Plugin
- Kanban plugin (Phase 4g)
- Auto-updater for the Electron build
- Capacitor / mobile shell (Phase 6) — nothing started, no spec written yet
- One-time migration script for orphaned old IndexedDB timeline snapshots — cosmetic cleanup, not urgent

---

## If something here looks wrong

This file and the rest of `docs/` are hand-written summaries, not generated from source automatically — they can drift. If a note here disagrees with the actual code in `src/`, `plugins/`, or `electron/`, the code wins. Fix the doc, don't fix the code to match a stale doc.
