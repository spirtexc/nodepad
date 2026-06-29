import type { App } from '../../src/plugin-api/index.ts'
import { loadConfig } from './config.ts'
import { buildContext } from './retrieval.ts'
import { ConversationStore, type Message } from './conversation-store.ts'
import { getPluginContext } from './plugin-context.ts'

type Phase = 'idle' | 'awaiting' | 'streaming' | 'error'

let phase: Phase = 'idle'
let abortCtrl: AbortController | null = null

function showStatus(msg: string, isError = false) {
  const el = document.querySelector<HTMLElement>('.codex-chat-status')
  if (!el) return
  el.textContent = msg
  el.style.color = isError ? '#e5534b' : '#999'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Build the chat sidebar panel. Mounted once via addSidebarPanel factory.
 * Wires: input → retrieval → generate → streaming render → persist.
 */
export function buildChatPanel(container: HTMLElement, app: App): void {
  const store = new ConversationStore(app)
  let currentId = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  const messages: Message[] = []

  container.innerHTML = `
    <div class="codex-chat" style="display:flex;flex-direction:column;height:100%;padding:8px;gap:6px;">
      <div class="codex-chat-status" style="font-size:11px;color:#999;min-height:14px;"></div>
      <div class="codex-chat-log" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;"></div>
      <div style="display:flex;gap:6px;">
        <textarea class="codex-chat-input" rows="2" placeholder="Ask about your notes…"
          style="flex:1;resize:none;border:1px solid var(--border);border-radius:6px;padding:6px;font:inherit;background:var(--bg-primary);color:var(--text-primary);"></textarea>
        <button class="codex-chat-send" style="align-self:flex-end;padding:6px 12px;border:1px solid var(--border);border-radius:6px;background:var(--accent);color:#fff;cursor:pointer;">Send</button>
      </div>
    </div>
  `

  const log = container.querySelector<HTMLElement>('.codex-chat-log')!
  const input = container.querySelector<HTMLTextAreaElement>('.codex-chat-input')!
  const sendBtn = container.querySelector<HTMLButtonElement>('.codex-chat-send')!

  function appendBubble(role: 'user' | 'assistant', body: string, streaming = false): HTMLElement {
    const bubble = document.createElement('div')
    bubble.className = `codex-bubble codex-bubble-${role}`
    bubble.style.cssText = role === 'user'
      ? 'background:var(--bg-secondary);padding:6px 10px;border-radius:10px 10px 2px 10px;align-self:flex-end;max-width:85%;white-space:pre-wrap;'
      : 'background:transparent;padding:6px 0;border-radius:0;align-self:flex-start;max-width:95%;white-space:pre-wrap;'
    bubble.innerHTML = streaming ? '' : escapeHtml(body)
    log.appendChild(bubble)
    log.scrollTop = log.scrollHeight
    return bubble
  }

  async function sendMessage(): Promise<void> {
    const text = input.value.trim()
    if (!text || phase === 'streaming') return

    const config = await loadConfig(app)
    if (!config.endpointUrl || !config.apiKey) {
      showStatus('Configure endpoint URL + API key in Codex Settings', true)
      return
    }

    // user bubble
    messages.push({ role: 'user', content: text })
    appendBubble('user', text)
    input.value = ''

    // assistant bubble (empty, streaming fills it)
    const assistantBubble = appendBubble('assistant', '', true)

    phase = 'awaiting'
    abortCtrl = new AbortController()

    try {
      // (1) retrieval: vault-grounded context
      const activeFile = app.getActiveFile()
      const activeContent = activeFile ? await app.readFile(activeFile.path) : undefined
      const ctx = await buildContext(app, text, activeFile?.path, activeContent)

      // (2) plugin context stub (returns null today)
      const pluginCtx = await getPluginContext(app)
      const pluginBlock = formatPluginContext(pluginCtx)

      // (3) assemble full prompt
      const fullPrompt = [
        '<context>',
        ctx.block,
        `</context>`,
        pluginBlock,
        '',
        text,
      ].join('\n')

      // (4) call endpoint (streaming)
      phase = 'streaming'
      showStatus(ctx.truncated ? 'Context: current note exceeded budget, retrieved files skipped' : `Searching ${ctx.sources.length} file(s)…`)

      const response = await fetch(config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || undefined,
          stream: true,
          messages: [{ role: 'user', content: fullPrompt }],
        }),
        signal: abortCtrl.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line || !line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content
              ?? parsed.content?.[0]?.text
              ?? parsed.response
              ?? ''
            if (token) {
              accumulated += token
              assistantBubble.innerHTML = escapeHtml(accumulated)
              log.scrollTop = log.scrollHeight
            }
          } catch {
            // skip unparseable
          }
        }
      }

      // (5) finalize
      messages.push({ role: 'assistant', content: accumulated })
      phase = 'idle'
      showStatus(`Answered from ${ctx.sources.length} source(s)`)

      // (6) persist
      await store.save(currentId, messages)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        phase = 'idle'
        showStatus('Cancelled')
      } else {
        phase = 'error'
        const msg = err instanceof Error ? err.message : 'Request failed'
        showStatus(msg, true)
      }
    } finally {
      abortCtrl = null
    }
  }

  sendBtn.addEventListener('click', () => void sendMessage())
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
    if (e.key === 'Escape' && phase === 'streaming') {
      abortCtrl?.abort()
    }
  })
}

function formatPluginContext(ctx: Awaited<ReturnType<typeof getPluginContext>>): string {
  if (!ctx.mindmap && !ctx.graph) return ''
  const parts: string[] = ['<plugin-context>']
  if (ctx.mindmap) parts.push(`<mindmap>${JSON.stringify(ctx.mindmap)}</mindmap>`)
  if (ctx.graph) parts.push(`<graph>${JSON.stringify(ctx.graph)}</graph>`)
  parts.push('</plugin-context>')
  return parts.join('\n')
}
