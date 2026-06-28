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
| markdown | Markdown WYSIWYG rendering, code blocks, wikilink decorations | docs/plugins/markdown/MANIFEST.md |
| codex | AI writing assistant (inline //, vault chat, ambient, structural) | docs/plugins/codex/MANIFEST.md |
| graph-view | D3 graph of note links | docs/plugins/graph-view/MANIFEST.md |
| mindmap | D3 mindmap | docs/plugins/mindmap/MANIFEST.md |
| mermaid-diagrams | Mermaid rendering | docs/plugins/mermaid-diagrams/MANIFEST.md |
| offline-timeline | IndexedDB snapshots (local-only) | docs/plugins/offline-timeline/MANIFEST.md |
| spreadsheet | Tabular view | docs/plugins/spreadsheet/MANIFEST.md |

## Agent working memory
docs/architecture/  ·  docs/plugins/<name>/  ·  _agent/ (TASKS, PROGRESS, DECISIONS, blockers)
