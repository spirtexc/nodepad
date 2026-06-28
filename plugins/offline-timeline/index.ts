import type { Plugin, App } from '../../src/plugin-api/index.ts'
import { buildTimelinePanel, type TimelinePanelCallbacks } from './ui/timeline-panel.ts'

export interface Snapshot {
  id: string
  fileId: string
  content: string
  timestamp: number
  deviceId: string
}

const MAX_SNAPSHOTS = 50

function safeKey(fileId: string): string {
  return `timeline/${fileId.replace(/[/\\:*?"<>|]/g, '_')}.json`
}

async function loadSnapshots(fileId: string, app: App): Promise<Snapshot[]> {
  try {
    const text = await app.readConfig(safeKey(fileId))
    return text ? JSON.parse(text) as Snapshot[] : []
  } catch {
    return []
  }
}

async function saveSnapshot(fileId: string, snapshot: Snapshot, app: App): Promise<void> {
  const existing = await loadSnapshots(fileId, app)
  const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS)
  await app.writeConfig(safeKey(fileId), JSON.stringify(updated))
}

let styleEl: HTMLStyleElement | null = null
let unsubs: Array<() => void> = []

const STYLES = `
.timeline-list {
  display: flex;
  flex-direction: column;
}
.timeline-empty {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
.timeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background .1s;
}
.timeline-row:hover {
  background: var(--b3-theme-primary-lightest);
  border-left-color: var(--accent);
}
.timeline-row-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}
.timeline-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.timeline-time {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}
.timeline-preview {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.timeline-ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,.18);
  padding: 4px;
  min-width: 190px;
}
.timeline-ctx-menu button {
  display: block;
  width: 100%;
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  font-family: inherit;
}
.timeline-ctx-menu button:hover { background: var(--bg-secondary); }
`

const plugin: Plugin = {
  id: 'offline-timeline',
  name: 'Offline Timeline',
  version: '1.0.0',
  permissions: ['read-files', 'write-files', 'ui-panels'],

  onLoad(app: App): void {
    unsubs = []

    styleEl = document.createElement('style')
    styleEl.textContent = STYLES
    document.head.appendChild(styleEl)

    let currentFileId: string | null = null
    let panelBody: HTMLElement | null = null

    const refreshPanel = async () => {
      if (!panelBody || !currentFileId) return
      const fileId = currentFileId
      const snapshots = await loadSnapshots(fileId, app)

      const cbs: TimelinePanelCallbacks = {
        onRestore: async (snap: Snapshot) => {
          const dateStr = new Date(snap.timestamp).toLocaleString()
          if (!confirm(`Restore snapshot from ${dateStr}?\n\nThis will overwrite the current file content.`)) return
          try {
            await app.writeFile(fileId, snap.content)
            void refreshPanel()
          } catch (err) {
            console.error('[offline-timeline] Restore failed:', err)
            alert('Restore failed. See console for details.')
          }
        },
        onCompare: (contentA, labelA, contentB, labelB, onRestoreA) => {
          app.openDiff(labelA, contentA, labelB, contentB, onRestoreA)
        },
        getCurrentContent: () => app.readFile(fileId),
      }

      panelBody.innerHTML = ''
      panelBody.appendChild(buildTimelinePanel(fileId, snapshots, cbs))
    }

    unsubs.push(
      app.addSidebarPanel('offline-timeline', 'Timeline', (body) => {
        panelBody = body
        void refreshPanel()
      }),
    )

    unsubs.push(
      app.onFileOpen((file) => {
        currentFileId = file.path
        void refreshPanel()
      }),
    )

    unsubs.push(
      app.onFileRename(async (oldPath, newPath) => {
        const snapshots = await loadSnapshots(oldPath, app)
        if (snapshots.length > 0) {
          await app.writeConfig(safeKey(newPath), JSON.stringify(snapshots.map(s => ({ ...s, fileId: newPath }))))
          await app.writeConfig(safeKey(oldPath), JSON.stringify([]))
        }
        if (currentFileId === oldPath) {
          currentFileId = newPath
          void refreshPanel()
        }
      }),
    )

    unsubs.push(
      app.onFileSave(async (file) => {
        try {
          const content = await app.readFile(file.path)
          const snapshot: Snapshot = {
            id: crypto.randomUUID(),
            fileId: file.path,
            content,
            timestamp: Date.now(),
            deviceId: crypto.randomUUID(),
          }
          await saveSnapshot(file.path, snapshot, app)
          void refreshPanel()
        } catch (err) {
          console.error('[offline-timeline] Failed to save snapshot:', err)
        }
      }),
    )
  },

  onUnload(): void {
    unsubs.forEach((u) => u())
    unsubs = []
    styleEl?.remove()
    styleEl = null
  },
}

export default plugin
