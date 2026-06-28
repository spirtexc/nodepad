# CodeMirror Shim Pattern — Read Before Bundling Any Plugin

**This is not written down anywhere except this note and `plugins/_shims/` source comments. If you're compiling a plugin, read this first.**

## The problem

A plugin that bundles its own copy of `@codemirror/state`/`@codemirror/view`/`@codemirror/language` ends up with a **second, distinct** `EditorState`/`Extension`/etc. class, separate from the one the main app's editor uses. CodeMirror does `instanceof` checks internally when applying extensions. Two copies of the same library means the check fails:

```
Unrecognized extension value in extension set ([object Object]). This sometimes
happens because multiple instances of @codemirror/state are loaded
```

This broke `markdown`, `mermaid-diagrams`, and `spreadsheet` — all three call `app.addEditorExtension(...)`.

## The fix

1. `src/app.ts` exposes the main app's CodeMirror modules as a global, set in the constructor:

```typescript
import * as _cmState from '@codemirror/state'
import * as _cmView from '@codemirror/view'
import * as _cmLanguage from '@codemirror/language'
;(window as any).__nodepad_cm__ = { state: _cmState, view: _cmView, language: _cmLanguage }
```

2. `plugins/_shims/` contains three re-export files that read from that global instead of `node_modules`:

```typescript
// plugins/_shims/codemirror-state.ts
const mod = (window as any).__nodepad_cm__.state as typeof import('@codemirror/state')
export const { EditorState, StateField, StateEffect, RangeSetBuilder, ... } = mod
export type { Extension, ... } from '@codemirror/state'
```

(Same pattern for `codemirror-view.ts` and `codemirror-language.ts`.)

3. Every plugin must be **compiled** with esbuild `--alias` flags redirecting the real package names to these shims:

```bash
npx esbuild plugins/<name>/index.ts --bundle --format=esm \
  --alias:@codemirror/state=./plugins/_shims/codemirror-state.ts \
  --alias:@codemirror/view=./plugins/_shims/codemirror-view.ts \
  --alias:@codemirror/language=./plugins/_shims/codemirror-language.ts \
  --outfile=example/.nodepad/plugins/<name>/main.js
```

The plugin's own source still writes normal imports (`import { EditorState } from '@codemirror/state'`) — the alias is purely a build-time redirect. Nothing in plugin source code needs to know about the shims.

## When this matters

- Any plugin using `addEditorExtension`, or importing types from `@codemirror/state`/`view`/`language` for any reason
- Plugins that don't touch CodeMirror at all (e.g. a plugin only using `read-files`/`ui-panels`) don't need the alias flags — but adding them is harmless, so the safe default is to always include all three `--alias` flags in the compile command.

## If you forget this

The plugin will load without error in the loader (permission checks pass), but will throw at the point it tries to register a CodeMirror extension, usually visible in the console as the "multiple instances" error above. If a plugin behaves correctly except for editor-extension features, recompile it with the alias flags first before debugging anything else.
