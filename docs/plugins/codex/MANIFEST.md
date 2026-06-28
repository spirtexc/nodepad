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
| `plugins/codex/index.ts` | Main plugin — trigger detection, widget, generate(), settings UI, streaming |
| `plugins/codex/PLAN.md` | Full spec with all design decisions (authoritative for Phase 3+) |
| `docs/plugins/codex/codex.md` | Human-readable digest of PLAN.md |
| `docs/plugins/codex/_todo.md` | Per-phase checklist (done / not done) |
| `docs/plugins/codex/_changes.md` | Version-by-version change log |
| `example/.nodepad/plugins/codex/main.js` | Compiled bundle (esbuild output, gitignored) |
| `example/.nodepad/plugins/codex/manifest.json` | Plugin manifest (id, name, version, permissions) |

## Architecture
- **Permissions**: `editor`, `read-files`, `write-files`, `network`
- **Entry point**: `makeCodexPlugin()` → exported as default
- **Build**: `npm run build:codex` (esbuild with CM alias flags)
- **Key functions**: `detectTrigger()`, `updateTriggerDecorations()`, `generate()`, `codexExtension()`, `buildSettingsUI()`
- **State**: `triggerState` module-level object (phase, trigger, abort controller)
- **Config**: `.nodepad/codex/credentials.enc` (AES-256-GCM encrypted)

## Status
- Phase 2 (inline `//`): ✅ shipped, commit `5b2bd8a`
- Phase 3 (chat sidebar): 🔨 active — scope being defined
- Phase 4 (ambient): ⏳ not started
- Phase 5 (structural): ⏳ not started
