import Fuse from 'fuse.js'

export interface SearchResult {
  path: string
  name: string
  score: number
  excerpt?: string
}

interface IndexedFile {
  path: string
  name: string
  content: string
}

export class VaultSearch {
  private fuse: Fuse<IndexedFile> | null = null

  index(files: { path: string; name: string; content: string }[]): void {
    this.fuse = new Fuse(files, {
      keys: ['name', 'content'],
      includeScore: true,
      threshold: 0.4,
      includeMatches: true,
    })
  }

  search(query: string): SearchResult[] {
    if (!this.fuse || !query.trim()) return []

    const raw = this.fuse.search(query)
    return raw.map((result) => {
      const excerpt = this.extractExcerpt(result.item.content, query)
      return {
        path: result.item.path,
        name: result.item.name,
        score: result.score ?? 1,
        excerpt,
      }
    })
  }

  private extractExcerpt(content: string, query: string): string | undefined {
    const idx = content.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return undefined
    const start = Math.max(0, idx - 40)
    const end = Math.min(content.length, idx + 60)
    return (start > 0 ? '…' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '…' : '')
  }
}
