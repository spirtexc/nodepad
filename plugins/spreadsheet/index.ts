import {
  Decoration, EditorView, WidgetType,
  type DecorationSet,
} from '@codemirror/view'
import {
  StateEffect, StateField, RangeSetBuilder,
} from '@codemirror/state'
import type { EditorState, Extension } from '@codemirror/state'
import type { Plugin, App } from '../../src/plugin-api/index.ts'
import type { Permission } from '../../src/plugin-api/index.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedTable {
  headers: string[]
  rows: string[][]
}

interface TableRange {
  from: number
  to: number
  raw: string
}

// ── Markdown table parsing ────────────────────────────────────────────────────

function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length < 2) return null
  if (!/^\|[\s|:-]+\|$/.test(lines[1] ?? '')) return null

  const parseRow = (line: string): string[] =>
    line.replace(/^\||\|$/g, '').split('|').map(c => c.trim())

  return {
    headers: parseRow(lines[0] ?? ''),
    rows: lines.slice(2).map(parseRow),
  }
}

function serializeTable(parsed: ParsedTable): string {
  const { headers, rows } = parsed
  const n = headers.length
  const widths = Array.from({ length: n }, (_, i) =>
    Math.max(3, (headers[i] ?? '').length, ...rows.map(r => (r[i] ?? '').length))
  )
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))
  const makeRow = (cells: string[]) =>
    '| ' + Array.from({ length: n }, (_, i) => pad(cells[i] ?? '', widths[i]!)).join(' | ') + ' |'
  const makeSep = () => '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |'
  return [makeRow(headers), makeSep(), ...rows.map(r => makeRow(r))].join('\n')
}

// ── Document scanning ─────────────────────────────────────────────────────────

function findTableRanges(state: EditorState): TableRange[] {
  const { doc } = state
  const ranges: TableRange[] = []
  let i = 1

  while (i <= doc.lines) {
    const line = doc.line(i)
    if (line.text.trimStart().startsWith('|')) {
      let end = i
      while (end < doc.lines && doc.line(end + 1).text.trimStart().startsWith('|')) {
        end++
      }
      const from = line.from
      const to = doc.line(end).to
      const raw = doc.sliceString(from, to)
      const textLines = raw.split('\n')
      // Require at least header + separator, and a valid separator row
      if (textLines.length >= 2 && /^\|[\s|:-]+\|$/.test((textLines[1] ?? '').trim())) {
        ranges.push({ from, to, raw })
      }
      i = end + 1
    } else {
      i++
    }
  }

  return ranges
}

// ── Inline markdown renderer ──────────────────────────────────────────────────

function renderInlineMarkdown(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  type Pattern = { re: RegExp; render: (match: RegExpExecArray) => string }
  const patterns: Pattern[] = [
    { re: /\*\*(.+?)\*\*/, render: m => `<strong>${esc(m[1]!)}</strong>` },
    { re: /~~(.+?)~~/,     render: m => `<s>${esc(m[1]!)}</s>` },
    { re: /`([^`]+)`/,     render: m => `<code>${esc(m[1]!)}</code>` },
    { re: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/, render: m => `<em>${esc(m[1]!)}</em>` },
    { re: /\[([^\]]+)\]\(([^)]+)\)/,
      render: m => `<a href="${esc(m[2]!)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${esc(m[1]!)}</a>` },
  ]

  let result = ''
  let remaining = text

  while (remaining.length > 0) {
    let earliest: { index: number; m: RegExpExecArray; render: (m: RegExpExecArray) => string } | null = null

    for (const { re, render } of patterns) {
      const found = new RegExp(re.source, 'u').exec(remaining)
      if (found && (earliest === null || found.index < earliest.index))
        earliest = { index: found.index, m: found, render }
    }

    if (earliest === null) { result += esc(remaining); break }
    result += esc(remaining.slice(0, earliest.index))
    result += earliest.render(earliest.m)
    remaining = remaining.slice(earliest.index + earliest.m[0].length)
  }

  return result
}

// ── Edit-mode tracking ────────────────────────────────────────────────────────

const setTableEditing = StateEffect.define<{ from: number; to: number } | null>()

// ── Widget ────────────────────────────────────────────────────────────────────

class TableWidget extends WidgetType {
  constructor(
    readonly raw: string,
    readonly from: number,
    readonly to: number,
  ) { super() }

