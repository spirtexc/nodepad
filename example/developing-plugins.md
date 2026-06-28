# Developing Plugins for Nodepad

Nodepad plugins are plain JavaScript modules that receive an `App` object and use it to extend the editor.

---

## Folder structure

Every plugin is a folder inside `.nodepad/plugins/` in your vault:

```
MyVault/
└── .nodepad/
    └── plugins/
        └── my-plugin/
            ├── manifest.json   ← required: plugin metadata
            └── main.js         ← required: compiled plugin code
```

---

## manifest.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "permissions": ["read-files", "ui-panels"]
}
```

### Available permissions

| Permission | What it unlocks |
|------------|----------------|
| `editor` | `getActiveEditor()`, `replaceSelection()`, `addEditorExtension()` |
| `read-files` | `readFile()`, `listFiles()`, `getBacklinks()`, `readConfig()` |
| `write-files` | `writeFile()`, `writeConfig()` |
| `ui-panels` | `addSidebarPanel()`, `addSidebarIcon()` |
| `commands` | `addCommand()`, `addMenuItem()` |
| `network` | `fetch()` (no restriction, just declaration) |

---

## main.js — minimal plugin

```js
const plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  permissions: ['ui-panels'],

  onLoad(app) {
    app.addSidebarPanel('my-plugin', 'My Panel', (container) => {
      container.textContent = 'Hello from my plugin!'
    })
  },

  onUnload() {}
}

export default plugin
```

---

## Using a library (TypeScript + esbuild)

If your plugin needs an npm library, write it in TypeScript and bundle with esbuild.

### 1. Set up a development folder (outside the vault)

```
my-plugin-dev/
├── index.ts
└── package.json
```

### 2. Install dependencies

```bash
npm init -y
npm install d3
npm install --save-dev esbuild typescript
```

### 3. Write the plugin

```typescript
// index.ts
import * as d3 from 'd3'
import type { Plugin, App } from 'src/plugin-api/index.ts'

const plugin: Plugin = {
  id: 'my-chart',
  name: 'My Chart',
  version: '1.0.0',
  permissions: ['ui-panels'],

  onLoad(app: App) {
    app.addSidebarPanel('my-chart', 'Chart', (container) => {
      const svg = d3.select(container)
        .append('svg')
        .attr('width', 300)
        .attr('height', 200)

      svg.append('circle')
        .attr('cx', 150)
        .attr('cy', 100)
        .attr('r', 50)
        .attr('fill', 'steelblue')
    })
  },

  onUnload() {}
}

export default plugin
```

### 4. Bundle to a single file

```bash
npx esbuild index.ts --bundle --format=esm --outfile=main.js
```

D3 (and any other dependencies) are compiled **into** `main.js` — no separate install needed by users.

### 5. Drop into the vault

```
MyVault/.nodepad/plugins/my-chart/
├── manifest.json
└── main.js          ← d3 is already inside here
```

Open Nodepad → Plugins → **Rescan** → toggle on.

---

## App API reference

```typescript
// UI
app.addSidebarPanel(id, title, (container) => void)
app.addSidebarIcon(svgString, title, onClick)
app.addCommand({ id, name, callback, hotkey? })
app.addMenuItem(label, onClick)
app.openModal(element)          // returns close function
app.openDiff(nameA, a, nameB, b)

// Editor
app.getActiveEditor()           // returns CodeMirror EditorView
app.replaceSelection(text)
app.addEditorExtension(ext)     // returns remove function

// Files
app.getActiveFile()             // { name, path, handle }
app.listFiles(folder?)          // VaultFile[]
app.readFile(path)              // Promise<string>
app.writeFile(path, content)    // Promise<void>
app.getBacklinks(path)          // VaultFile[]

// Plugin config (saved to .nodepad/)
app.readConfig(path)            // Promise<string>  e.g. 'my-plugin/settings.json'
app.writeConfig(path, content)  // Promise<void>

// Events
app.onFileOpen(cb)              // returns unsubscribe()
app.onFileChange(cb)
app.onFileSave(cb)
app.onFileRename(cb)
app.onPreviewUpdate(cb)
app.onOnline(cb)
app.onOffline(cb)
```

---

## Saving plugin settings

Use `readConfig` / `writeConfig` to persist data inside `.nodepad/`:

```js
// Save settings
await app.writeConfig('my-plugin/settings.json', JSON.stringify({ theme: 'dark' }))

// Load settings
const raw = await app.readConfig('my-plugin/settings.json')
const settings = raw ? JSON.parse(raw) : { theme: 'light' }
```

Data is saved to `MyVault/.nodepad/my-plugin/settings.json` — travels with the vault.

---

## Cleaning up on unload

Always remove event listeners and DOM elements in `onUnload`:

```js
let unsubs = []

onLoad(app) {
  unsubs.push(app.onFileOpen(file => { ... }))
  unsubs.push(app.addSidebarPanel(...))
},

onUnload() {
  unsubs.forEach(u => u())
  unsubs = []
}
```

---

## Tips

- Keep `id` unique — two plugins with the same id will conflict
- `permissions` must declare everything the plugin uses — undeclared methods are removed from the `app` object before your plugin receives it
- Bundle with `--format=esm` — CommonJS (`require`) will not work
- Test by opening the vault, going to Plugins → Rescan after any change to `main.js`
