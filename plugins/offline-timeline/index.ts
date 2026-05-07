import { get, set } from 'idb-keyval'
import type { Plugin, App } from '../../src/plugin-api/index.ts'
import { buildTimelinePanel } from './ui/timeline-panel.ts'

export interface Snapshot {
  id: string
  fileId: string
  content: string
  timestamp: number
  deviceId: string
}

const MAX_SNAPSHOTS = 50
const KEY_PREFIX = 'timeline:'
const DEVICE_KEY = 'device-id'

async function getDeviceId(): Promise<string> {
  try {
    const stored = await get<string>(DEVICE_KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    await set(DEVICE_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

async function loadSnapshots(fileId: string): Promise<Snapshot[]> {
  try {
    return (await get<Snapshot[]>(KEY_PREFIX + fileId)) ?? []
  } catch {
    return []
  }
}

async function saveSnapshot(fileId: string, snapshot: Snapshot): Promise<void> {
  const existing = await loadSnapshots(fileId)
  const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS)
  await set(KEY_PREFIX + fileId, updated)
}

let styleEl: HTMLStyleElement | null = null
let unsubs: Array<() => void> = []

const STYLES = `
.timeline-panel {
  width: 480px;
  max-width: 90vw;
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}
.timeline-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.timeline-list {
  overflow-y: auto;
  flex: 1;
}
.timeline-empty {
  padding: 32px 18px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
.timeline-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
}
.timeline-row:last-child {
  border-bottom: none;
}
.timeline-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.timeline-time {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}
.timeline-preview {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.timeline-restore-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
}
.timeline-restore-btn:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
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

    const openTimeline = async () => {
      if (!currentFileId) {
        alert('Open a file first to view its timeline.')
        return
      }
      const fileId = currentFileId
      const snapshots = await loadSnapshots(fileId)

      let closePanel: (() => void) | null = null

      const onRestore = async (snap: Snapshot) => {
        const dateStr = new Date(snap.timestamp).toLocaleString()
        if (!confirm(`Restore snapshot from ${dateStr}?\n\nThis will overwrite the current file content.`)) return
        try {
          await app.writeFile(fileId, snap.content)
          closePanel?.()
        } catch (err) {
          console.error('[offline-timeline] Restore failed:', err)
          alert('Restore failed. See console for details.')
        }
      }

      const content = buildTimelinePanel(fileId, snapshots, onRestore)
      closePanel = app.openModal(content)
    }

    app.addSidebarIcon(
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      'Timeline',
      () => {
        void openTimeline()
      },
    )

    unsubs.push(
      app.onFileOpen((file) => {
        currentFileId = file.path
      }),
    )

    unsubs.push(
      app.onFileSave(async (file) => {
        try {
          const content = await app.readFile(file.path)
          const deviceId = await getDeviceId()
          const snapshot: Snapshot = {
            id: crypto.randomUUID(),
            fileId: file.path,
            content,
            timestamp: Date.now(),
            deviceId,
          }
          await saveSnapshot(file.path, snapshot)
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
