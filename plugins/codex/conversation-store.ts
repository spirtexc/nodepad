import type { App } from '../../src/plugin-api/index.ts'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  messages: Message[]
  updatedAt: number
}

const DIR = 'codex/conversations'

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '_')
}

/**
 * Persists conversations as .md in .nodepad/codex/conversations/.
 * Plugin-scoped app-data — NOT first-class vault notes.
 *
 * Markdown format (human-readable, grep-able, vault-portable):
 *   # Codex conversation — <id>
 *   ## user
 *   <message>
 *   ## assistant
 *   <message>
 */
export class ConversationStore {
  constructor(private app: App) {}

  async save(id: string, messages: Message[]): Promise<void> {
    const safe = sanitizeId(id)
    const updatedAt = Date.now()
    const header = `# Codex conversation — ${safe}\n# Updated: ${updatedAt}\n`
    const body = messages
      .map((m) => `## ${m.role}\n${m.content}`)
      .join('\n\n')
    await this.app.writeConfig(`${DIR}/${safe}.md`, header + '\n' + body + '\n')
  }

  async load(id: string): Promise<Conversation | null> {
    const safe = sanitizeId(id)
    let raw: string
    try {
      raw = await this.app.readConfig(`${DIR}/${safe}.md`)
    } catch {
      return null
    }
    if (!raw) return null

    const messages: Message[] = []
    const sections = raw.split(/^## /m).slice(1) // drop header
    for (const section of sections) {
      const newline = section.indexOf('\n')
      const role = section.slice(0, newline).trim()
      const content = section.slice(newline + 1).trim()
      if (role === 'user' || role === 'assistant') {
        messages.push({ role, content })
      }
    }

    const updatedMatch = raw.match(/# Updated: (\d+)/)
    return { id: safe, messages, updatedAt: updatedMatch ? parseInt(updatedMatch[1], 10) : 0 }
  }

  /** List conversation IDs (filenames without .md), most-recently-updated first. */
  async list(): Promise<string[]> {
    const all = await this.app.listFiles(DIR)
    return all
      .filter((f) => f.name.endsWith('.md'))
      .map((f) => f.name.replace(/\.md$/, ''))
      .reverse() // listFiles returns sorted by path; reverse approximates recent-first
  }
}
