import { get, set } from 'idb-keyval'
import { parseFrontmatter } from './frontmatter.ts'

const STORAGE_KEY = 'tags-index'

export class TagsIndex {
  private index: Map<string, Set<string>> = new Map()

  build(files: { path: string; content: string }[]): void {
    this.index.clear()
    for (const { path, content } of files) {
      this.addFile(path, content)
    }
    void this.persist()
  }

  update(path: string, content: string): void {
    this.removeFile(path)
    this.addFile(path, content)
    void this.persist()
  }

  async load(): Promise<void> {
    try {
      const data = await get<Record<string, string[]>>(STORAGE_KEY)
      if (data) {
        for (const [tag, paths] of Object.entries(data)) {
          this.index.set(tag, new Set(paths))
        }
      }
    } catch { /* ignore */ }
  }

  getFilesWithTag(tag: string): string[] {
    return [...(this.index.get(tag) ?? [])]
  }

  getAllTags(): string[] {
    return [...this.index.keys()].sort()
  }

  private addFile(path: string, content: string): void {
    const { frontmatter } = parseFrontmatter(content)
    for (const tag of frontmatter.tags ?? []) {
      if (!this.index.has(tag)) this.index.set(tag, new Set())
      this.index.get(tag)!.add(path)
    }
  }

  private removeFile(path: string): void {
    for (const [tag, paths] of this.index) {
      paths.delete(path)
      if (paths.size === 0) this.index.delete(tag)
    }
  }

  private async persist(): Promise<void> {
    const data: Record<string, string[]> = {}
    for (const [tag, paths] of this.index) data[tag] = [...paths]
    await set(STORAGE_KEY, data)
  }
}
