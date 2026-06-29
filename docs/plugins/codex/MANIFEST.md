# Codex Plugin — MANIFEST

Per-plugin map. Read this before touching Codex code.

## What it does
AI writing assistant. Four interaction modes:
1. **Inline `//` trigger** (Phase 2 ✅ shipped) — type `//prompt` in editor, get AI response inline
2. **Chat sidebar** (Phase 3 🔨 active) — vault-aware conversation panel
3. **Ambient suggestions** (Phase 4) — passive insights on file open/save
4. **Structural organization** (Phase 5) — `//auto-tag`, `//find duplicates`, etc.

## Key files
| File | Role |
|---|---|
| `plugins/codex/index.ts` | Main plugin — inline trigger, panel registration, streaming, settings UI |
| `plugins/codex/config.ts` | AES-256-GCM encryption + credential load/save (shared by inline + chat) |
| `plugins/codex/chat.ts` | Chat sidebar panel — message list, input, streaming render, send |
| `plugins/codex/retrieval.ts` | Vault-grounded context: search() → top-K → readFile → token budget |
| `plugins/codex/conversation-store.ts` | Persist conversations as .md in .nodepad/codex/conversations/ |
| `plugins/codex/plugin-context.ts` | STUB — typed interface for Mindmap/Graph context, returns null |
| `plugins/codex/PLAN.md` | Full spec with all design decisions (authoritative for Phase 3+) |
| `docs/plugins/codex/codex.md` | Human-readable digest of PLAN.md |
| `docs/plugins/codex/_todo.md` | Per-phase checklist (done / not done) |
| `docs/plugins/codex/_changes.md` | Version-by-version change log |
| `example/.nodepad/plugins/codex/main.js` | Compiled bundle (esbuild output, gitignored) |
| `example/.nodepad/plugins/codex/manifest.json` | Plugin manifest (id, name, version, permissions) |

## Architecture
- **Permissions**: `editor`, `read-files`, `write-files`, `network`, `ui-panels`
- **Entry point**: `makeCodexPlugin()` → exported as default
- **Build**: `npm run build:codex` (esbuild with CM alias flags)
- **Key functions**: `detectTrigger()`, `updateTriggerDecorations()`, `generate()` (inline), `codexExtension()`, `buildSettingsUI()`, `buildChatPanel()`, `buildContext()`
- **State**: `triggerState` module-level object (inline phase machine)
- **Config**: `.nodepad/codex/credentials.enc` (AES-256-GCM encrypted)
- **Conversations**: `.nodepad/codex/conversations/<id>.md` (plugin-scoped, NOT first-class notes)
- **Retrieval**: `app.search()` → top-K files → `app.readFile()` → token-budget assembly (delegates to core VaultSearch)

## Status
- Phase 2 (inline `//`): ✅ shipped, commit `5b2bd8a`
- Phase 3 (chat sidebar): ✅ shipped — vault-aware chat, context budget, persistence
- Phase 4 (ambient): ⏳ not started
- Phase 5 (structural): ⏳ not started
