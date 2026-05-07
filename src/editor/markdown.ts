import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

const hidden = Decoration.replace({})

function buildDecorations(view: EditorView): DecorationSet {
  const { doc, selection } = view.state
  const cursorLine = doc.lineAt(selection.main.head).number
  const ranges: Array<{ from: number; to: number }> = []

  for (let ln = 1; ln <= doc.lines; ln++) {
    if (ln === cursorLine) continue
    const line = doc.line(ln)
    const text = line.text
    const base = line.from

    // Headings: hide "# " prefix
    const headingMatch = /^(#{1,6}) /.exec(text)
    if (headingMatch) {
      ranges.push({ from: base, to: base + headingMatch[1].length + 1 })
      continue
    }

    let m: RegExpExecArray | null

    // Bold **text**
    const boldRe = /\*\*(.+?)\*\*/g
    while ((m = boldRe.exec(text)) !== null) {
      ranges.push({ from: base + m.index, to: base + m.index + 2 })
      ranges.push({ from: base + m.index + m[0].length - 2, to: base + m.index + m[0].length })
    }

    // Italic *text* (not bold)
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
    while ((m = italicRe.exec(text)) !== null) {
      ranges.push({ from: base + m.index, to: base + m.index + 1 })
      ranges.push({ from: base + m.index + m[0].length - 1, to: base + m.index + m[0].length })
    }

    // Inline code `text`
    const codeRe = /`([^`]+)`/g
    while ((m = codeRe.exec(text)) !== null) {
      ranges.push({ from: base + m.index, to: base + m.index + 1 })
      ranges.push({ from: base + m.index + m[0].length - 1, to: base + m.index + m[0].length })
    }

    // Links [text](url) — hide [ ](url)
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
    while ((m = linkRe.exec(text)) !== null) {
      ranges.push({ from: base + m.index, to: base + m.index + 1 })
      const closeBracket = m.index + 1 + m[1].length
      ranges.push({ from: base + closeBracket, to: base + m.index + m[0].length })
    }
  }

  ranges.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)

  const builder = new RangeSetBuilder<Decoration>()
  let lastTo = -1
  for (const { from, to } of ranges) {
    if (from >= lastTo && from < to) {
      builder.add(from, to, hidden)
      lastTo = to
    }
  }
  return builder.finish()
}

export const markdownWYSIWYG: Extension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildDecorations(view) }
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
)
