import * as d3 from 'd3'
import type { Plugin, App } from '../../src/plugin-api/index.ts'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  path: string
  degree: number
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

async function buildGraph(app: App): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const files = app.listFiles()

  // Build multiple lookup keys per file so wikilinks like [[readme]], [[folder/readme]],
  // and [[folder/readme.md]] all resolve to the right node.
  const lookup = new Map<string, string>()
  for (const f of files) {
    const pathNoExt = f.path.replace(/\.md$/i, '').toLowerCase()
    const nameNoExt = f.name.replace(/\.md$/i, '').toLowerCase()
    lookup.set(f.path.toLowerCase(), f.path)       // full path with ext
    lookup.set(pathNoExt, f.path)                   // full path without ext
    lookup.set(nameNoExt, f.path)                   // bare name without ext
  }

  const nodes: GraphNode[] = files.map(f => ({
    id: f.path,
    name: f.name.replace(/\.md$/i, ''),
    path: f.path,
    degree: 0,
  }))

  const degreeMap = new Map<string, number>(nodes.map(n => [n.id, 0]))
  const links: GraphLink[] = []
  const seen = new Set<string>()

  for (const f of files) {
    let content = ''
    try { content = await app.readFile(f.path) } catch { continue }
    for (const m of content.matchAll(WIKILINK_RE)) {
      const raw = m[1]!.trim().toLowerCase()
      const targetPath = lookup.get(raw)
      if (!targetPath || targetPath === f.path) continue
      const key = [f.path, targetPath].sort().join('\0')
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: f.path, target: targetPath })
      degreeMap.set(f.path, (degreeMap.get(f.path) ?? 0) + 1)
      degreeMap.set(targetPath, (degreeMap.get(targetPath) ?? 0) + 1)
    }
  }

  for (const n of nodes) n.degree = degreeMap.get(n.id) ?? 0
  return { nodes, links }
}

const STYLES = `
.graph-modal {
  width: 92vw;
  max-width: 1200px;
  height: 85vh;
  background: var(--bg-primary);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.graph-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 8px;
}
.graph-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}
.graph-hint {
  font-size: 12px;
  color: var(--text-secondary);
}
.graph-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 2px;
  display: flex;
  align-items: center;
}
.graph-close-btn:hover { color: var(--text-primary); }
.graph-canvas {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.graph-canvas svg {
  width: 100%;
  height: 100%;
}
.graph-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--text-secondary);
}
.graph-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
.graph-node { cursor: pointer; }
.graph-node circle { transition: r .15s; }
.graph-node text {
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  pointer-events: none;
  user-select: none;
}
.graph-link { stroke-opacity: 0.4; }
`

let styleEl: HTMLStyleElement | null = null

const plugin: Plugin = {
  id: 'graph-view',
  name: 'Graph View',
  version: '1.0.0',
  permissions: ['read-files', 'ui-panels'],

  onLoad(app: App): void {
    styleEl = document.createElement('style')
    styleEl.textContent = STYLES
    document.head.appendChild(styleEl)

    app.addSidebarIcon(
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="19" r="2"/><line x1="7" y1="5" x2="17" y2="5"/><line x1="5" y1="7" x2="5" y2="17"/><line x1="7" y1="19" x2="10" y2="19"/><line x1="17" y1="7" x2="14" y2="19"/></svg>`,
      'Graph View',
      () => openGraphModal(app),
    )
  },

  onUnload(): void {
    styleEl?.remove()
    styleEl = null
  },
}

function openGraphModal(app: App): void {
  const modal = document.createElement('div')
  modal.className = 'graph-modal'

  const header = document.createElement('div')
  header.className = 'graph-header'

  const title = document.createElement('span')
  title.className = 'graph-title'
  title.textContent = 'Graph View'

  const hint = document.createElement('span')
  hint.className = 'graph-hint'
  hint.textContent = 'Click node to open · Scroll to zoom · Drag to pan'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'graph-close-btn'
  closeBtn.title = 'Close'
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

  header.appendChild(title)
  header.appendChild(hint)
  header.appendChild(closeBtn)
  modal.appendChild(header)

  const canvas = document.createElement('div')
  canvas.className = 'graph-canvas'
  modal.appendChild(canvas)

  const loading = document.createElement('div')
  loading.className = 'graph-loading'
  loading.textContent = 'Building graph…'
  canvas.appendChild(loading)

  const close = app.openModal(modal)
  closeBtn.addEventListener('click', close)

  const activeFile = app.getActiveFile()
  let activeNodeId = activeFile?.path ?? null

  buildGraph(app).then(({ nodes, links }) => {
    loading.remove()

    if (nodes.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'graph-empty'
      empty.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg><span>No files in vault</span>`
      canvas.appendChild(empty)
      return
    }

    renderGraph(canvas, nodes, links, activeNodeId, (path) => {
      close()
      void app.openFile(path)
    })
  }).catch(() => {
    loading.textContent = 'Failed to build graph.'
  })
}

