# Graph View Plugin — MANIFEST

Per-plugin map. Read this before touching Graph View code.

## What it does
Renders an interactive D3 force-directed graph of all notes and their
`[[wikilink]]` relationships. Opened as a modal from the sidebar dock icon.
Nodes are clickable to navigate; hover highlights connected nodes/links.

## Key files
| File | Role |
|---|---|
| `plugins/graph-view/index.ts` | All logic — graph build, modal, D3 rendering, styles |

## Architecture
- **Permissions**: `read-files`, `ui-panels`
- **Entry point**: `const plugin: Plugin` → exported as default (object form, not factory)
- **API used**: `app.listFiles()`, `app.readFile()`, `app.getActiveFile()`, `app.openFile()`, `app.addSidebarIcon()`, `app.openModal()`
- **Data source**: reads note CONTENT and parses `[[wikilinks]]` via regex — does NOT use the backlink index or any other plugin's data. Discovers the link graph by scanning file text.
- **UI**: modal (`.graph-modal`) opened via `app.openModal`; sidebar dock icon via `app.addSidebarIcon`. CSS injected into `document.head` as a `<style>` element, removed on unload.
- **No editor extension**: this plugin does not touch the CodeMirror editor.

## Status
- Shipped — no configuration.
