# Codex Plugin — Next Task

Full spec with all design questions answered: `plugins/codex/PLAN.md` (plain path, not a wikilink — that file lives outside this `docs/` vault). Read that file directly before starting; this note is a digest, not a replacement.

**Status: not started.**

## What it is

An inline AI assistant triggered by typing `//` in the editor — answers questions, summarizes, explains — plus three later phases (chat sidebar, ambient suggestions, structural organization).

## Key decisions already locked in (from PLAN.md)

- **Trigger:** `//` anywhere inline, e.g. `The capital of France is //answer`
- **Indicator:** small widget at end of line/prompt — click or `Tab` to trigger generation
- **Output:** `//prompt` replaced in place with the result; `//` marker removed
- **Context:** explicit `(line X-Y)` range syntax in the prompt, parsed out before sending; auto-suggested range shown as ghost text, acceptable with `→`
- **AI provider:** custom endpoint — user supplies URL + key, not hardcoded to Anthropic/OpenAI/Ollama
- **Credentials:** stored in `.nodepad/codex.yaml`, AES-256-GCM encrypted via Web Crypto (`crypto.subtle`); encryption key generated on first run, stored in IndexedDB
- **`.nodepad/` config convention (applies to ALL plugins, not just Codex):** one YAML file per plugin under `.nodepad/`, sensitive values encrypted, non-sensitive plaintext — see [[architecture/storage]] for how this fits the existing `.nodepad/` layout (note: existing core uses JSON, not YAML — Codex introduces YAML as a plugin-local choice, doesn't change the core convention)
- **Streaming:** yes, token-by-token, with a loading placeholder until the first token arrives
- **Multi-line output:** wrapped as a Markdown block (blockquote/code fence)
- **Cancellation:** `Escape` key
- **Cross-note context:** yes — backlinks/wikilinks referenced in the current note are included
- **Errors:** status bar / toast message with detail

## Build order (4 phases, from PLAN.md § 13)

1. **Reactive inline `//` trigger** — build first
2. **Chat sidebar** — vault-aware conversation, hybrid context (current file → expands to vault), saved as a `.md` note in the vault
3. **Ambient suggestions** — passive, triggered on file open/save only (not a true background process), scoped to what Fuse.js/backlinks/timestamps can do offline; no AI call on every file open
4. **Structural organization** — `//auto-tag`, `//find duplicates`, `//suggest links`, `//create index`, `//split this note`

Plugin context sources (alongside Phase 2): Mindmap (heading tree) and Graph View (wikilink map) feed structured context into Codex's prompts when those plugins are installed — Codex checks for them at runtime, no user config needed.

## Open questions in PLAN.md not yet answered

A few `3b-*` and `2b-*` follow-up questions in the file are still blank (auto-suggest range calculation method, bare `//` with no range, multi-line `//` prompt handling, indicator visual style). Don't assume defaults — go back to the user for these before implementing the affected behavior.

## Relevant existing infrastructure to reuse

- [[architecture/editor]] — Codex will need `addEditorExtension` (`editor` permission) for the inline widget/ghost text, so it must be compiled with the CM alias flags
- [[architecture/plugin-api]] — `readConfig`/`writeConfig` already exist for `.nodepad/`-backed plugin settings; Codex's encrypted YAML file can sit alongside these or use them directly for the non-sensitive parts
