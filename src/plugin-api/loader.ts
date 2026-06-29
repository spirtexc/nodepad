import type { Plugin, App, Permission } from './index.ts'

const PERMISSION_METHODS: Record<Permission, (keyof App)[]> = {
  'editor': ['getActiveEditor', 'replaceSelection', 'addEditorExtension'],
  'read-files': ['readFile', 'listFiles', 'getBacklinks', 'readConfig', 'search'],
  'write-files': ['writeFile', 'writeConfig'],
  'ui-panels': ['addView', 'addSidebarIcon'],
  'commands': ['addCommand', 'addMenuItem'],
  'network': [],
}

function createRestrictedAPI(core: App, permissions: Permission[]): App {
  const obj: App = { ...core }

  const granted = new Set<keyof App>()
  for (const perm of permissions) {
    for (const m of PERMISSION_METHODS[perm] ?? []) granted.add(m)
  }

  for (const [, methods] of Object.entries(PERMISSION_METHODS) as [Permission, (keyof App)[]][]) {
    for (const method of methods) {
      if (!granted.has(method)) {
        delete obj[method]
      }
    }
  }

  return obj
}

export class PluginLoader {
  private loaded: Map<string, Plugin> = new Map()

  async load(url: string, core: App): Promise<Plugin | null> {
    try {
      const mod = await import(/* @vite-ignore */ url) as Record<string, unknown>
      const plugin = (mod['default'] ?? mod['plugin']) as Plugin | undefined
      if (!plugin?.id || !plugin.onLoad) {
        console.error(`[PluginLoader] Invalid plugin module at ${url}`)
        return null
      }
      const api = createRestrictedAPI(core, plugin.permissions ?? [])
      await plugin.onLoad(api)
      this.loaded.set(plugin.id, plugin)
      console.info(`[PluginLoader] Loaded plugin "${plugin.name}" v${plugin.version}`)
      return plugin
    } catch (err) {
      console.error(`[PluginLoader] Failed to load plugin at ${url}:`, err)
      return null
    }
  }

  async loadPlugin(plugin: Plugin, core: App): Promise<boolean> {
    try {
      const api = createRestrictedAPI(core, plugin.permissions ?? [])
      await plugin.onLoad(api)
      this.loaded.set(plugin.id, plugin)
      console.info(`[PluginLoader] Loaded built-in plugin "${plugin.name}" v${plugin.version}`)
      return true
    } catch (err) {
      console.error(`[PluginLoader] Failed to load built-in plugin "${plugin.id}":`, err)
      return false
    }
  }

  async unload(id: string): Promise<void> {
    const plugin = this.loaded.get(id)
    if (!plugin) return
    try {
      await plugin.onUnload()
    } catch (err) {
      console.error(`[PluginLoader] Error unloading plugin "${id}":`, err)
    }
    this.loaded.delete(id)
  }

  isLoaded(id: string): boolean {
    return this.loaded.has(id)
  }

  getLoaded(): Plugin[] {
    return [...this.loaded.values()]
  }
}
