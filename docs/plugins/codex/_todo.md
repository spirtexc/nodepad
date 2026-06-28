# Codex Plugin — Todo

> Derived from [[handoff]] Phase 2–5 and `plugins/codex/PLAN.md`.
> Last reconciled: 2026-06-28 against commit `f09193f`.

## Phase 2 — Inline `//` trigger (current)

- [ ] Detect `//` inline trigger, show indicator widget (click or `Tab` to fire)
- [ ] Parse `(line X-Y)` context syntax, pull those lines from the active file
- [ ] Wire custom-endpoint settings panel (credentials in `.nodepad/codex.yaml`, AES-256-GCM encrypted)
- [ ] Streaming response, replaces `//prompt` in place when done
- [ ] `Escape` cancels

**Open questions (go back to user, don't assume):**
- 3b-i: how the auto-suggested line range is calculated
- 3b-2: what context is sent for a bare `//` with no range
- 2b-i: exact visual style of the trigger indicator
- 2b-ii: whether consecutive `//` lines combine into one prompt
- 2b-iv: where multi-line output goes for an inline trigger

## Phase 3 — Chat sidebar

- [ ] Sidebar panel (`ui-panels` permission, `addSidebarPanel`)
- [ ] Hybrid context: starts with current file, expands to vault-wide search
- [ ] Conversation saved as a `.md` note in the vault
- [ ] Feed in Mindmap heading tree + Graph View wikilink map as extra context when those plugins are loaded

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
