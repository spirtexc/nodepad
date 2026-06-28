import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView, WidgetType } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

// ── Widgets ──────────────────────────────────────────────────────────────────

class HrWidget extends WidgetType {
  eq(): boolean { return true }
  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'cm-md-hr'
    return div
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly togglePos: number) { super() }
  eq(o: CheckboxWidget): boolean { return this.checked === o.checked && this.togglePos === o.togglePos }
  toDOM(view: EditorView): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.name = 'task'
    input.autocomplete = 'off'
    input.checked = this.checked
    input.className = 'cm-md-checkbox'
    input.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const insert = this.checked ? ' ' : 'x'
      view.dispatch({ changes: { from: this.togglePos, to: this.togglePos + 1, insert } })
    })
    return input
  }
}

class ImageWidget extends WidgetType {
  constructor(readonly alt: string, readonly src: string) { super() }
  eq(o: ImageWidget): boolean { return this.alt === o.alt && this.src === o.src }
  toDOM(): HTMLElement {
    if (/^https?:\/\//i.test(this.src)) {
      const img = document.createElement('img')
      img.src = this.src
      img.alt = this.alt
      img.className = 'cm-md-image'
      return img
    }
    const span = document.createElement('span')
    span.className = 'cm-md-image-local'
    span.textContent = `🖼 ${this.alt || 'image'}`
    return span
  }
}

// ── Fenced code block detection ───────────────────────────────────────────────

interface Fence { bodyStart: number; bodyEnd: number }

