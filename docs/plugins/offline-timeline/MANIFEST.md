# Offline Timeline Plugin — MANIFEST

Per-plugin map. Read this before touching Timeline code.

## What it does
Takes automatic snapshots of files on every save and shows them in a sidebar
panel ("Timeline"). Users can restore a previous snapshot or compare two
snapshots side-by-side. All data is local-only (IndexedDB via the config API);
no network, no cloud.

## Key files
| File | Role |
|---|---|
| `plugins/offline-timeline/index.ts` | Plugin entry — subscribes to file events, manages panel, snapshot I/O |
| `plugins/offline-timeline/ui/timeline-panel.ts` | Timeline panel UI builder |
| `plugins/offline-timeline/README.md` | Plugin readme |

## Architecture
- **Permissions**: `read-files`, `write-files`, `ui-panels`
- **Entry point**: `const plugin: Plugin` → exported as default (object form)
- **API used**: `app.addSidebarPanel()`, `app.onFileOpen()`, `app.onFileSave()`, `app.onFileRename()`, `app.readConfig()`, `app.writeConfig()`, `app.readFile()`, `app.writeFile()`, `app.openDiff()`
- **Data storage**: snapshots stored as JSON via `app.readConfig`/`app.writeConfig` under keys `timeline/<fileId>.json`. `safeKey()` sanitizes file paths for use as config keys.
- **Event subscriptions**: listens to onFileOpen (refresh panel), onFileSave (create snapshot), onFileRename (migrate snapshot keys). All unsubscribed on unload via the `unsubs` array.
- **Snapshot limit**: `MAX_SNAPSHOTS = 50` per file (FIFO).
- **UI**: sidebar panel via `app.addSidebarPanel('offline-timeline', 'Timeline', ...)`. CSS injected into `document.head`, removed on unload.
- **No editor extension**.

## Status
- Shipped — no configuration.
