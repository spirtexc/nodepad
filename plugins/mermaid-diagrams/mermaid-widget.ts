import {
  WidgetType, Decoration, type DecorationSet,
  EditorView, ViewPlugin, type ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state'
import type { Extension, EditorState } from '@codemirror/state'
import mermaid from 'mermaid'

let idCounter = 0

function getTheme(): 'dark' | 'default' {
  return document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'default'
}

// ── Edit-mode tracking ────────────────────────────────────────────────────────

export const setMermaidEditing =
  StateEffect.define<{ from: number; to: number } | null>()

// Combined state: both the editing position and the decoration set live here
// so the two never fall out of sync and there is no inter-field dependency.
interface MermaidState {
  editing: { from: number; to: number } | null
  deco: DecorationSet
}

function buildDecorations(
  state: EditorState,
  editing: { from: number; to: number } | null,
): DecorationSet {
  const text = state.doc.toString()
  const builder = new RangeSetBuilder<Decoration>()
  const re = /^```mermaid\r?\n([\s\S]*?)\r?\n```/gm
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    const blockFrom = m.index
    const blockTo   = m.index + m[0].length
    const code      = m[1]

    const isEditing =
      editing !== null &&
      editing.from === blockFrom &&
      editing.to   === blockTo

    if (isEditing) {
      // Edit mode: raw code is visible; live preview widget goes directly below
      builder.add(blockTo, blockTo, Decoration.widget({
        widget: new MermaidPreviewWidget(code),
        side: 1,
        block: true,
      }))
    } else {
      // Reading mode: REPLACE the entire block with the rendered diagram widget
      // This hides the raw code and shows only the diagram
      builder.add(blockFrom, blockTo, Decoration.replace({
        widget: new MermaidWidget(code, blockFrom, blockTo),
        block: true,
      }))
    }
  }

  return builder.finish()
}

// Single StateField — the same pattern that was confirmed working before.
// Keeping it as one field avoids any inter-field dependency ordering issues
// that can arise when multiple StateFields are added via the same compartment
// reconfigure pass.
const mermaidField = StateField.define<MermaidState>({
  create(state) {
    return { editing: null, deco: buildDecorations(state, null) }
  },
  update(value, tr) {
    let { editing } = value

    for (const e of tr.effects) {
      if (e.is(setMermaidEditing)) editing = e.value
    }
    if (editing && tr.docChanged) {
      editing = {
        from: tr.changes.mapPos(editing.from),
        to:   tr.changes.mapPos(editing.to),
      }
    }

    const decoChanged =
      tr.docChanged || editing !== value.editing
    const deco = decoChanged
      ? buildDecorations(tr.state, editing)
      : value.deco.map(tr.changes)

    return { editing, deco }
  },
  provide: (f) => EditorView.decorations.from(f, s => s.deco),
})

function enterEditMode(view: EditorView, from: number, to: number): void {
  const codeStart = from + '```mermaid\n'.length
  view.dispatch({
    effects: setMermaidEditing.of({ from, to }),
    selection: { anchor: Math.min(codeStart, to) },
  })
  view.focus()
}

// ── Reading-mode widget ───────────────────────────────────────────────────────

class MermaidWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly blockFrom: number,
    readonly blockTo: number,
  ) { super() }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cm-mermaid-widget'
    wrap.setAttribute('contenteditable', 'false')

    const diagram = document.createElement('div')
    diagram.className = 'cm-mermaid-diagram'
    wrap.appendChild(diagram)

    const toolbar = document.createElement('div')
    toolbar.className = 'cm-mermaid-toolbar'

    const editBtn = document.createElement('button')
    editBtn.className = 'cm-mermaid-toolbar-btn'
    editBtn.textContent = 'Edit'
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      enterEditMode(view, this.blockFrom, this.blockTo)
    })

    const copyBtn = document.createElement('button')
    copyBtn.className = 'cm-mermaid-toolbar-btn'
    copyBtn.textContent = 'Copy SVG'
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const svg = diagram.querySelector('svg')?.outerHTML ?? ''
      navigator.clipboard.writeText(svg).catch(() => {})
    })

    toolbar.appendChild(editBtn)
    toolbar.appendChild(copyBtn)
    wrap.appendChild(toolbar)

    const id = `mermaid-cm-${++idCounter}`
    mermaid.initialize({ startOnLoad: false, theme: getTheme() })
    mermaid.render(id, this.code).then(({ svg }) => {
      diagram.innerHTML = svg
      const svgEl = diagram.querySelector('svg')
      if (svgEl) {
        svgEl.style.maxWidth = '100%'
        svgEl.removeAttribute('height')
      }
    }).catch(() => {
      diagram.innerHTML =
        '<span class="cm-mermaid-error">Invalid Mermaid syntax</span>'
    })

    wrap.addEventListener('dblclick', (e) => {
      e.preventDefault()
      e.stopPropagation()
      enterEditMode(view, this.blockFrom, this.blockTo)
    })

    wrap.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      showContextMenu(e.clientX, e.clientY, [
        {
          label: 'Edit diagram',
          action: () => enterEditMode(view, this.blockFrom, this.blockTo),
        },
      ])
    })

    return wrap
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof MermaidWidget &&
      other.code      === this.code &&
      other.blockFrom === this.blockFrom &&
      other.blockTo   === this.blockTo
    )
  }

  ignoreEvent(): boolean { return false }
}

