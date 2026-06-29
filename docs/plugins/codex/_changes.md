# Codex Plugin — Changes

> Version-by-version change log. Newest first.

---

## Unreleased

### 0.2.0 — Phase 3 chat sidebar

- New files: `config.ts`, `chat.ts`, `retrieval.ts`, `conversation-store.ts`, `plugin-context.ts`
- `index.ts`: registered `codex-chat` sidebar panel, added `ui-panels` permission, version 0.1.0 → 0.2.0
- `index.ts`: crypto + config logic extracted to shared `config.ts` (no duplication between inline + chat)
- `search()` added to the plugin-API `App` interface — exposes core VaultSearch as a general primitive (granted under `read-files`)
- Context budget: top-K (K=5) primary + 6000-token cap backstop; drop-lowest, never mid-file truncate
- Conversations persisted as `.md` in `.nodepad/codex/conversations/` (plugin-scoped, NOT first-class notes)
- Plugin-context stub returns null (no file sniffing); getLoggedPlugins() API logged as (B) prerequisite
- Token estimate: `length / 4` (known-imprecise for code/CJK — same shelf as Fuse keyword-not-semantic)

### 0.1.0 — Phase 2 inline `//` trigger

- Initial inline trigger, indicator widget, streaming, encryption, settings UI.
- Commit `5b2bd8a`.