  eq(other: WidgetType): boolean {
    return (
      other instanceof TableWidget &&
      other.raw === this.raw &&
      other.from === this.from &&
      other.to === this.to
    )
  }

  toDOM(view: EditorView): HTMLElement {
    const parsed = parseMarkdownTable(this.raw)

    const container = document.createElement('div')
    container.className = 'cm-spreadsheet'
    container.setAttribute('contenteditable', 'false')

    if (!parsed) {
      container.textContent = this.raw
      return container
    }

    // Capture widget positions in locals for use in closures
    const widgetFrom = this.from
    const widgetTo = this.to
    const widgetRaw = this.raw

    const { headers } = parsed

    // ── Table element ──────────────────────────────────────────────────────

    const table = document.createElement('table')
    table.className = 'cm-spreadsheet-table'

    const thead = table.createTHead()
    const headerTr = thead.insertRow()

    headers.forEach((h, colIdx) => {
      headerTr.appendChild(makeHeaderCell(h, colIdx))
    })

    const actionTh = document.createElement('th')
    actionTh.className = 'cm-spreadsheet-action-col'
    headerTr.appendChild(actionTh)

    function makeCell(value: string, isHeader: boolean): HTMLElement {
      const wrap = document.createElement('div')
      wrap.className = 'cm-spreadsheet-cell-wrap'

      const view = document.createElement('span')
      view.className = isHeader ? 'cm-spreadsheet-header-view' : 'cm-spreadsheet-cell-view'
      view.innerHTML = renderInlineMarkdown(value)

      const input = document.createElement('input')
      input.type = 'text'
      input.name = 'cell'
      input.autocomplete = 'off'
      input.value = value
      input.className = isHeader ? 'cm-spreadsheet-header-input' : 'cm-spreadsheet-cell-input'
      input.style.display = 'none'
      input.addEventListener('keydown', inputKeydown)
      input.addEventListener('blur', () => {
        view.innerHTML = renderInlineMarkdown(input.value)
        input.style.display = 'none'
        view.style.display = ''
        commit()
      })

      view.addEventListener('click', () => {
        view.style.display = 'none'
        input.style.display = ''
        input.focus()
        input.select()
      })

      wrap.appendChild(view)
      wrap.appendChild(input)
      return wrap
    }

    function makeHeaderCell(text: string, _colIdx: number): HTMLTableCellElement {
      const th = document.createElement('th')
      th.className = 'cm-spreadsheet-th'

      const cell = makeCell(text, true)
      const delCol = document.createElement('button')
      delCol.className = 'cm-spreadsheet-del-col'
      delCol.title = 'Delete column'
      delCol.textContent = '×'
      delCol.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const colIndex = Array.from(headerTr.cells).indexOf(th)
        if (colIndex < 0) return
        th.remove()
        for (const row of tbody.rows) {
          row.deleteCell(colIndex)
        }
        commit()
      })

