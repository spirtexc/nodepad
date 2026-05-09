import {
  WidgetType, Decoration, type DecorationSet,
  EditorView, ViewPlugin, type ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder, StateField, StateEffect } from '@codemirror/state'
import type { Extension, EditorState } from '@codemirror/state'

// ── Edit-mode tracking ────────────────────────────────────────────────────────

export const setCodeEditing =
  StateEffect.define<{ from: number; to: number } | null>()

interface CodeState {
  editing: { from: number; to: number } | null
  deco: DecorationSet
}

const FENCE_RE = /^```(\w*)\r?\n([\s\S]*?)\r?\n```/gm

function buildDecorations(
  state: EditorState,
  editing: { from: number; to: number } | null,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const text = state.doc.toString()
  FENCE_RE.lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = FENCE_RE.exec(text)) !== null) {
    const lang = m[1].toLowerCase()
    if (lang === 'mermaid') continue  // mermaid plugin handles these

    const blockFrom = m.index
    const blockTo   = m.index + m[0].length
    const code      = m[2]

    const isEditing =
      editing !== null &&
      editing.from === blockFrom &&
      editing.to   === blockTo

    if (!isEditing) {
      builder.add(blockFrom, blockTo, Decoration.replace({
        widget: new CodeBlockWidget(lang || 'text', code, blockFrom, blockTo),
        block: true,
      }))
    }
  }

  return builder.finish()
}

const codeField = StateField.define<CodeState>({
  create(state) {
    return { editing: null, deco: buildDecorations(state, null) }
  },
  update(value, tr) {
    let { editing } = value

    for (const e of tr.effects) {
      if (e.is(setCodeEditing)) editing = e.value
    }
    if (editing && tr.docChanged) {
      editing = {
        from: tr.changes.mapPos(editing.from),
        to:   tr.changes.mapPos(editing.to),
      }
    }

    const decoChanged = tr.docChanged || editing !== value.editing
    const deco = decoChanged
      ? buildDecorations(tr.state, editing)
      : value.deco.map(tr.changes)

    return { editing, deco }
  },
  provide: (f) => EditorView.decorations.from(f, s => s.deco),
})

function enterEditMode(view: EditorView, from: number, to: number, lang: string): void {
  const prefix = `\`\`\`${lang}\n`
  view.dispatch({
    effects: setCodeEditing.of({ from, to }),
    selection: { anchor: Math.min(from + prefix.length, to) },
  })
  view.focus()
}

// ── Cursor watcher ────────────────────────────────────────────────────────────

const codeCursorWatcher = ViewPlugin.fromClass(class {
  update(update: ViewUpdate): void {
    if (!update.selectionSet && !update.docChanged) return
    const { editing } = update.state.field(codeField)
    if (!editing) return
    const cursor = update.state.selection.main.head
    if (cursor < editing.from || cursor > editing.to) {
      update.view.dispatch({ effects: setCodeEditing.of(null) })
    }
  }
})

// ── Code block widget ─────────────────────────────────────────────────────────

const LANG_LABELS: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript',
  py: 'Python', python: 'Python',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  html: 'HTML', css: 'CSS',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  sql: 'SQL',
  go: 'Go', rust: 'Rust', java: 'Java',
  cpp: 'C++', c: 'C', cs: 'C#',
  rb: 'Ruby', ruby: 'Ruby',
  php: 'PHP', swift: 'Swift', kt: 'Kotlin',
}


class CodeBlockWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly code: string,
    readonly blockFrom: number,
    readonly blockTo: number,
  ) { super() }

  eq(other: WidgetType): boolean {
    return (
      other instanceof CodeBlockWidget &&
      other.lang      === this.lang &&
      other.code      === this.code &&
      other.blockFrom === this.blockFrom &&
      other.blockTo   === this.blockTo
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const { lang, code, blockFrom, blockTo } = this

    const wrap = document.createElement('div')
    wrap.className = 'cm-code-block'
    wrap.setAttribute('contenteditable', 'false')

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement('div')
    header.className = 'cm-code-block-header'

    const langLabel = document.createElement('span')
    langLabel.className = 'cm-code-block-lang'
    langLabel.innerHTML =
      `<span class="cm-code-icon" aria-hidden="true">&lt;/&gt;</span> ` +
      escapeHtml(LANG_LABELS[lang] ?? (lang || 'Plain text'))

    const actions = document.createElement('div')
    actions.className = 'cm-code-block-actions'

    // Copy button
    const copyBtn = document.createElement('button')
    copyBtn.className = 'cm-code-block-btn'
    copyBtn.title = 'Copy code'
    copyBtn.innerHTML =
      `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/>` +
      `<path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2"/>` +
      `</svg>`
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.classList.add('cm-code-block-btn--copied')
        setTimeout(() => copyBtn.classList.remove('cm-code-block-btn--copied'), 1500)
      }).catch(() => {})
    })

    actions.appendChild(copyBtn)
    header.appendChild(langLabel)
    header.appendChild(actions)
    wrap.appendChild(header)

    // ── Code body ────────────────────────────────────────────────────────────
    const pre = document.createElement('pre')
    pre.className = 'cm-code-block-body'
    const codeEl = document.createElement('code')
    codeEl.setAttribute('data-lang', lang)
    codeEl.textContent = code
    pre.appendChild(codeEl)
    wrap.appendChild(pre)

    // ── Interactions ─────────────────────────────────────────────────────────
    wrap.addEventListener('dblclick', (e) => {
      e.preventDefault()
      e.stopPropagation()
      enterEditMode(view, blockFrom, blockTo, lang)
    })

    // Edit button appears on hover (added via CSS :hover on the header)
    const editBtn = document.createElement('button')
    editBtn.className = 'cm-code-block-btn cm-code-block-edit'
    editBtn.title = 'Edit code'
    editBtn.textContent = 'Edit'
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      enterEditMode(view, blockFrom, blockTo, lang)
    })
    actions.insertBefore(editBtn, copyBtn)

    requestAnimationFrame(() => view.requestMeasure())

    return wrap
  }

  ignoreEvent(): boolean { return false }
}


function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const codeBlockTheme = EditorView.baseTheme({
  '.cm-code-block': {
    display: 'block',
    margin: '6px 0',
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.08)',
    fontFamily: 'inherit',
  },
  '.cm-code-block-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    userSelect: 'none',
  },
  '.cm-code-block-lang': {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  '.cm-code-icon': {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '-0.5px',
  },
  '.cm-code-block-actions': {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  '.cm-code-block-btn': {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '11px',
    fontFamily: 'inherit',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    lineHeight: '1',
  },
  '.cm-code-block-btn:hover': {
    background: 'rgba(255,255,255,0.13)',
    borderColor: 'rgba(255,255,255,0.3)',
    color: '#fff',
  },
  '.cm-code-block-btn--copied': {
    borderColor: 'rgba(100,220,100,0.5)',
    color: 'rgba(100,220,100,0.9)',
  },
'.cm-code-block-edit': {
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.15s',
  },
  '.cm-code-block:hover .cm-code-block-edit': {
    opacity: '1',
    pointerEvents: 'auto',
  },
  '.cm-code-block-body': {
    margin: '0',
    padding: '16px',
    overflowX: 'auto',
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#d4d4d4',
    fontFamily: `'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace`,
    background: 'transparent',
    tabSize: '2',
  },
  '.cm-code-block-body code': {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    background: 'none',
    padding: '0',
    color: 'inherit',
    whiteSpace: 'pre',
  },
})

// ── Export ────────────────────────────────────────────────────────────────────

export const codeBlockWidgets: Extension = [codeBlockTheme, codeField, codeCursorWatcher]