// ── Edit-mode preview widget ──────────────────────────────────────────────────
// Layout uses a flex column so CSS alone can switch to horizontal later:
//   .cm-mermaid-preview                  flex container (column by default)
//     .cm-mermaid-preview-label          header
//     .cm-mermaid-preview-content        SVG area
// Future: add class "layout-horizontal" → flex-direction: row

let debounceTimer: ReturnType<typeof setTimeout> | null = null

class MermaidPreviewWidget extends WidgetType {
  constructor(readonly code: string) { super() }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cm-mermaid-preview'
    wrap.setAttribute('contenteditable', 'false')
    wrap.dataset['code'] = this.code

    const label = document.createElement('div')
    label.className = 'cm-mermaid-preview-label'

    const labelText = document.createElement('span')
    labelText.textContent = 'Live Preview'
    label.appendChild(labelText)

    // Yellow close button
    const closeBtn = document.createElement('button')
    closeBtn.className = 'cm-mermaid-preview-close'
    closeBtn.title = 'Exit edit mode'
    closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="6" fill="#f5a623"/><line x1="3.5" y1="3.5" x2="8.5" y2="8.5" stroke="#7a4f00" stroke-width="1.5" stroke-linecap="round"/><line x1="8.5" y1="3.5" x2="3.5" y2="8.5" stroke="#7a4f00" stroke-width="1.5" stroke-linecap="round"/></svg>`
    closeBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      view.dispatch({ effects: setMermaidEditing.of(null) })
      view.focus()
    })
    label.appendChild(closeBtn)

    wrap.appendChild(label)

    const content = document.createElement('div')
    content.className = 'cm-mermaid-preview-content'
    wrap.appendChild(content)

    renderMermaid(content, this.code)
    return wrap
  }

  updateDOM(dom: HTMLElement): boolean {
    if (dom.dataset['code'] === this.code) return true
    dom.dataset['code'] = this.code
    const content =
      dom.querySelector<HTMLElement>('.cm-mermaid-preview-content')
    if (!content) return false

    if (debounceTimer !== null) clearTimeout(debounceTimer)
    const code = this.code
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      renderMermaid(content, code)
    }, 300)
    return true
  }

  eq(other: WidgetType): boolean {
    return other instanceof MermaidPreviewWidget && other.code === this.code
  }

  ignoreEvent(): boolean { return false }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function renderMermaid(container: HTMLElement, code: string): void {
  const id = `mermaid-preview-${++idCounter}`
  mermaid.initialize({ startOnLoad: false, theme: getTheme() })
  mermaid.render(id, code)
    .then(({ svg }) => {
      container.innerHTML = svg
      const svgEl = container.querySelector('svg')
      if (svgEl) {
        svgEl.style.maxWidth = '100%'
        svgEl.removeAttribute('height')
      }
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Invalid Mermaid syntax'
      container.innerHTML =
        `<div class="cm-mermaid-error">${escapeHtml(msg)}</div>`
    })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function showContextMenu(
  x: number,
  y: number,
  items: { label: string; action: () => void }[],
): void {
  document.querySelector('.cm-mermaid-context-menu')?.remove()

  const menu = document.createElement('div')
  menu.className = 'cm-mermaid-context-menu'
  menu.style.left = `${x}px`
  menu.style.top  = `${y}px`

  for (const item of items) {
    const btn = document.createElement('button')
    btn.textContent = item.label
    btn.addEventListener('click', () => { item.action(); menu.remove() })
    menu.appendChild(btn)
  }

  document.body.appendChild(menu)

  setTimeout(() => {
    const close = (e: Event) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove()
        document.removeEventListener('mousedown', close)
      }
    }
    document.addEventListener('mousedown', close)
  }, 0)
}

// ── Cursor watcher ────────────────────────────────────────────────────────────
// Exits edit mode when the cursor moves outside the active block.

const mermaidCursorWatcher = ViewPlugin.fromClass(class {
  update(update: ViewUpdate): void {
    if (!update.selectionSet && !update.docChanged) return
    const { editing } = update.state.field(mermaidField)
    if (!editing) return
    const cursor = update.state.selection.main.head
    if (cursor < editing.from || cursor > editing.to) {
      update.view.dispatch({ effects: setMermaidEditing.of(null) })
    }
  }
})

// ── Exported extension ────────────────────────────────────────────────────────

export const mermaidWidgets: Extension = [mermaidField, mermaidCursorWatcher]
