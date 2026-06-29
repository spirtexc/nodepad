import type { App, SearchResult } from '../../src/plugin-api/index.ts'

export const DEFAULT_K = 5
export const MAX_CONTEXT_TOKENS = 6000

export interface AssembledContext {
  /** Joined context block: current note + retrieved files, ready to prepend to the prompt */
  block: string
  /** Paths of files that were included (current note + retrieved) */
  sources: string[]
  /** True when the current note alone exceeded budget and retrieved files were skipped */
  truncated: boolean
}

/** v1 token estimate: chars / 4. Known-imprecise (off 2-3x for code/CJK). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Build a vault-grounded context block for a chat question.
 *
 * Budget mechanism (primary = file count K, backstop = token cap):
 *   1. Always include current note full.
 *   2. If current note alone exceeds MAX_CONTEXT_TOKENS: send current note with
 *      `[...]` truncation marker, skip search entirely.
 *   3. Otherwise search → top-K → readFile each in rank order → accumulate →
 *      drop the rest. NEVER truncate mid-file.
 */
export async function buildContext(
  app: App,
  query: string,
  activeFilePath: string | undefined,
  activeFileContent: string | undefined,
  options?: { k?: number; maxTokens?: number },
): Promise<AssembledContext> {
  const k = options?.k ?? DEFAULT_K
  const maxTokens = options?.maxTokens ?? MAX_CONTEXT_TOKENS

  const currentNoteTokens = activeFileContent ? estimateTokens(activeFileContent) : 0

  // Branch: current note alone exceeds budget → send truncated current note only
  if (activeFileContent && currentNoteTokens > maxTokens) {
    const marker = '[...]'
    // Reserve room for the marker; truncate the content itself, never mid-word
    const budgetChars = (maxTokens - estimateTokens(marker)) * 4
    const truncated = activeFileContent.slice(0, Math.max(0, budgetChars)) + marker
    return {
      block: `<current-note path="${activeFilePath}">\n${truncated}\n</current-note>`,
      sources: activeFilePath ? [activeFilePath] : [],
      truncated: true,
    }
  }

  const parts: string[] = []
  const sources: string[] = []
  let usedTokens = 0

  // (1) current note full
  if (activeFileContent && activeFilePath) {
    parts.push(`<current-note path="${activeFilePath}">\n${activeFileContent}\n</current-note>`)
    sources.push(activeFilePath)
    usedTokens += currentNoteTokens
  }

  // (2) search → top-K → readFile in rank order → accumulate until budget
  const results: SearchResult[] = app.search(query, { limit: k * 2 }) // over-fetch so we can skip unreadable
  let added = 0

  for (const r of results) {
    if (added >= k) break
    if (r.path === activeFilePath) continue // already included as current note

    let content: string
    try {
      content = await app.readFile(r.path)
    } catch {
      continue // skip unreadable
    }

    const tokens = estimateTokens(content)
    if (usedTokens + tokens > maxTokens) break // drop the rest — never truncate mid-file

    parts.push(`<note path="${r.path}">\n${content}\n</note>`)
    sources.push(r.path)
    usedTokens += tokens
    added++
  }

  return { block: parts.join('\n\n'), sources, truncated: false }
}
