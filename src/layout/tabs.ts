export interface Tab {
  name: string
  handle: FileSystemFileHandle
  content: string
}

export class TabManager {
  private tabs: Map<string, Tab> = new Map()
  private activeName: string | null = null

  open(name: string, handle: FileSystemFileHandle, content: string): void {
    this.tabs.set(name, { name, handle, content })
    this.activeName = name
  }

  getActive(): Tab | null {
    if (this.activeName === null) return null
    return this.tabs.get(this.activeName) ?? null
  }

  setActive(name: string): void {
    if (this.tabs.has(name)) {
      this.activeName = name
    }
  }

  updateContent(name: string, content: string): void {
    const tab = this.tabs.get(name)
    if (tab) {
      tab.content = content
    }
  }

  close(name: string): string | null {
    this.tabs.delete(name)
    if (this.activeName === name) {
      const remaining = [...this.tabs.keys()]
      this.activeName = remaining[remaining.length - 1] ?? null
    }
    return this.activeName
  }

  getAll(): Tab[] {
    return [...this.tabs.values()]
  }

  has(name: string): boolean {
    return this.tabs.has(name)
  }
}
