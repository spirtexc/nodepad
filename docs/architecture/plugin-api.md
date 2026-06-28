# Plugin Contract & App API

Source of truth: `src/plugin-api/index.ts` and `src/plugin-api/loader.ts`. This note summarizes current state — if it disagrees with those files, the files win.

## Plugin interface

```typescript
export interface Plugin {
  id: string
  name: string
  version: string
  permissions: Permission[]
  onLoad(app: App): void | Promise<void>
  onUnload(): void | Promise<void>
}
```

## Permission → method grants

From `src/plugin-api/loader.ts` `PERMISSION_METHODS`. Methods not granted are `delete`d off the `App` object before the plugin receives it — a plugin that didn't declare a permission cannot call the method, full stop, not even by accident.

| Permission | Grants |
|---|---|
| `editor` | `getActiveEditor`, `replaceSelection`, `addEditorExtension` |
| `read-files` | `readFile`, `listFiles`, `getBacklinks`, `readConfig` |
| `write-files` | `writeFile`, `writeConfig` |
| `ui-panels` | `addView`, `addSidebarIcon` |
| `commands` | `addCommand`, `addMenuItem` |
| `network` | (none — just a declaration, no `fetch` wrapper restricts it) |

**Always-available methods** (not gated by any permission): `registerPlugin`, `addSidebarPanel`, `openDiff`, `addStatusBarItem`, `openModal`, `getActiveFile`, `openFile`, `onFileOpen`, `onFileChange`, `onFileSave`, `onFileRename`, `onPreviewUpdate`, `onOnline`, `onOffline`.

## Full App interface

```typescript
export interface App {
  registerPlugin(plugin: Plugin): void
  addView(id: string, factory: (container: HTMLElement) => View): void
  addSidebarPanel(id: string, title: string, factory: (container: HTMLElement) => void): Unsubscribe
  openDiff(nameA: string, contentA: string, nameB: string, contentB: string, onRestoreA?: () => void): void
  addCommand(cmd: Command): void
  addMenuItem(label: string, onClick: () => void): void
  addSidebarIcon(icon: string, title: string, onClick: () => void): void
  addStatusBarItem(): HTMLElement
  openModal(content: HTMLElement): () => void
  getActiveEditor(): EditorView | null
  replaceSelection(text: string): void
  addEditorExtension(extension: Extension): Unsubscribe
  getActiveFile(): VaultFile | null
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readConfig(path: string): Promise<string>      // reads .nodepad/<path>
  writeConfig(path: string, content: string): Promise<void>  // writes .nodepad/<path>
  listFiles(folder?: string): VaultFile[]
  getBacklinks(path: string): VaultFile[]
  openFile(path: string): Promise<void>
  onFileOpen(cb: (file: VaultFile) => void): Unsubscribe
  onFileChange(cb: (file: VaultFile) => void): Unsubscribe
  onFileSave(cb: (file: VaultFile) => void): Unsubscribe
  onFileRename(cb: (oldPath: string, newPath: string) => void): Unsubscribe
  onPreviewUpdate(cb: (container: HTMLElement) => void): Unsubscribe
  onOnline(cb: () => void): Unsubscribe
  onOffline(cb: () => void): Unsubscribe
}
```

`readConfig`/`writeConfig` are the newest additions — they're how a plugin persists its own settings inside the vault (`.nodepad/<plugin-id>/...`) instead of `localStorage`/IndexedDB, so settings travel with the vault. See [[architecture/storage]].

## Where this diverges from CLAUDE.md

The original `CLAUDE.md` spec for `App` didn't have `readConfig`/`writeConfig`, and used `registerView` where the actual code uses `addView`. Treat this note and the actual source files as authoritative over the CLAUDE.md snippet for the `App` shape.
