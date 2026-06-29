# Codex Plugin — Todo

> Derived from [[handoff]] Phase 2–5 and `plugins/codex/PLAN.md`.
> Last reconciled: 2026-06-28 against commit `f09193f`.

## Phase 2 — Inline `//` trigger (current)

- [ ] Detect `//` inline trigger, show indicator widget (click or `Tab` to fire)
- [ ] Parse `(line X-Y)` context syntax, pull those lines from the active file
- [ ] Wire custom-endpoint settings panel (credentials in `.nodepad/codex.yaml`, AES-256-GCM encrypted)
- [ ] Streaming response, replaces `//prompt` in place when done
- [ ] `Escape` cancels

**Open questions — ALL ANSWERED (2026-06-28):**
- 3b-i: **d) Smart** — short note → whole note, long note → surrounding paragraph (< 30 lines threshold)
- 3b-ii: **d) Same as auto-suggested range** — bare `//` uses the ghost suggestion
- 2b-i: **c) Subtle pill button** — `[ ↵ generate ]` as CodeMirror decoration
- 2b-ii: **a) Yes** — consecutive `//` lines combine into one prompt
- 2b-iv: **b) Insert below** — multi-line output on new lines below current line
- 13c (bonus): **c) Insights panel** — dedicated sidebar panel for ambient suggestions

## Phase 3 — Chat sidebar

- [x] Sidebar panel (`ui-panels` permission, `addSidebarPanel`)
- [x] Hybrid context: starts with current file, expands to vault-wide search
- [x] Fuse.js retrieval via core `app.search()` (one-pass; reuses VaultSearch)
- [x] Context budget: top-K (K=5) primary + token cap (6000) backstop; drop-lowest, never mid-file truncate
- [x] Conversation saved as `.md` in `.nodepad/codex/conversations/`
- [x] Feed in Mindmap heading tree + Graph View wikilink map — interface STUBBED (returns null; needs getLoadedPlugins() API)

## Phase 4 — Ambient suggestions

- [ ] Passive suggestions on file open/save (not a background process)
- [ ] "Related notes" via Fuse.js/backlinks/timestamps
- [ ] "Not opened in 60+ days" hint
- [ ] "Missing wikilinks" hint
- [ ] All computed offline, zero added latency

## Phase 5 — Structural organization

- [ ] `//auto-tag`
- [ ] `//find duplicates`
- [ ] `//suggest links`
- [ ] `//create index of this folder`
- [ ] `//split this note`
