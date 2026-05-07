import { StateField } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import type { EditorState, Range } from '@codemirror/state'

const WIKILINK_RE = /\[\[([^\]|#\n]+?)(?:\|([^\]\n]+?))?\]\]/g

class WikilinkWidget extends WidgetType {
  constructor(
    private readonly label: string,
    private readonly path: string,
  ) { super() }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-wikilink'
    span.textContent = this.label
    span.title = `${this.path}\nCtrl+Click to open`
    span.addEventListener('mousedown', (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      e.stopPropagation()
      span.dispatchEvent(new CustomEvent('cm-wikilink-open', {
        bubbles: true,
        detail: { path: this.path },
      }))
    })
    return span
  }

  eq(other: WikilinkWidget): boolean {
    return this.label === other.label && this.path === other.path
  }

  ignoreEvent(): boolean { return false }
}

function buildDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const sel = state.selection

  for (let lineNum = 1; lineNum <= state.doc.lines; lineNum++) {
    const line = state.doc.line(lineNum)
    WIKILINK_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = WIKILINK_RE.exec(line.text)) !== null) {
      const from = line.from + m.index
      const to = from + m[0].length

      // If any selection range overlaps this wikilink, show raw text
      const overlaps = sel.ranges.some(r => r.from <= to && r.to >= from)
      if (overlaps) continue

      const path = m[1]!.trim()
      const label = m[2]?.trim() ?? path.split('/').pop()?.replace(/\.md$/i, '') ?? path

      decorations.push(
        Decoration.replace({ widget: new WikilinkWidget(label, path) }).range(from, to),
      )
    }
  }

  return Decoration.set(decorations, true)
}

export const wikilinkDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state)
  },
  update(deco, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state)
    }
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})

export const wikilinkTheme = EditorView.baseTheme({
  '.cm-wikilink': {
    color: 'var(--accent)',
    cursor: 'text',
    borderBottom: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
  },
  '.cm-wikilink:hover': {
    borderBottomColor: 'var(--accent)',
  },
  // Show pointer when Ctrl/Meta is held so the user knows it's clickable
  'body:has(.cm-wikilink:hover) .cm-wikilink:hover': {
    cursor: 'text',
  },
})
