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
}
