# `.nodepad/` — Per-Vault Config Folder

Obsidian-style hidden folder created inside every vault. Replaces idb-keyval/IndexedDB for anything that should travel with the vault (be copyable, portable, survive an app reinstall on its own terms).

```
YourVault/
└── .nodepad/
    ├── workspace.json          ← open tabs + active tab (this vault only)
    ├── app.json                ← per-plugin enabled/disabled state
    ├── timeline/
    │   ├── notes--my-note.json     ← all snapshots for one file
    │   └── ...
    └── plugins/
        ├── markdown/
        │   ├── manifest.json
        │   └── main.js
        └── ...
```

## Vault helper methods (`src/vault/index.ts`)

```typescript
resolveOrCreateDir(path: string): Promise<FileSystemDirectoryHandle | null>
readNodepadFile(relPath: string): Promise<string>
writeNodepadFile(relPath: string, content: string): Promise<void>
readNodepadJson<T>(relPath: string): Promise<T | null>
writeNodepadJson(relPath: string, data: unknown): Promise<void>
scanNodepadPlugins(): Promise<{ manifest: {...}; jsHandle: FileSystemFileHandle }[]>
```

`readConfig`/`writeConfig` on the plugin `App` object (see [[architecture/plugin-api]]) are thin wrappers over `readNodepadFile`/`writeNodepadFile` — a plugin calling `app.writeConfig('my-plugin/settings.json', ...)` ends up at `.nodepad/my-plugin/settings.json`.

## workspace.json

Written by `App.saveWorkspace()` in `src/app.ts` on every tab open/close. Read back by `restoreWorkspace()` — but only once per folder-open (`workspaceRestored` flag), and only if `clearAllTabs()` ran first when switching folders (this was the most recent fix; not yet manually verified — see [[main_todo]]).

```typescript
{
  openTabs: { name: string; path: string }[],
  activeTab: string | null
}
```

## app.json

```typescript
{ plugins: Record<string, boolean> }  // pluginId -> enabled
```

Written by `savePluginState(pluginId, enabled)`. Read by `initPlugins`/`scanVaultPlugins`/`setAllPluginsEnabled` — all default to `true` (enabled) when no entry exists yet.

## timeline/

Owned by the `offline-timeline` plugin, not core. One JSON file per source file, keyed by a sanitized version of the vault-relative path (slashes → `--`). Up to 50 snapshots kept per file. See `plugins/offline-timeline/index.ts`.

## plugins/

Each subfolder is one plugin: `manifest.json` (id, name, version, permissions) + `main.js` (esbuild-bundled, ESM format). The app ships with **none** of these built in — see [[main_todo]] Phase 4 note. `example/.nodepad/plugins/` holds the project's own maintained plugins, compiled, for users to copy into their own vault.

## Why files instead of IndexedDB

IndexedDB is tied to the browser origin/profile. Clear browser data, switch machines, or reinstall the app, and everything in IndexedDB is gone — but a vault is just a folder, and folders survive all of that. The one exception still using IndexedDB: remembering which vault folder to auto-reopen on launch (see [[CLAUDE.md]] § Tech Stack).
