import type { Plugin, App } from '../../src/plugin-api/index.ts'
import * as d3 from 'd3'

// ── Heading parser ─────────────────────────────────────────────────────────────

interface HeadingNode {
  text: string
  level: number
  children: HeadingNode[]
}

function parseHeadings(content: string, filename: string): HeadingNode {
  const root: HeadingNode = { text: filename.replace(/\.md$/i, ''), level: 0, children: [] }
  const stack: HeadingNode[] = [root]

  for (const line of content.split('\n')) {
    const m = /^(#{1,6})\s+(.+)/.exec(line)
    if (!m) continue
    const level = m[1].length
    const node: HeadingNode = { text: m[2].trim(), level, children: [] }
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }

  return root
}

// ── D3 tree renderer ──────────────────────────────────────────────────────────

const LEVEL_COLORS = ['#89b4fa', '#cba6f7', '#f38ba8', '#fab387', '#a6e3a1', '#89dceb', '#f9e2af']

function renderTree(container: HTMLElement, rootData: HeadingNode): void {
  container.innerHTML = ''
  const W = container.clientWidth || 800
  const H = container.clientHeight || 500

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('display', 'block')

  const g = svg.append('g')

  svg.call(
    d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on('zoom', (event) => g.attr('transform', event.transform)),
  )

  const hierarchy = d3.hierarchy(rootData, d => d.children)
  d3.tree<HeadingNode>().nodeSize([34, 230])(hierarchy)

  const nodes = hierarchy.descendants() as d3.HierarchyPointNode<HeadingNode>[]
  const ys = nodes.map(d => d.x)
  const offsetX = 80
  const offsetY = H / 2 - (Math.min(...ys) + Math.max(...ys)) / 2

  // Links
  g.append('g')
    .attr('fill', 'none')
    .attr('stroke', 'var(--border)')
    .attr('stroke-width', 1.5)
    .selectAll('path')
    .data(hierarchy.links())
    .join('path')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .attr('d', (d3.linkHorizontal() as any)
      .x((d: d3.HierarchyPointNode<HeadingNode>) => d.y + offsetX)
      .y((d: d3.HierarchyPointNode<HeadingNode>) => d.x + offsetY),
    )

  // Nodes
  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('transform', d => `translate(${d.y + offsetX},${d.x + offsetY})`)

  node.append('circle')
    .attr('r', 5)
    .attr('fill', d => LEVEL_COLORS[d.data.level] ?? LEVEL_COLORS[0])
    .attr('stroke', 'var(--bg-primary)')
    .attr('stroke-width', 2)

  node.append('text')
    .attr('dy', '0.32em')
    .attr('x', d => (d.children?.length ? -10 : 10))
    .attr('text-anchor', d => (d.children?.length ? 'end' : 'start'))
    .attr('fill', 'var(--text-primary)')
    .attr('font-size', d => `${Math.max(10, 14 - d.depth)}px`)
    .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
    .text(d => d.data.text.length > 42 ? d.data.text.slice(0, 40) + '…' : d.data.text)
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const STYLES = `
.mindmap-modal {
  width: 84vw;
  height: 80vh;
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.mindmap-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.mindmap-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mindmap-hint {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.mindmap-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.mindmap-close:hover { color: var(--text-primary); }
.mindmap-canvas {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.mindmap-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-secondary);
}
`

function buildMindmapModal(content: string, filename: string, close: () => void): HTMLElement {
  const root = parseHeadings(content, filename)

  const wrap = document.createElement('div')
  wrap.className = 'mindmap-modal'

  const header = document.createElement('div')
  header.className = 'mindmap-header'

  const title = document.createElement('span')
  title.className = 'mindmap-title'
  title.textContent = `Mindmap — ${filename}`

  const hint = document.createElement('span')
  hint.className = 'mindmap-hint'
  hint.textContent = 'Scroll to zoom · Drag to pan'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'mindmap-close'
  closeBtn.title = 'Close'
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  closeBtn.addEventListener('click', close)

  header.appendChild(title)
  header.appendChild(hint)
  header.appendChild(closeBtn)
  wrap.appendChild(header)

  if (root.children.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'mindmap-empty'
    empty.textContent = 'No headings found in this file.'
    wrap.appendChild(empty)
    return wrap
  }

  const canvas = document.createElement('div')
  canvas.className = 'mindmap-canvas'
  wrap.appendChild(canvas)

  requestAnimationFrame(() => renderTree(canvas, root))

  return wrap
}

// ── Plugin ─────────────────────────────────────────────────────────────────────

let styleEl: HTMLStyleElement | null = null

const plugin: Plugin = {
  id: 'mindmap',
  name: 'Mindmap',
  version: '1.0.0',
  permissions: ['read-files', 'ui-panels'],

  onLoad(app: App): void {
    styleEl = document.createElement('style')
    styleEl.textContent = STYLES
    document.head.appendChild(styleEl)

    app.addSidebarIcon(
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="12" y1="13" x2="5" y2="17"/><line x1="12" y1="13" x2="19" y2="17"/></svg>`,
      'Mindmap',
      () => {
        const file = app.getActiveFile()
        if (!file) { alert('Open a file first.'); return }
        void app.readFile(file.path).then(content => {
          let closeFn: (() => void) | null = null
          const modal = buildMindmapModal(content, file.name, () => closeFn?.())
          closeFn = app.openModal(modal)
        })
      },
    )
  },

  onUnload(): void {
    styleEl?.remove()
    styleEl = null
  },
}

export default plugin
