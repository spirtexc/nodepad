export interface PluginRecord {
  id: string
  name: string
  version: string
  url: string
  enabled: boolean
}

const STORAGE_KEY = 'nodepad:plugins'

export class PluginRegistry {
  private records: Map<string, PluginRecord> = new Map()

  constructor() {
    this.load()
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as PluginRecord[]
        for (const r of arr) this.records.set(r.id, r)
      }
    } catch { /* ignore corrupt data */ }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.records.values()]))
  }

  register(record: PluginRecord): void {
    this.records.set(record.id, record)
    this.persist()
  }

  setEnabled(id: string, enabled: boolean): void {
    const r = this.records.get(id)
    if (r) {
      r.enabled = enabled
      this.persist()
    }
  }

  remove(id: string): void {
    this.records.delete(id)
    this.persist()
  }

  getAll(): PluginRecord[] {
    return [...this.records.values()]
  }

  isEnabled(id: string): boolean {
    return this.records.get(id)?.enabled ?? false
  }
}