      th.appendChild(cell)
      th.appendChild(delCol)
      return th
    }

    const tbody = table.createTBody()
    parsed.rows.forEach(r => appendRow(r))

    function appendRow(cells: string[] = []) {
      const tr = tbody.insertRow()
      const n = headerTr.cells.length - 1
      for (let i = 0; i < n; i++) {
        const td = tr.insertCell()
        td.appendChild(makeCell(cells[i] ?? '', false))
      }
      const actionTd = tr.insertCell()
      actionTd.className = 'cm-spreadsheet-action-col'
      const del = document.createElement('button')
      del.className = 'cm-spreadsheet-del-row'
      del.title = 'Delete row'
      del.textContent = '×'
      del.addEventListener('mousedown', (e) => {
        e.preventDefault()
        tr.remove()
        commit()
      })
      actionTd.appendChild(del)
    }

    function inputKeydown(e: KeyboardEvent): void {
      e.stopPropagation()
      if (e.key === 'Enter') {
        e.preventDefault()
        ;(e.target as HTMLElement).blur()
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input'))
        const idx = inputs.indexOf(e.target as HTMLInputElement)
        const next = inputs[e.shiftKey ? idx - 1 : idx + 1]
        next?.focus()
      }
    }

    function colCount(): number { return headerTr.cells.length - 1 }

    function readHeaders(): string[] {
      return Array.from({ length: colCount() }, (_, i) =>
        (headerTr.cells[i]?.querySelector<HTMLInputElement>('input')?.value ?? '').trim()
      )
    }

    function readRows(): string[][] {
      return Array.from(tbody.rows).map(row =>
        Array.from({ length: colCount() }, (_, i) =>
          (row.cells[i]?.querySelector<HTMLInputElement>('input')?.value ?? '').trim()
        )
      )
    }

    function commit(): void {
      const newMd = serializeTable({ headers: readHeaders(), rows: readRows() })
      if (newMd === widgetRaw) return
      view.dispatch({ changes: { from: widgetFrom, to: widgetTo, insert: newMd } })
    }

    container.appendChild(table)

    // ── Toolbar ────────────────────────────────────────────────────────────

    const toolbar = document.createElement('div')
    toolbar.className = 'cm-spreadsheet-toolbar'

    const addRowBtn = makeBtn('+ Row', () => {
      appendRow()
      const lastRow = tbody.rows[tbody.rows.length - 1]
      lastRow?.cells[0]?.querySelector<HTMLInputElement>('input')?.focus()
    })

    const addColBtn = makeBtn('+ Col', () => {
      const newIdx = colCount()
      const th = makeHeaderCell(`Col ${newIdx + 1}`, newIdx)
      headerTr.insertBefore(th, headerTr.cells[newIdx]!)

      for (const tr of tbody.rows) {
        const td = document.createElement('td')
        td.appendChild(makeCell('', false))
        tr.insertBefore(td, tr.cells[newIdx]!)
      }
      commit()
    })

    const editRawBtn = makeBtn('Edit raw', () => {
      view.dispatch({
        effects: setTableEditing.of({ from: widgetFrom, to: widgetTo }),
        selection: { anchor: widgetFrom },
      })
      view.focus()
    })
    editRawBtn.className += ' cm-spreadsheet-edit-raw'
    editRawBtn.title = 'Click to edit as Markdown'

    toolbar.appendChild(addRowBtn)
    toolbar.appendChild(addColBtn)
    toolbar.appendChild(editRawBtn)
    container.appendChild(toolbar)

    // After the widget is inserted into the DOM the browser lays it out.
    // CM6 measures block-widget heights before layout completes, leaving a
    // stale height map that shifts click→position mapping for everything below.
    // A second requestMeasure after the frame corrects this.
    requestAnimationFrame(() => view.requestMeasure())

    return container
  }

  ignoreEvent(): boolean { return false }
}

function makeBtn(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'cm-spreadsheet-btn'
  btn.textContent = label
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); onClick() })
  return btn
}

// ── StateField ────────────────────────────────────────────────────────────────

interface SpreadsheetState {
  editing: { from: number; to: number } | null
  deco: DecorationSet
}

function buildDecorations(
  state: EditorState,
  editing: { from: number; to: number } | null,
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to, raw } of findTableRanges(state)) {
    const inEditMode =
      editing !== null && editing.from === from && editing.to === to

    if (inEditMode) continue  // show raw Markdown

    builder.add(
      from, to,
      Decoration.replace({
        widget: new TableWidget(raw, from, to),
        block: true,
      }),
    )
  }

  return builder.finish()
}

const spreadsheetField = StateField.define<SpreadsheetState>({
  create(state) {
    return { editing: null, deco: buildDecorations(state, null) }
  },
  update(value, tr) {
    let { editing } = value

    for (const e of tr.effects) {
      if (e.is(setTableEditing)) editing = e.value
    }
    if (editing && tr.docChanged) {
      editing = {
        from: tr.changes.mapPos(editing.from),
        to: tr.changes.mapPos(editing.to),
      }
    }

    // Exit edit mode if cursor moved outside the editing table
    if (editing && tr.selection) {
      const cursor = tr.newSelection.main.head
      if (cursor < editing.from || cursor > editing.to) {
        editing = null
      }
    }

    const changed = tr.docChanged || editing !== value.editing
    const deco = changed ? buildDecorations(tr.state, editing) : value.deco.map(tr.changes)

    return { editing, deco }
  },
  provide: f => EditorView.decorations.from(f, s => s.deco),
})

// ── Theme ─────────────────────────────────────────────────────────────────────

