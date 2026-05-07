import type { Snapshot } from '../index.ts'

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function buildTimelinePanel(
  fileId: string,
  snapshots: Snapshot[],
  onRestore: (snapshot: Snapshot) => void,
): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'timeline-panel'

  const header = document.createElement('div')
  header.className = 'timeline-header'
  const title = document.createElement('span')
  title.className = 'timeline-title'
  title.textContent = `Timeline — ${fileId.split('/').pop() ?? fileId}`
  header.appendChild(title)
  panel.appendChild(header)

  const list = document.createElement('div')
  list.className = 'timeline-list'

  if (snapshots.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'timeline-empty'
    empty.textContent = 'No snapshots yet. Save the file to create one.'
    list.appendChild(empty)
  } else {
    for (const snap of snapshots) {
      const firstLine = snap.content.split('\n').find((l) => l.trim()) ?? '(empty)'
      const preview = firstLine.length > 64 ? firstLine.slice(0, 64) + '…' : firstLine

      const row = document.createElement('div')
      row.className = 'timeline-row'

      const meta = document.createElement('div')
      meta.className = 'timeline-meta'

      const time = document.createElement('span')
      time.className = 'timeline-time'
      time.textContent = formatTimestamp(snap.timestamp)

      const previewEl = document.createElement('span')
      previewEl.className = 'timeline-preview'
      previewEl.textContent = preview

      meta.appendChild(time)
      meta.appendChild(previewEl)

      const restoreBtn = document.createElement('button')
      restoreBtn.className = 'timeline-restore-btn'
      restoreBtn.textContent = 'Restore'
      restoreBtn.addEventListener('click', () => onRestore(snap))

      row.appendChild(meta)
      row.appendChild(restoreBtn)
      list.appendChild(row)
    }
  }

  panel.appendChild(list)
  return panel
}
