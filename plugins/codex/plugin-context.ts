import type { App } from '../../src/plugin-api/index.ts'

/**
 * STUB — plugin context for Codex chat.
 *
 * Defines the typed interface for structured context that other plugins (Mindmap,
 * Graph View) could provide to Codex's prompts. Returns null for both today.
 *
 * No probe(), no file sniffing — a stub stubs. The real implementation needs a
 * getLoadedPlugins() API (logged as (B) prerequisite) to ask "is X loaded?".
 */

export interface MindmapContext {
  /** Heading tree of the active note: [{ text, level, children[] }] */
  root: { text: string; level: number; children: MindmapContext['root'][] }
}

export interface GraphContext {
  /** Wikilink adjacency: note path → paths it links to */
  links: Array<{ from: string; to: string }>
}

export interface PluginContext {
  mindmap: MindmapContext | null
  graph: GraphContext | null
}

export async function getPluginContext(_app: App): Promise<PluginContext> {
  return { mindmap: null, graph: null }
}