const spreadsheetTheme = EditorView.baseTheme({
  '.cm-spreadsheet': {
    display: 'block',
    margin: '6px 0',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    overflow: 'auto',
  },
  '.cm-spreadsheet-table': {
    borderCollapse: 'collapse',
    width: '100%',
    fontSize: '13px',
    background: 'var(--bg-primary)',
  },
  '.cm-spreadsheet-table th, .cm-spreadsheet-table td': {
    border: '1px solid var(--border)',
    padding: '0',
    minWidth: '80px',
    position: 'relative',
  },
  '.cm-spreadsheet-table th': {
    background: 'var(--bg-secondary)',
    fontWeight: '600',
    textAlign: 'left',
  },
  '.cm-spreadsheet-th': {
    paddingRight: '0 !important',
  },
  // Cell wrapper — fills the cell
  '.cm-spreadsheet-cell-wrap': {
    display: 'block',
    width: '100%',
  },
  // Display spans — shown when not editing
  '.cm-spreadsheet-header-view, .cm-spreadsheet-cell-view': {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '5px 10px',
    cursor: 'text',
    minHeight: '28px',
    wordBreak: 'break-word',
    lineHeight: '1.4',
  },
  '.cm-spreadsheet-header-view': {
    fontWeight: '600',
    paddingRight: '24px',
  },
  '.cm-spreadsheet-cell-view a': {
    color: 'var(--accent)',
    textDecoration: 'underline',
  },
  '.cm-spreadsheet-cell-view code, .cm-spreadsheet-header-view code': {
    fontFamily: 'monospace',
    fontSize: '0.9em',
    background: 'rgba(0,0,0,0.07)',
    borderRadius: '3px',
    padding: '0 3px',
  },
  // Inputs inside cells — shown only while editing
  '.cm-spreadsheet-header-input, .cm-spreadsheet-cell-input': {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    border: 'none',
    outline: 'none',
    background: 'color-mix(in srgb, var(--accent) 8%, var(--bg-primary))',
    boxShadow: 'inset 0 0 0 2px var(--accent)',
    font: 'inherit',
    color: 'inherit',
    padding: '5px 10px',
    margin: '0',
  },
  '.cm-spreadsheet-header-input': {
    fontWeight: '600',
    paddingRight: '24px',
  },
  '.cm-spreadsheet-del-col': {
    position: 'absolute',
    top: '50%',
    right: '3px',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1',
    padding: '0 2px',
    opacity: '0',
    transition: 'opacity 0.1s',
    borderRadius: '3px',
  },
  '.cm-spreadsheet-table th:hover .cm-spreadsheet-del-col': {
    opacity: '0.6',
  },
  '.cm-spreadsheet-table th:hover .cm-spreadsheet-del-col:hover': {
    opacity: '1',
    color: '#e55',
    background: 'color-mix(in srgb, #e55 12%, transparent)',
  },
  '.cm-spreadsheet-action-col': {
    width: '28px !important',
    minWidth: '0 !important',
    padding: '0 !important',
    border: 'none !important',
    background: 'transparent !important',
  },
  '.cm-spreadsheet-del-row': {
    display: 'block',
    width: '100%',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1.4',
    opacity: '0',
    transition: 'opacity 0.1s',
  },
  '.cm-spreadsheet-table tr:hover .cm-spreadsheet-del-row': {
    opacity: '0.6',
  },
  '.cm-spreadsheet-table tr:hover .cm-spreadsheet-del-row:hover': {
    opacity: '1',
    color: '#e55',
  },
  '.cm-spreadsheet-toolbar': {
    display: 'flex',
    gap: '6px',
    padding: '5px 8px',
    borderTop: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },
  '.cm-spreadsheet-btn': {
    fontSize: '12px',
    padding: '2px 10px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    cursor: 'pointer',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    transition: 'background 0.1s',
  },
  '.cm-spreadsheet-btn:hover': {
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
  },
  '.cm-spreadsheet-edit-raw': {
    marginLeft: 'auto',
    opacity: '0.6',
  },
  '.cm-spreadsheet-edit-raw:hover': {
    opacity: '1',
  },
})

const spreadsheetExtension: Extension = [spreadsheetField, spreadsheetTheme]

// ── Plugin export ─────────────────────────────────────────────────────────────

function makeSpreadsheetPlugin(): Plugin {
  let removeExt: (() => void) | null = null

  return {
    id: 'spreadsheet',
    name: 'Spreadsheet Tables',
    version: '1.0.0',
    permissions: ['editor'] as Permission[],

    onLoad(app: App) {
      removeExt = app.addEditorExtension(spreadsheetExtension)
    },

    onUnload() {
      removeExt?.()
      removeExt = null
    },
  }
}

export default makeSpreadsheetPlugin()
