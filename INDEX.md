# Nodepad — Project Map (INDEX)

Root router for AI-assisted work. Read this first, then the relevant MANIFEST,
then only the target code file. Do not read the whole codebase.

## What Nodepad is
A local-first, plugin-first Markdown PKM app. The core is a minimal file
substrate + plugin host. **Plugins are the product.** Invariants & stack: see
CLAUDE.md. Cross-cutting design: see docs/architecture/.

## Core (src/) — minimal substrate, knows files + relationships, not "notes"
- Vault (files, FS Access API), VaultSearch (Fuse.js), BacklinkIndex, TagsIndex,
  Editor (CodeMirror host), TabManager, Sidebar, StatusBar.
- Plugin contract → docs/architecture/plugin-api.md (the spine — guard carefully).

## Plugins (each links to its MANIFEST)
| Plugin | What it does | Map |
|---|---|---|
| markdown | Markdown WYSIWYG rendering, code blocks, wikilink decorations | [[docs/plugins/markdown/MANIFEST]] |
| codex | AI writing assistant (inline //, vault chat, ambient, structural) | [[docs/plugins/codex/MANIFEST]] |
| graph-view | D3 force-directed graph of [[wikilinks]] | [[docs/plugins/graph-view/MANIFEST]] |
| mindmap | D3 tree of note headings | [[docs/plugins/mindmap/MANIFEST]] |
| mermaid-diagrams | Mermaid diagram rendering + edit mode | [[docs/plugins/mermaid-diagrams/MANIFEST]] |
| offline-timeline | Save snapshots in sidebar panel (local-only) | [[docs/plugins/offline-timeline/MANIFEST]] |
| spreadsheet | Interactive Markdown table editor | [[docs/plugins/spreadsheet/MANIFEST]] |

## Agent working memory
docs/architecture/  ·  docs/plugins/<name>/  ·  _agent/ (TASKS, PROGRESS, DECISIONS, blockers)
