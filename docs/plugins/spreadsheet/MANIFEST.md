# Spreadsheet Plugin — MANIFEST

Per-plugin map. Read this before touching Spreadsheet code.

## What it does
Replaces Markdown table blocks (`| col | col |`) with an interactive
spreadsheet widget: editable cells, add/delete rows and columns, inline
Markdown rendering within cells, and an "Edit raw" mode to edit the underlying
Markdown source.

## Key files
| File | Role |
|---|---|
| `plugins/spreadsheet/index.ts` | All logic — table parse, widget, StateField, decorations, theme |

## Architecture
- **Permissions**: `editor`
- **Entry point**: `const plugin: Plugin` → exported as default (object form)
- **API used**: `app.addEditorExtension(spreadsheetField + theme)`
- **State**: single `spreadsheetField` StateField (owns editing position + decoration set). Provides decorations via `EditorView.decorations.from(f, s => s.deco)`.
- **Edit mode**: toggled via `setTableEditing` StateEffect; exits when cursor leaves the table range.
- **Widget**: `TableWidget` (WidgetType) renders an HTML `<table>` with view/input toggle per cell, a toolbar (+Row / +Col / Edit raw), and commits changes back to the document via `view.dispatch`.
- **Key handling**: cell inputs have a local `keydown` listener that calls `e.stopPropagation()` — Enter blurs, Tab navigates between cell inputs. This local stopPropagation prevents the Tab from bubbling to codex's window-level keydown handler.
- **CSS**: via `EditorView.baseTheme` (CodeMirror theme) — no global `<style>` injection.

## Status
- Shipped — no configuration.