function getFences(view: EditorView): Fence[] {
  const { doc } = view.state
  const fences: Fence[] = []
  let openFenceTo = -1
  for (let ln = 1; ln <= doc.lines; ln++) {
    const line = doc.line(ln)
    if (/^```/.test(line.text)) {
      if (openFenceTo === -1) {
        openFenceTo = line.to
      } else {
        fences.push({ bodyStart: openFenceTo + 1, bodyEnd: line.from - 1 })
        openFenceTo = -1
      }
    }
  }
  return fences
}

function inFenceBody(pos: number, fences: Fence[]): boolean {
  return fences.some(f => pos >= f.bodyStart && pos <= f.bodyEnd)
}

// ── Plugin 1: line decorations (headings, blockquote, fence lines) ────────────

function buildLineDecos(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { doc, selection } = view.state
  const curLine = doc.lineAt(selection.main.head).number
  const fences = getFences(view)

  for (let ln = 1; ln <= doc.lines; ln++) {
    const line = doc.line(ln)
    const text = line.text

    if (inFenceBody(line.from, fences)) continue
    if (/^```/.test(text)) continue
    if (ln === curLine) continue

    const hm = /^(#{1,6}) /.exec(text)
    if (hm) {
      builder.add(line.from, line.from, Decoration.line({ class: `cm-md-h${hm[1].length}` }))
      continue
    }
    if (/^> /.test(text)) {
      builder.add(line.from, line.from, Decoration.line({ class: 'cm-md-blockquote' }))
    }
  }
  return builder.finish()
}

// ── Plugin 2: mark decorations (content styling) ──────────────────────────────

function buildMarkDecos(view: EditorView): DecorationSet {
  const { doc, selection } = view.state
  const curLine = doc.lineAt(selection.main.head).number
  const fences = getFences(view)

  const items: Array<{ from: number; to: number; cls: string }> = []

  for (let ln = 1; ln <= doc.lines; ln++) {
    if (ln === curLine) continue
    const line = doc.line(ln)
    if (inFenceBody(line.from, fences)) continue
    const text = line.text
    const base = line.from
    let m: RegExpExecArray | null

    const boldRe = /\*\*(.+?)\*\*/g
    while ((m = boldRe.exec(text)) !== null)
      items.push({ from: base + m.index + 2, to: base + m.index + m[0].length - 2, cls: 'cm-md-bold' })

    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
    while ((m = italicRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: 'cm-md-italic' })

    const strikeRe = /~~(.+?)~~/g
    while ((m = strikeRe.exec(text)) !== null)
      items.push({ from: base + m.index + 2, to: base + m.index + m[0].length - 2, cls: 'cm-md-strike' })

    const highlightRe = /==(.+?)==/g
    while ((m = highlightRe.exec(text)) !== null)
      items.push({ from: base + m.index + 2, to: base + m.index + m[0].length - 2, cls: 'cm-md-highlight' })

    const subRe = /(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g
    while ((m = subRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: 'cm-md-sub' })

    const supRe = /\^([^^]+?)\^/g
    while ((m = supRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: 'cm-md-sup' })

    const codeRe = /`([^`]+)`/g
    while ((m = codeRe.exec(text)) !== null)
      items.push({ from: base + m.index + 1, to: base + m.index + m[0].length - 1, cls: 'cm-md-code' })

    const linkRe = /\[([^\]]+)\]\([^)]+\)/g
    while ((m = linkRe.exec(text)) !== null) {
      if (m.index > 0 && text[m.index - 1] === '!') continue
      items.push({ from: base + m.index + 1, to: base + m.index + 1 + m[1].length, cls: 'cm-md-link' })
    }
  }

  items.sort((a, b) => a.from - b.from)

  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to, cls } of items) {
    if (from < to) builder.add(from, to, Decoration.mark({ class: cls }))
  }
  return builder.finish()
}

// ── Plugin 3: replace decorations (hide markers + widgets) ────────────────────

function buildReplaceDecos(view: EditorView): DecorationSet {
  const { doc, selection } = view.state
  const curLine = doc.lineAt(selection.main.head).number
  const fences = getFences(view)

  const items: Array<{ from: number; to: number; deco: Decoration }> = []
  const push = (from: number, to: number, deco: Decoration) => items.push({ from, to, deco })
  const hide = Decoration.replace({})

  for (let ln = 1; ln <= doc.lines; ln++) {
    if (ln === curLine) continue
    const line = doc.line(ln)
    if (inFenceBody(line.from, fences)) continue
    const text = line.text
    const base = line.from
    let m: RegExpExecArray | null

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(text.trim()) && !/^#+/.test(text)) {
      push(base, line.to, Decoration.replace({ widget: new HrWidget() }))
      continue
    }

    // Heading: hide "# " prefix
    const hm = /^(#{1,6}) /.exec(text)
    if (hm) push(base, base + hm[1].length + 1, hide)

    // Blockquote: hide "> " prefix
    if (/^> /.test(text)) push(base, base + 2, hide)

    // Task list checkbox
    const cbm = /^(\s*[-*+] )\[([x ])\] /.exec(text)
    if (cbm) {
      const markerStart = base + cbm[1].length
      push(markerStart, markerStart + 4,
        Decoration.replace({ widget: new CheckboxWidget(cbm[2] === 'x', markerStart + 1) }))
    }

    // Image: replace whole ![alt](url) with widget
    const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
    while ((m = imgRe.exec(text)) !== null)
      push(base + m.index, base + m.index + m[0].length,
        Decoration.replace({ widget: new ImageWidget(m[1], m[2]) }))

    // Bold markers **
    const boldRe = /\*\*(.+?)\*\*/g
    while ((m = boldRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 2, hide)
      push(base + m.index + m[0].length - 2, base + m.index + m[0].length, hide)
    }

    // Italic markers * (not bold)
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
    while ((m = italicRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide)
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide)
    }

    // Strikethrough markers ~~
    const strikeRe = /~~(.+?)~~/g
    while ((m = strikeRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 2, hide)
      push(base + m.index + m[0].length - 2, base + m.index + m[0].length, hide)
    }

    // Highlight markers ==
    const highlightRe = /==(.+?)==/g
    while ((m = highlightRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 2, hide)
      push(base + m.index + m[0].length - 2, base + m.index + m[0].length, hide)
    }

    // Subscript markers ~
    const subRe = /(?<!~)~(?!~)([^~\n]+?)(?<!~)~(?!~)/g
    while ((m = subRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide)
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide)
    }

    // Superscript markers ^
    const supRe = /\^([^^]+?)\^/g
    while ((m = supRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide)
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide)
    }

    // Inline code markers `
    const codeRe = /`([^`]+)`/g
    while ((m = codeRe.exec(text)) !== null) {
      push(base + m.index, base + m.index + 1, hide)
      push(base + m.index + m[0].length - 1, base + m.index + m[0].length, hide)
    }

    // Link markers [text](url) — hide [ and ](url)
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
    while ((m = linkRe.exec(text)) !== null) {
      if (m.index > 0 && text[m.index - 1] === '!') continue
      push(base + m.index, base + m.index + 1, hide)
      const closeBracket = m.index + 1 + m[1].length
      push(base + closeBracket, base + m.index + m[0].length, hide)
    }
  }

  items.sort((a, b) => a.from !== b.from ? a.from - b.from : a.to - b.to)

  const builder = new RangeSetBuilder<Decoration>()
  let lastTo = -1
  for (const { from, to, deco } of items) {
    if (from >= lastTo && from < to) {
      builder.add(from, to, deco)
      lastTo = to
    }
  }
  return builder.finish()
}

// ── Base theme ────────────────────────────────────────────────────────────────

const markdownTheme = EditorView.baseTheme({
  // Headings
  '.cm-line.cm-md-h1': { fontSize: '2em', fontWeight: '700', lineHeight: '1.3' },
  '.cm-line.cm-md-h2': { fontSize: '1.6em', fontWeight: '700', lineHeight: '1.3' },
  '.cm-line.cm-md-h3': { fontSize: '1.35em', fontWeight: '600', lineHeight: '1.4' },
  '.cm-line.cm-md-h4': { fontSize: '1.15em', fontWeight: '600', lineHeight: '1.4' },
  '.cm-line.cm-md-h5': { fontSize: '1em', fontWeight: '600' },
  '.cm-line.cm-md-h6': { fontSize: '0.9em', fontWeight: '600', opacity: '0.7' },
  // Blockquote
  '.cm-line.cm-md-blockquote': {
    borderLeft: '3px solid var(--accent, #4a90e2)',
    paddingLeft: '1em',
    opacity: '0.8',
    fontStyle: 'italic',
  },
  // Inline marks
  '.cm-md-bold': { fontWeight: '700' },
  '.cm-md-italic': { fontStyle: 'italic' },
  '.cm-md-strike': { textDecoration: 'line-through', opacity: '0.7' },
  '.cm-md-highlight': { backgroundColor: 'rgba(255, 235, 59, 0.35)', borderRadius: '2px' },
  '.cm-md-sub': { fontSize: '0.75em', verticalAlign: 'sub', lineHeight: '0' },
  '.cm-md-sup': { fontSize: '0.75em', verticalAlign: 'super', lineHeight: '0' },
  '.cm-md-code': {
    fontFamily: 'monospace',
    fontSize: '0.9em',
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    borderRadius: '3px',
    padding: '0 3px',
  },
  '.cm-md-link': { color: 'var(--accent, #4a90e2)', textDecoration: 'underline', cursor: 'pointer' },
  // Widgets
  '.cm-md-hr': {
    display: 'block',
    width: '100%',
    height: '0',
    borderTop: '2px solid var(--border, rgba(0,0,0,0.15))',
    margin: '4px 0',
  },
  '.cm-md-checkbox': { cursor: 'pointer', width: '14px', height: '14px', verticalAlign: 'middle', marginRight: '4px' },
  '.cm-md-image': { maxWidth: '100%', maxHeight: '280px', display: 'inline-block', verticalAlign: 'middle', borderRadius: '4px' },
  '.cm-md-image-local': {
    display: 'inline-block',
    padding: '2px 8px',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: '4px',
    fontSize: '0.85em',
    opacity: '0.8',
  },
  // Dark mode overrides
  '&dark .cm-md-code': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  '&dark .cm-md-highlight': { backgroundColor: 'rgba(255, 235, 59, 0.2)' },
  '&dark .cm-md-image-local': { background: 'rgba(255,255,255,0.08)' },
})

// ── Assembly ──────────────────────────────────────────────────────────────────

function makePlugin(buildFn: (view: EditorView) => DecorationSet) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) { this.decorations = buildFn(view) }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged)
          this.decorations = buildFn(u.view)
      }
    },
    { decorations: (v) => v.decorations },
  )
}

export const markdownWYSIWYG: Extension = [
  markdownTheme,
  makePlugin(buildLineDecos),
  makePlugin(buildMarkDecos),
  makePlugin(buildReplaceDecos),
]
