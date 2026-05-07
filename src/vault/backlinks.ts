const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

export class BacklinkIndex {
  private index: Map<string, Set<string>> = new Map()

  build(files: { path: string; content: string }[]): void {
    this.index.clear()
    for (const file of files) {
      this.update(file.path, file.content)
    }
  }

  getBacklinks(filename: string): string[] {
    const key = filename.toLowerCase().replace(/\.md$/, '')
    return Array.from(this.index.get(key) ?? [])
  }

  update(path: string, content: string): void {
    for (const [, targets] of this.index) {
      targets.delete(path)
    }

    const matches = content.matchAll(WIKILINK_RE)
    for (const match of matches) {
      const target = match[1]!.trim().toLowerCase()
      if (!this.index.has(target)) {
        this.index.set(target, new Set())
      }
      this.index.get(target)!.add(path)
    }
  }
}
