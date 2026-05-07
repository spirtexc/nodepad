export interface Frontmatter {
  title?: string
  tags?: string[]
  date?: string
}

export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const rawBlock = match[1]!
  const body = match[2]!
  const frontmatter: Frontmatter = {}
  const lines = rawBlock.split(/\r?\n/)

  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (!kvMatch) { i++; continue }

    const key = kvMatch[1]!
    const val = kvMatch[2]!.trim()

    if (key === 'tags') {
      if (val.startsWith('[') && val.endsWith(']')) {
        frontmatter.tags = val
          .slice(1, -1)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      } else if (val === '') {
        const tagList: string[] = []
        i++
        while (i < lines.length && lines[i]!.match(/^\s+-\s+/)) {
          tagList.push(lines[i]!.replace(/^\s+-\s+/, '').trim())
          i++
        }
        frontmatter.tags = tagList
        continue
      } else {
        frontmatter.tags = [val]
      }
    } else if (key === 'title') {
      frontmatter.title = val
    } else if (key === 'date') {
      frontmatter.date = val
    }

    i++
  }

  return { frontmatter, body }
}
