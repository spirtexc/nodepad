import { EditorView } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { buildExtensions, themeCompartment, getThemeExtension } from './extensions.ts'
import { buildKeymaps } from './keymaps.ts'

export class Editor {
  private view: EditorView
  private pluginCompartment = new Compartment()
  private pluginExtensions: Extension[] = []

  constructor(
    container: HTMLElement,
    onSave: () => void,
    onChange: (content: string) => void,
  ) {
    const state = EditorState.create({
      doc: '',
      extensions: [
        buildExtensions(onChange),
        buildKeymaps(onSave),
        this.pluginCompartment.of([]),
      ],
    })

    this.view = new EditorView({ state, parent: container })
  }

  addExtension(ext: Extension): () => void {
    this.pluginExtensions = [...this.pluginExtensions, ext]
    this.view.dispatch({ effects: this.pluginCompartment.reconfigure(this.pluginExtensions) })
    return () => {
      this.pluginExtensions = this.pluginExtensions.filter((e) => e !== ext)
      this.view.dispatch({ effects: this.pluginCompartment.reconfigure(this.pluginExtensions) })
    }
  }

  setTheme(isDark: boolean): void {
    this.view.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtension(isDark)),
    })
  }

  getContent(): string {
    return this.view.state.doc.toString()
  }

  setContent(text: string): void {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: text,
      },
    })
  }

  focus(): void {
    this.view.focus()
  }

  getView(): EditorView {
    return this.view
  }

  replaceSelection(text: string): void {
    const sel = this.view.state.selection.main
    this.view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: text },
      selection: { anchor: sel.from + text.length },
    })
  }
}
