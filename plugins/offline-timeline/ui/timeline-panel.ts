import type { Snapshot } from '../index.ts'

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function showRowMenu(
  x: number,
  y: number,
  items: { label: string; action: () => void }[],
): void {
  document.querySelector('.timeline-ctx-menu')?.remove()
  const menu = document.createElement('div')
  menu.className = 'timeline-ctx-menu'
  menu.style.left = `${x}px`
  menu.style.top  = `${y}px`
  for (const item of items) {
    const btn = document.createElement('button')
    btn.textContent = item.label
    btn.addEventListener('click', () => { menu.remove(); item.action() })
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

export interface TimelinePanelCallbacks {
  onRestore: (snap: Snapshot) => void
  onCompare: (snapContent: string, snapLabel: string, otherContent: string, otherLabel: string, onRestoreSnap?: () => void) => void
  getCurrentContent: () => Promise<string>
}

export function buildTimelinePanel(
  fileId: string,
  snapshots: Snapshot[],
  cbs: TimelinePanelCallbacks,
): HTMLElement {
  const filename = fileId.split('/').pop() ?? fileId

  const wrap = document.createElement('div')
  wrap.className = 'timeline-list'

  if (snapshots.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'timeline-empty'
    empty.textContent = 'No snapshots yet. Save the file to create one.'
    wrap.appendChild(empty)
    return wrap
  }

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]
    const prev = snapshots[i + 1]

    const row = document.createElement('div')
    row.className = 'timeline-row'
    row.title = new Date(snap.timestamp).toLocaleString()

    const icon = document.createElement('span')
    icon.className = 'timeline-row-icon'
    icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`

    const meta = document.createElement('div')
    meta.className = 'timeline-meta'

    const time = document.createElement('span')
    time.className = 'timeline-time'
    time.textContent = formatTimestamp(snap.timestamp)

    const preview = document.createElement('span')
    preview.className = 'timeline-preview'
    const firstLine = snap.content.split('\n').find(l => l.trim()) ?? '(empty)'
    preview.textContent = firstLine.length > 50 ? firstLine.slice(0, 48) + '…' : firstLine

    meta.appendChild(time)
    meta.appendChild(preview)
    row.appendChild(icon)
    row.appendChild(meta)
    wrap.appendChild(row)

    const compareWithCurrent = () =>
      void cbs.getCurrentContent().then(current => {
        cbs.onCompare(
          snap.content, formatTimestamp(snap.timestamp),
          current, filename + ' (current)',
          () => cbs.onRestore(snap),
        )
      })

    // Click → compare with current file
    row.addEventListener('click', compareWithCurrent)

    // Right-click context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const menuItems: { label: string; action: () => void }[] = [
        { label: 'Compare with Current', action: compareWithCurrent },
      ]

      if (prev) {
        menuItems.push({
          label: 'Compare with Previous',
          action: () => {
            cbs.onCompare(
              prev.content, formatTimestamp(prev.timestamp),
              snap.content, formatTimestamp(snap.timestamp),
            )
          },
        })
      }

      menuItems.push({
        label: 'Restore This Version',
        action: () => cbs.onRestore(snap),
      })

      showRowMenu(e.clientX, e.clientY, menuItems)
    })
  }

  return wrap
}
