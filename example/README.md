# Welcome to Nodepad

This vault is a living demo of Nodepad and its plugins. Each folder shows one plugin in action — open the files inside to try it out.

---

## Plugins in this vault

Plugins are installed in `.nodepad/plugins/`. Open **Plugins** in the status bar to enable or disable them individually.

| Plugin | What it does |
|--------|-------------|
| **markdown** | Live WYSIWYG formatting — syntax markers hide when cursor moves away |
| **mermaid-diagrams** | Renders ` ```mermaid ``` ` blocks as interactive SVG diagrams |
| **offline-timeline** | Saves a full snapshot on every save; browse and restore past versions |
| **mindmap** | Visualises headings as a D3.js tree — open from the dock |
| **graph-view** | Force-directed graph of all `[[wikilink]]` connections across the vault |
| **spreadsheet** | Turns Markdown tables into editable grids; saves back as plain Markdown |

---

## Example files

| Folder | Start here |
|--------|-----------|
| `markdown/` | [[markdown/example\|Markdown syntax demo]] |
| `mermaid/` | [[mermaid/example\|Diagram showcase]] |
| `timeline/` | [[timeline/example\|Timeline example]] |
| `mindmap/` | [[mindmap/example-project\|Project mindmap]] |
| `graphview/` | [[graphview/example-hub\|Graph hub example]] |
| `spreadsheet/` | [[spreadsheet/example\|Spreadsheet example]] |

---

## Vault layout

```
example/
├── README.md                  ← you are here
├── markdown/                  ← Markdown plugin demo
├── mermaid/                   ← Mermaid diagrams demo
├── timeline/                  ← Offline timeline demo
├── mindmap/                   ← Mindmap plugin demo
├── graphview/                 ← Graph view demo
├── spreadsheet/               ← Spreadsheet plugin demo
└── .nodepad/
    └── plugins/               ← installed plugins (manifest.json + main.js)
```

---

## Adding your own plugins

Drop a folder containing `manifest.json` and `main.js` into `.nodepad/plugins/`, then click **Rescan** in the Plugins panel.

See [[developing-plugins]] for a full guide on writing and bundling your own plugins.
