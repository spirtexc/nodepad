import type { EditorView } from '@codemirror/view'
import { Editor } from './editor/index.ts'
import { layout } from './layout/index.ts'
import { Sidebar } from './layout/sidebar.ts'
import { TabBar } from './layout/tabbar.ts'
import { StatusBar } from './layout/statusbar.ts'
import { TabManager } from './layout/tabs.ts'
import { QuickSwitcher } from './layout/quickswitcher.ts'
import { Vault } from './vault/index.ts'
import { buildFileTree } from './vault/file-tree.ts'
import type { VaultFile, TreeNode } from './vault/file-tree.ts'
import { BacklinkIndex } from './vault/backlinks.ts'
import { VaultSearch } from './vault/search.ts'
import { TagsIndex } from './vault/tags.ts'
import { debounce } from './utils/debounce.ts'
import { makeEmitter, makeVoidEmitter } from './utils/emitter.ts'
import { get, set } from 'idb-keyval'
import type { App as AppAPI, Plugin, Command, View } from './plugin-api/index.ts'
import { PluginLoader } from './plugin-api/loader.ts'
import mermaidPlugin from '../plugins/mermaid-diagrams/index.ts'
import timelinePlugin from '../plugins/offline-timeline/index.ts'
import mindmapPlugin from '../plugins/mindmap/index.ts'

export class App {
  private editor!: Editor
  private sidebar: Sidebar
  private tabBar: TabBar
  private statusBar: StatusBar
  private tabs: TabManager
  private vault: Vault
  private vaultSearch: VaultSearch
  private backlinkIndex: BacklinkIndex
  private quickSwitcher: QuickSwitcher | null = null
  private fileHandles: Map<string, FileSystemFileHandle> = new Map()
  private breadcrumb!: HTMLElement
  private currentFileName: string | null = null
  private currentFilePath: string | null = null

  private tagsIndex: TagsIndex
  private pluginLoader: PluginLoader
  private diskPlugins: Map<string, { plugin: Plugin; blobUrl: string; filename: string; enabled: boolean }> = new Map()
  private builtinPlugins: Plugin[] = [mermaidPlugin, timelinePlugin, mindmapPlugin]
  private pluginCleanups: Map<string, Array<() => void>> = new Map()
  private commands: Map<string, Command> = new Map()
  private views: Map<string, (container: HTMLElement) => View> = new Map()
  private menuItems: Array<{ label: string; onClick: () => void }> = []
  private dockPluginSlot!: HTMLElement
  private fileOpenEmitter = makeEmitter<VaultFile>()
  private fileChangeEmitter = makeEmitter<VaultFile>()
  private fileSaveEmitter = makeEmitter<VaultFile>()
  private previewUpdateEmitter = makeEmitter<HTMLElement>()
  private onlineEmitter = makeVoidEmitter()
  private offlineEmitter = makeVoidEmitter()

  constructor(rootElement: HTMLElement) {
    this.vault = new Vault()
    this.tabs = new TabManager()
    this.vaultSearch = new VaultSearch()
    this.backlinkIndex = new BacklinkIndex()
    this.tagsIndex = new TagsIndex()

    rootElement.appendChild(this.buildDock())

    const mainArea = document.createElement('div')
    mainArea.style.cssText = 'flex:1;min-width:0;overflow:hidden;display:flex;'
    rootElement.appendChild(mainArea)
    layout.mount(mainArea)

    const sidebarWrap = layout.left
    this.sidebar = new Sidebar(sidebarWrap, {
      onOpenFolder: () => this.handleOpenFolder(),
      onNewFile: () => this.handleNewFile(),
      onNewFolder: () => this.handleNewFolder(),
    })

    const workspace = layout.right
    workspace.className = 'workspace'

    const tabBarWrap = document.createElement('div')
    workspace.appendChild(tabBarWrap)
    this.tabBar = new TabBar(tabBarWrap)

    const editorPane = this.buildEditorPane()
    workspace.appendChild(editorPane)

    const statusWrap = document.createElement('div')
    workspace.appendChild(statusWrap)
    this.statusBar = new StatusBar(statusWrap)

    const debouncedAutoSave = debounce((..._args: unknown[]) => {
      this.saveActive()
    }, 1000)

    this.editor = new Editor(
      editorPane.querySelector('.editor-container')!,
      () => this.saveActive(),
      (content: string) => {
        if (this.currentFileName) {
          this.tabs.updateContent(this.currentFileName, content)
          this.tabBar.markUnsaved(this.currentFileName, true)
        }
        this.updateStatusBar(content)
        if (this.currentFileName && this.currentFilePath) {
          const handle = this.fileHandles.get(this.currentFilePath)
          if (handle) this.fileChangeEmitter.emit({ name: this.currentFileName, path: this.currentFilePath, handle })
        }
        debouncedAutoSave()
      },
    )

    this.initKeyboardShortcuts()

    this.pluginLoader = new PluginLoader()
    window.addEventListener('online', () => this.onlineEmitter.emit())
    window.addEventListener('offline', () => this.offlineEmitter.emit())
    this.vault.tryRestoreVault().then(restored => {
      if (restored) void this.reloadVaultFolder()
    })
    this.initPlugins()
  }