function renderGraph(
  container: HTMLElement,
  nodes: GraphNode[],
  links: GraphLink[],
  activeNodeId: string | null,
  onNodeClick: (path: string) => void,
): void {
  const rect = container.getBoundingClientRect()
  const W = rect.width || 800
  const H = rect.height || 600

  const isDark = document.documentElement.dataset['theme'] === 'dark'
  const colorDefault = isDark ? '#4a5568' : '#a0aec0'
  const colorActive  = isDark ? '#89b4fa' : '#4a90e2'
  const colorLinked  = isDark ? '#74c7ec' : '#63b3ed'
  const linkColor    = isDark ? '#4a5568' : '#cbd5e0'
  const textColor    = isDark ? '#cdd6f4' : '#1a1a1a'

  const nodeRadius = (d: GraphNode) => Math.max(5, Math.min(18, 5 + d.degree * 2.5))

  const svg = d3.select(container).append('svg')
    .attr('width', '100%')
    .attr('height', '100%')

  const g = svg.append('g')

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      g.attr('transform', event.transform.toString())
    })
  svg.call(zoom)

  const sim = d3.forceSimulation<GraphNode>(nodes)
    .force('link', d3.forceLink<GraphNode, GraphLink>(links)
      .id(d => d.id)
      .distance(90)
      .strength(0.4))
    .force('charge', d3.forceManyBody<GraphNode>().strength(-220))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collide', d3.forceCollide<GraphNode>().radius(d => nodeRadius(d) + 6))

  const linkSel = g.append('g')
    .selectAll<SVGLineElement, GraphLink>('line')
    .data(links)
    .join('line')
    .attr('class', 'graph-link')
    .attr('stroke', linkColor)
    .attr('stroke-width', 1.5)

  const nodeSel = g.append('g')
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'graph-node')
    .call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        }),
    )

  nodeSel.append('circle')
    .attr('r', nodeRadius)
    .attr('fill', d => d.id === activeNodeId ? colorActive : colorDefault)
    .attr('stroke', d => d.id === activeNodeId ? colorActive : 'transparent')
    .attr('stroke-width', 2)

  nodeSel.append('text')
    .attr('dy', d => nodeRadius(d) + 13)
    .attr('text-anchor', 'middle')
    .attr('fill', textColor)
    .text(d => d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name)

  nodeSel.on('click', (_event, d) => onNodeClick(d.path))

  nodeSel
    .on('mouseenter', (_event, d) => {
      const connected = new Set<string>()
      for (const l of links) {
        const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
        const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
        if (s === d.id) connected.add(t)
        if (t === d.id) connected.add(s)
      }
      nodeSel.select('circle')
        .attr('fill', (n: GraphNode) => {
          if (n.id === d.id) return colorActive
          if (connected.has(n.id)) return colorLinked
          return colorDefault
        })
        .attr('opacity', (n: GraphNode) =>
          n.id === d.id || connected.has(n.id) ? 1 : 0.3)
      linkSel
        .attr('opacity', (l: GraphLink) => {
          const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id
          const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id
          return s === d.id || t === d.id ? 1 : 0.1
        })
    })
    .on('mouseleave', () => {
      nodeSel.select('circle')
        .attr('fill', (n: GraphNode) => n.id === activeNodeId ? colorActive : colorDefault)
        .attr('opacity', 1)
      linkSel.attr('opacity', 1)
    })

  sim.on('tick', () => {
    linkSel
      .attr('x1', (d: GraphLink) => ((d.source as GraphNode).x ?? 0))
      .attr('y1', (d: GraphLink) => ((d.source as GraphNode).y ?? 0))
      .attr('x2', (d: GraphLink) => ((d.target as GraphNode).x ?? 0))
      .attr('y2', (d: GraphLink) => ((d.target as GraphNode).y ?? 0))
    nodeSel.attr('transform', (d: GraphNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)
  })
}

export default plugin
