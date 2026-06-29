# Mermaid Diagrams Plugin — MANIFEST

Per-plugin map. Read this before touching Mermaid code.

## What it does
Replaces ` ```mermaid ` fenced code blocks in the editor with live-rendered
diagram widgets. Supports an edit mode (toggle via toolbar button or double-click)
that shows the raw code with a live preview alongside.

## Key files
| File | Role |
|---|---|
| `plugins/mermaid-diagrams/index.ts` | Plugin entry — registers the editor extension |
| `plugins/mermaid-diagrams/mermaid-widget.ts` | Widget classes, StateField, decorations, context menu |

## Architecture
- **Permissions**: `editor`
- **Entry point**: `const plugin: Plugin` → exported as default (object form)
- **API used**: `app.addEditorExtension(mermaidWidgets)`
- **State**: single `mermaidField` StateField (owns both editing position and decoration set to avoid inter-field ordering issues). Provides decorations via `EditorView.decorations.from(f, s => s.deco)`.
- **Edit mode**: tracked by `setMermaidEditing` StateEffect + a `ViewPlugin` cursor watcher that exits edit mode when the cursor leaves the active block.
- **Rendering**: calls `mermaid.render()` on widget creation; debounced live preview in edit mode.
- **CSS**: injected via `EditorView.baseTheme` (CodeMirror theme) — no global `<style>` injection.

## Status
- Shipped — no configuration.