  private initKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        if (this.quickSwitcher) {
          this.quickSwitcher.close()
          this.quickSwitcher = null
        } else {
          this.quickSwitcher = new QuickSwitcher(this.vaultSearch)
          this.quickSwitcher.open((path) => {
            this.quickSwitcher = null
            this.openFileByPath(path)
          })
        }
      }
    })
  }

  private async openFileByPath(path: string): Promise<void> {
    const handle = this.fileHandles.get(path)
    if (!handle) return
    const content = await this.vault.readFileByHandle(handle)
    const name = path.split('/').pop() ?? path
    this.tabs.open(name, handle, content)
    this.tabBar.addTab(name, () => this.activateFileWithPath(name, path))
    this.activateFileWithPath(name, path)
  }

  private buildDock(): HTMLElement {
    const dock = document.createElement('div')
    dock.className = 'dock'

    const fileBtn = document.createElement('button')
    fileBtn.className = 'dock-btn active'
    fileBtn.title = 'Files'
    fileBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`

    const searchBtn = document.createElement('button')
    searchBtn.className = 'dock-btn'
    searchBtn.title = 'Search'
    searchBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`

    dock.appendChild(fileBtn)
    dock.appendChild(searchBtn)

    this.dockPluginSlot = document.createElement('div')
    this.dockPluginSlot.className = 'dock-plugin-slot'
    dock.appendChild(this.dockPluginSlot)

    dock.appendChild(document.createElement('div')).className = 'dock-spacer'

    const settingsBtn = document.createElement('button')
    settingsBtn.className = 'dock-btn'
    settingsBtn.title = 'Plugin settings'
    settingsBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
    settingsBtn.addEventListener('click', () => this.openPluginSettings())
    dock.appendChild(settingsBtn)

    const themeWrap = document.createElement('div')
    themeWrap.className = 'dock-theme'

    const darkBtn = document.createElement('button')
    darkBtn.className = 'dock-btn'
    darkBtn.title = 'Dark theme'
    darkBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`

    const lightBtn = document.createElement('button')
    lightBtn.className = 'dock-btn'
    lightBtn.title = 'Light theme'
    lightBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`

    const syncThemeBtns = () => {
      const isDark = document.documentElement.dataset['theme'] === 'dark'
      darkBtn.classList.toggle('active', isDark)
      lightBtn.classList.toggle('active', !isDark)
    }

    darkBtn.addEventListener('click', () => {
      document.documentElement.dataset['theme'] = 'dark'
      syncThemeBtns()
      this.editor?.setTheme(true)
    })
    lightBtn.addEventListener('click', () => {
      document.documentElement.dataset['theme'] = 'light'
      syncThemeBtns()
      this.editor?.setTheme(false)
    })
    syncThemeBtns()

    themeWrap.appendChild(darkBtn)
    themeWrap.appendChild(lightBtn)
    dock.appendChild(themeWrap)
    return dock
  }

  private buildEditorPane(): HTMLElement {
    const pane = document.createElement('div')
    pane.className = 'editor-pane'

    this.breadcrumb = document.createElement('div')
    this.breadcrumb.className = 'breadcrumb'
    this.breadcrumb.innerHTML = `<span class="breadcrumb-item">Nodepad</span>`
    pane.appendChild(this.breadcrumb)

    const editorContainer = document.createElement('div')
    editorContainer.className = 'editor-container'
    pane.appendChild(editorContainer)

    return pane
  }

  private async handleOpenFolder(): Promise<void> {
    const dir = await this.vault.openFolder()
    if (!dir) return
    await this.reloadVaultFolder()
  }

  private async reloadVaultFolder(): Promise<void> {
    const dir = this.vault.getVaultRoot()
    if (!dir) return

    this.sidebar.showLoading()
    this.fileHandles.clear()

    const nodes = await buildFileTree(dir)
    const allFiles = await this.collectAllFiles(nodes)

    for (const { file } of allFiles) {
      this.fileHandles.set(file.path, file.handle)
    }

    this.vaultSearch.index(
      allFiles.map(({ file, content }) => ({
        path: file.path,
        name: file.name,
        content,
      })),
    )

    this.backlinkIndex.build(
      allFiles.map(({ file, content }) => ({
        path: file.path,
        content,
      })),
    )

    this.tagsIndex.build(allFiles.map(({ file, content }) => ({ path: file.path, content })))
    this.sidebar.setTags(this.tagsIndex.getAllTags(), (tag: string) => this.filterByTag(tag))

    this.sidebar.setFileTree(nodes, (file: VaultFile) => this.openVaultFile(file))
    void this.scanVaultPlugins()
  }

  private async handleNewFile(): Promise<void> {
    if (!this.vault.getVaultRoot()) {
      alert('Please open a folder first to create files inside it.')
      return
    }
    const name = prompt('Enter new file name:')
    if (!name) return
    const finalName = name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.txt') ? name : `${name}.md`
    const handle = await this.vault.createFile(finalName)
    if (handle) {
      await this.reloadVaultFolder()
      this.openVaultFile({ name: finalName, path: finalName, handle })
    }
  }

  private async handleNewFolder(): Promise<void> {
    if (!this.vault.getVaultRoot()) {
      alert('Please open a folder first to create folders inside it.')
      return
    }
    const name = prompt('Enter new folder name:')
    if (!name) return
    const handle = await this.vault.createFolder(name)
    if (handle) {
      await this.reloadVaultFolder()
    }
  }

  private async collectAllFiles(
    nodes: TreeNode[],
  ): Promise<{ file: VaultFile; content: string }[]> {
    const results: { file: VaultFile; content: string }[] = []
    for (const node of nodes) {
      if (node.kind === 'file') {
        const content = await this.vault.readFileByHandle(node.file.handle)
        results.push({ file: node.file, content })
      } else {
        const children = await this.collectAllFiles(node.folder.children)
        results.push(...children)
      }
    }
    return results
  }

  private async openVaultFile(file: VaultFile): Promise<void> {
    const content = await this.vault.readFileByHandle(file.handle)
    this.tabs.open(file.name, file.handle, content)
    this.tabBar.addTab(file.name, () => this.activateFileWithPath(file.name, file.path))
    this.activateFileWithPath(file.name, file.path)
  }

  private activateFileWithPath(name: string, path: string): void {
    this.tabs.setActive(name)
    this.currentFileName = name
    this.currentFilePath = path
    const tab = this.tabs.getActive()
    if (!tab) return

    this.editor.setContent(tab.content)
    this.editor.focus()
    this.sidebar.setActivePath(path)
    this.tabBar.setActive(name)
    this.tabBar.markUnsaved(name, false)
    this.statusBar.setFilename(name)
    this.updateBreadcrumb(path)
    this.updateStatusBar(tab.content)

    const h = this.fileHandles.get(path)
    if (h) this.fileOpenEmitter.emit({ name, path, handle: h })
  }

  private async saveActive(): Promise<void> {
    const tab = this.tabs.getActive()
    if (!tab) return
    const content = this.editor.getContent()
    this.tabs.updateContent(tab.name, content)
    this.tabBar.markUnsaved(tab.name, false)
    await this.vault.saveFile(tab.handle, content)

    if (this.currentFilePath) {
      this.backlinkIndex.update(this.currentFilePath, content)
      this.tagsIndex.update(this.currentFilePath, content)
      const handle = this.fileHandles.get(this.currentFilePath)
      if (handle) {
        const allFiles: { path: string; name: string; content: string }[] = []
        for (const [p, h] of this.fileHandles) {
          const c = p === this.currentFilePath ? content : await this.vault.readFileByHandle(h)
          allFiles.push({ path: p, name: p.split('/').pop() ?? p, content: c })
        }
        this.vaultSearch.index(allFiles)
      }
    }

    if (this.currentFilePath) {
      const handle = this.fileHandles.get(this.currentFilePath)
      if (handle && this.currentFileName) {
        this.fileSaveEmitter.emit({ name: this.currentFileName, path: this.currentFilePath, handle })
      }
    }
  }

  private updateBreadcrumb(nameOrPath: string): void {
    const parts = nameOrPath.split('/')
    if (parts.length === 1) {
      this.breadcrumb.innerHTML = `
        <span class="breadcrumb-item">Nodepad</span>
        <span class="breadcrumb-sep"> / </span>
        <span class="breadcrumb-item current">${nameOrPath}</span>
      `
    } else {
      const segments = parts.map((p, i) =>
        i === parts.length - 1
          ? `<span class="breadcrumb-item current">${p}</span>`
          : `<span class="breadcrumb-item">${p}</span><span class="breadcrumb-sep"> / </span>`,
      )
      this.breadcrumb.innerHTML =
        `<span class="breadcrumb-item">Nodepad</span><span class="breadcrumb-sep"> / </span>` +
        segments.join('')
    }
  }

  private updateStatusBar(content: string): void {
    const lines = content.split('\n')
    const line = lines.length
    const col = (lines[lines.length - 1] ?? '').length + 1
    const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length
    this.statusBar.update(line, col, words)
  }

  private async initPlugins(): Promise<void> {
    for (const plugin of this.builtinPlugins) {
      const enabled = (await get<boolean>(`builtin-plugin:enabled:${plugin.id}`)) ?? true
      if (enabled) await this.loadPluginTracked(plugin)
    }
  }

  private async scanVaultPlugins(): Promise<void> {
    // Revoke old blob URLs before rescanning
    for (const entry of this.diskPlugins.values()) {
      await this.unloadPlugin(entry.plugin.id)
      URL.revokeObjectURL(entry.blobUrl)
    }
    this.diskPlugins.clear()

    const files = await this.vault.scanPluginFiles()
    const core = this.buildCoreServices()

    for (const { name, handle } of files) {
      let blobUrl = ''
      try {
        const file = await handle.getFile()
        const text = await file.text()
        const blob = new Blob([text], { type: 'text/javascript' })
        blobUrl = URL.createObjectURL(blob)

        const mod = await import(/* @vite-ignore */ blobUrl) as Record<string, unknown>
        const plugin = (mod['default'] ?? mod['plugin']) as Plugin | undefined
        if (!plugin?.id || !plugin.onLoad) {
          console.warn(`[PluginScan] Skipping ${name}: not a valid plugin`)
          URL.revokeObjectURL(blobUrl)
          continue
        }

        const enabledKey = `vault-plugin:enabled:${plugin.id}`
        const enabled = (await get<boolean>(enabledKey)) ?? true

        this.diskPlugins.set(plugin.id, { plugin, blobUrl, filename: name, enabled })

        if (enabled) {
          await this.pluginLoader.loadPlugin(plugin, core)
        }
      } catch (err) {
        console.error(`[PluginScan] Failed to load ${name}:`, err)
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      }
    }
  }

  private buildCoreServices(cleanups?: Array<() => void>): AppAPI {
    const track = (fn: () => void) => cleanups?.push(fn)
    return {
      registerPlugin: (plugin: Plugin) => { void this.loadPluginTracked(plugin) },
      getActiveEditor: (): EditorView | null => this.editor?.getView() ?? null,
      replaceSelection: (text: string) => this.editor?.replaceSelection(text),
      addEditorExtension: (ext) => {
        const remove = this.editor?.addExtension(ext) ?? (() => {})
        track(remove)
        return remove
      },
      getActiveFile: () => {
        if (!this.currentFileName || !this.currentFilePath) return null
        const handle = this.fileHandles.get(this.currentFilePath)
        return handle ? { name: this.currentFileName, path: this.currentFilePath, handle } : null
      },
      listFiles: (folder?: string) => {
        const all = [...this.fileHandles.entries()].map(([path, handle]) => ({
          name: path.split('/').pop() ?? path,
          path,
          handle,
        }))
        return folder ? all.filter(f => f.path.startsWith(folder)) : all
      },
      getBacklinks: (path: string) => {
        const filename = path.split('/').pop() ?? path
        return this.backlinkIndex.getBacklinks(filename).flatMap(p => {
          const h = this.fileHandles.get(p)
          return h ? [{ name: p.split('/').pop() ?? p, path: p, handle: h }] : []
        })
      },
      readFile: async (path: string) => {
        const handle = this.fileHandles.get(path)
        if (!handle) throw new Error(`File not found: ${path}`)
        return this.vault.readFileByHandle(handle)
      },
      writeFile: async (path: string, content: string) => {
        const handle = this.fileHandles.get(path)
        if (!handle) throw new Error(`File not found: ${path}`)
        await this.vault.saveFile(handle, content)
      },
      addView: (id: string, factory: (container: HTMLElement) => View) => {
        this.views.set(id, factory)
        track(() => this.views.delete(id))
      },
      addSidebarIcon: (icon: string, title: string, onClick: () => void) => {
        const btn = document.createElement('button')
        btn.className = 'dock-btn'
        btn.title = title
        btn.innerHTML = icon
        btn.addEventListener('click', onClick)
        this.dockPluginSlot.appendChild(btn)
        track(() => btn.remove())
      },
      addCommand: (cmd: Command) => {
        this.commands.set(cmd.id, cmd)
        track(() => this.commands.delete(cmd.id))
      },
      addMenuItem: (label: string, onClick: () => void) => {
        const item = { label, onClick }
        this.menuItems.push(item)
        track(() => {
          const i = this.menuItems.indexOf(item)
          if (i >= 0) this.menuItems.splice(i, 1)
        })
      },
      addStatusBarItem: () => {
        const el = this.statusBar.addItem()
        track(() => el.remove())
        return el
      },
      openModal: (content: HTMLElement) => {
        const overlay = document.createElement('div')
        overlay.className = 'modal-overlay'
        const close = () => overlay.remove()
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
        overlay.appendChild(content)
        document.body.appendChild(overlay)
        return close
      },
      onFileOpen: (cb: (f: VaultFile) => void) => this.fileOpenEmitter.on(cb),
      onFileChange: (cb: (f: VaultFile) => void) => this.fileChangeEmitter.on(cb),
      onFileSave: (cb: (f: VaultFile) => void) => this.fileSaveEmitter.on(cb),
      onPreviewUpdate: (cb: (container: HTMLElement) => void) => this.previewUpdateEmitter.on(cb),
      onOnline: (cb: () => void) => this.onlineEmitter.on(cb),
      onOffline: (cb: () => void) => this.offlineEmitter.on(cb),
    }
  }

  private async loadPluginTracked(plugin: Plugin): Promise<boolean> {
    const cleanups: Array<() => void> = []
    const core = this.buildCoreServices(cleanups)
    const ok = await this.pluginLoader.loadPlugin(plugin, core)
    if (ok) this.pluginCleanups.set(plugin.id, cleanups)
    return ok
  }

  private async unloadPlugin(id: string): Promise<void> {
    await this.pluginLoader.unload(id)
    const cleanups = this.pluginCleanups.get(id) ?? []
    for (const fn of cleanups) fn()
    this.pluginCleanups.delete(id)
  }

  private filterByTag(tag: string): void {
    const paths = this.tagsIndex.getFilesWithTag(tag)
    this.sidebar.filterByPaths(paths)
  }

  private openPluginSettings(): void {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'

    const modal = document.createElement('div')
    modal.className = 'plugin-settings-modal'

    const header = document.createElement('div')
    header.className = 'plugin-settings-header'
    header.innerHTML = `<span>Plugins</span>`

    const closeBtn = document.createElement('button')
    closeBtn.className = 'plugin-settings-close'
    closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    const close = () => overlay.remove()
    closeBtn.addEventListener('click', close)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
    header.appendChild(closeBtn)
    modal.appendChild(header)

    const hint = document.createElement('div')
    hint.className = 'plugin-settings-hint'
    hint.textContent = 'Drop compiled .js plugin files into the plugins/ folder inside your vault.'
    modal.appendChild(hint)

    const toolbar = document.createElement('div')
    toolbar.className = 'plugin-settings-toolbar'

    const rescanBtn = document.createElement('button')
    rescanBtn.className = 'plugin-settings-rescan-btn'
    rescanBtn.textContent = 'Rescan'
    rescanBtn.addEventListener('click', async () => {
      rescanBtn.disabled = true
      rescanBtn.textContent = 'Scanning…'
      await this.scanVaultPlugins()
      this.renderPluginList(list)
      rescanBtn.disabled = false
      rescanBtn.textContent = 'Rescan'
    })
    toolbar.appendChild(rescanBtn)
    modal.appendChild(toolbar)

    const list = document.createElement('div')
    list.className = 'plugin-settings-list'
    this.renderPluginList(list)
    modal.appendChild(list)

    overlay.appendChild(modal)
    document.body.appendChild(overlay)
  }

  private renderPluginList(list: HTMLElement): void {
    list.innerHTML = ''

    // Built-in section
    const builtinLabel = document.createElement('div')
    builtinLabel.className = 'plugin-settings-section-label'
    builtinLabel.textContent = 'Built-in'
    list.appendChild(builtinLabel)

    for (const plugin of this.builtinPlugins) {
      const isLoaded = this.pluginLoader.isLoaded(plugin.id)
      const row = document.createElement('div')
      row.className = 'plugin-settings-row'
      const info = document.createElement('div')
      info.className = 'plugin-settings-info'
      const name = document.createElement('span')
      name.className = 'plugin-settings-name'
      name.textContent = plugin.name
      const meta = document.createElement('span')
      meta.className = 'plugin-settings-version'
      meta.textContent = `v${plugin.version}`
      info.appendChild(name)
      info.appendChild(meta)
      const toggle = document.createElement('button')
      toggle.className = `plugin-settings-toggle ${isLoaded ? 'enabled' : ''}`
      toggle.textContent = isLoaded ? 'Enabled' : 'Disabled'
      toggle.addEventListener('click', async () => {
        const loaded = this.pluginLoader.isLoaded(plugin.id)
        if (loaded) {
          await this.unloadPlugin(plugin.id)
        } else {
          await this.loadPluginTracked(plugin)
        }
        const nowLoaded = this.pluginLoader.isLoaded(plugin.id)
        await set(`builtin-plugin:enabled:${plugin.id}`, nowLoaded)
        toggle.className = `plugin-settings-toggle ${nowLoaded ? 'enabled' : ''}`
        toggle.textContent = nowLoaded ? 'Enabled' : 'Disabled'
      })
      row.appendChild(info)
      row.appendChild(toggle)
      list.appendChild(row)
    }

    // Vault plugins section
    const vaultLabel = document.createElement('div')
    vaultLabel.className = 'plugin-settings-section-label'
    vaultLabel.textContent = 'Vault plugins'
    list.appendChild(vaultLabel)

    const entries = [...this.diskPlugins.values()]
    if (entries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'plugin-settings-empty'
      empty.textContent = this.vault.getVaultRoot()
        ? 'No plugins found. Add .js files to the plugins/ folder in your vault.'
        : 'Open a vault to load plugins from its plugins/ folder.'
      list.appendChild(empty)
    } else {
      for (const entry of entries) {
        list.appendChild(this.buildPluginRow(entry))
      }
    }
  }

  private buildPluginRow(entry: { plugin: Plugin; filename: string; enabled: boolean }): HTMLElement {
    const row = document.createElement('div')
    row.className = 'plugin-settings-row'

    const info = document.createElement('div')
    info.className = 'plugin-settings-info'

    const name = document.createElement('span')
    name.className = 'plugin-settings-name'
    name.textContent = entry.plugin.name

    const meta = document.createElement('span')
    meta.className = 'plugin-settings-version'
    meta.textContent = `v${entry.plugin.version} · ${entry.filename}`

    info.appendChild(name)
    info.appendChild(meta)

    const toggle = document.createElement('button')
    toggle.className = `plugin-settings-toggle ${entry.enabled ? 'enabled' : ''}`
    toggle.textContent = entry.enabled ? 'Enabled' : 'Disabled'
    toggle.addEventListener('click', async () => {
      const stored = this.diskPlugins.get(entry.plugin.id)
      if (!stored) return
      if (stored.enabled) {
        await this.unloadPlugin(entry.plugin.id)
        stored.enabled = false
      } else {
        await this.loadPluginTracked(stored.plugin)
        stored.enabled = true
      }
      await set(`vault-plugin:enabled:${entry.plugin.id}`, stored.enabled)
      toggle.className = `plugin-settings-toggle ${stored.enabled ? 'enabled' : ''}`
      toggle.textContent = stored.enabled ? 'Enabled' : 'Disabled'
    })

    row.appendChild(info)
    row.appendChild(toggle)
    return row
  }
}
