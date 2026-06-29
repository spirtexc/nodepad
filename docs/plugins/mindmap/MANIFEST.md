# Mindmap Plugin — MANIFEST

Per-plugin map. Read this before touching Mindmap code.

## What it does
Renders the current note's Markdown headings (`#`–`######`) as an interactive
D3 tree (mindmap). Opened as a modal from the sidebar dock icon. Each heading
becomes a node; nesting follows heading level.

## Key files
| File | Role |
|---|---|
| `plugins/mindmap/index.ts` | All logic — heading parse, modal, D3 tree render, styles |

## Architecture
- **Permissions**: `read-files`, `ui-panels`
- **Entry point**: `const plugin: Plugin` → exported as default (object form)
- **API used**: `app.getActiveFile()`, `app.readFile()`, `app.addSidebarIcon()`, `app.openModal()`
- **Data source**: parses headings from the active note's content via regex. Does not read any other plugin's data.
- **UI**: modal (`.mindmap-modal`) via `app.openModal`; sidebar dock icon via `app.addSidebarIcon`. CSS injected into `document.head`, removed on unload.
- **No editor extension**.

## Status
- Shipped — no configuration.
