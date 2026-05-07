import type { Plugin, App } from '../../src/plugin-api/index.ts'
import { mermaidWidgets } from './mermaid-widget.ts'

let removeExtension: (() => void) | null = null

const plugin: Plugin = {
  id: 'mermaid-diagrams',
  name: 'Mermaid Diagrams',
  version: '1.0.0',
  permissions: ['editor'],

  onLoad(app: App): void {
    removeExtension = app.addEditorExtension(mermaidWidgets)
  },

  onUnload(): void {
    if (removeExtension) {
      removeExtension()
      removeExtension = null
    }
  },
}

export default plugin
