import type { Plugin, App, Permission } from '../../src/plugin-api/index.ts'
import { markdownWYSIWYG } from '../../src/editor/markdown.ts'
import { codeBlockWidgets } from '../../src/editor/codeblock.ts'
import { wikilinkDecorations, wikilinkTheme } from '../../src/editor/wikilinks.ts'

function makeMarkdownPlugin(): Plugin {
  let removeExt: (() => void) | null = null

  return {
    id: 'markdown',
    name: 'Markdown Formatting',
    version: '1.0.0',
    permissions: ['editor'] as Permission[],

    onLoad(app: App) {
      removeExt = app.addEditorExtension([markdownWYSIWYG, codeBlockWidgets, wikilinkDecorations, wikilinkTheme])
    },

    onUnload() {
      removeExt?.()
      removeExt = null
    },
  }
}

export default makeMarkdownPlugin()
