import type { Plugin, App, Permission } from '../../src/plugin-api/index.ts'
import { EditorView, WidgetType, ViewPlugin, Decoration, DecorationSet } from '../_shims/codemirror-view.ts'
import { StateField, StateEffect } from '../_shims/codemirror-state.ts'
import type { Extension } from '../_shims/codemirror-state.ts'
import type { ViewUpdate } from '../_shims/codemirror-view.ts'

// ─── Types ───────────────────────────────────────────────────────────
interface CodexConfig {
  endpointUrl: string
  apiKey: string
  model: string
}

interface ActiveTrigger {
  from: number        // start of the `//` line content (after `// `)
  to: number          // end of the prompt text
  prompt: string      // text after `// `
  charStart: number   // doc position of trigger start
  charEnd: number     // doc position of trigger end
  suggestionFrom?: number  // auto-suggested context range start
  suggestionTo?: number    // auto-suggested context range end
}

type Phase = 'idle' | 'armed' | 'generating' | 'replacing' | 'error'

let triggerState: {
  phase: Phase
  trigger: ActiveTrigger | null
  ctrl: AbortController | null
  errorMsg: string | null
} = {
  phase: 'idle',
  trigger: null,
  ctrl: null,
  errorMsg: null,
}

// ─── AES-256-GCM encryption ─────────────────────────────────────────
async function getOrCreateKey(): Promise<CryptoKey> {
  const { get, set } = await import('idb-keyval')
  const existing = await get('codex:encryption-key')
  if (existing) {
    const raw = Uint8Array.from(atob(existing), c => c.charCodeAt(0))
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const raw = await crypto.subtle.exportKey('raw', key)
  await set('codex:encryption-key', btoa(String.fromCharCode(...(new Uint8Array(raw)))))
  return key
}

async function encryptString(plaintext: string): Promise<string> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decryptString(b64: string): Promise<string> {
  const key = await getOrCreateKey()
  const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ─── Config I/O ──────────────────────────────────────────────────────
async function loadConfig(app: App): Promise<CodexConfig> {
  const raw = await app.readConfig('codex/credentials.enc')
  if (!raw) return { endpointUrl: '', apiKey: '', model: '' }
  try {
    const json = await decryptString(raw.trim())
    return JSON.parse(json)
  } catch {
    return { endpointUrl: '', apiKey: '', model: '' }
  }
}

async function saveConfig(app: App, config: CodexConfig): Promise<void> {
  const json = JSON.stringify(config)
  const encrypted = await encryptString(json)
  await app.writeConfig('codex/credentials.enc', encrypted)
}

// ─── Line-range parsing ──────────────────────────────────────────────
function parseLineRange(prompt: string): { cleanPrompt: string; rangeFrom?: number; rangeTo?: number } {
  const match = prompt.match(/\s*\(line\s+(\d+)-(\d+)\)\s*$/i)
  if (!match) return { cleanPrompt: prompt }
  return {
    cleanPrompt: prompt.slice(0, match.index).trim(),
    rangeFrom: parseInt(match[1], 10),
    rangeTo: parseInt(match[2], 10),
  }
}

// ─── Surrounding paragraph detection ─────────────────────────────────
function getSurroundingParagraph(doc: { lines: number; lineAt: (n: number) => { from: number; to: number; text: string } }, lineNumber: number): { from: number; to: number } | null {
  // Find blank-line bounded paragraph containing lineNumber
  let start = lineNumber
  let end = lineNumber
  while (start > 1) {
    const prevLine = doc.lineAt(start - 1)
    if (prevLine.text.trim() === '') break
    start--
  }
  while (end < doc.lines) {
    const nextLine = doc.lineAt(end + 1)
    if (nextLine.text.trim() === '') break
    end++
  }
  if (start === end) return null  // single line, no paragraph
  return { from: doc.lineAt(start).from, to: doc.lineAt(end).to }
}

// ─── Status bar messages ────────────────────────────────────────────
let statusBarEl: HTMLElement | null = null
let statusTimeout: ReturnType<typeof setTimeout> | null = null

function showStatus(msg: string, isError = false) {
  if (!statusBarEl) return
  statusBarEl.textContent = msg
  statusBarEl.style.color = isError ? '#e5534b' : '#999'
  if (statusTimeout) clearTimeout(statusTimeout)
  if (!isError) {
    statusTimeout = setTimeout(() => { if (statusBarEl) statusBarEl.textContent = '' }, 5000)
  }
}

// ─── Trigger detection ───────────────────────────────────────────────

function detectTrigger(doc: { lines: number; lineAt: (n: number) => { from: number; to: number; text: string } }, lineNumber: number): ActiveTrigger | null {
  const line = doc.lineAt(lineNumber)
  const text = line.text

  // Priority: line-start `//`
  const lineStartMatch = text.match(/^\/\/\s*(.*)/)
  if (lineStartMatch) {
    // Check for consecutive `//` lines below (multi-line prompt)
    let combinedPrompt = lineStartMatch[1] || ''
    let lastLineNum = lineNumber
    for (let next = lineNumber + 1; next <= doc.lines; next++) {
      const nextLine = doc.lineAt(next)
      const nextMatch = nextLine.text.match(/^\/\/\s*(.*)/)
      if (nextMatch) {
        combinedPrompt += '\n' + (nextMatch[1] || '')
        lastLineNum = next
      } else {
        break
      }
    }
    const lastLineEnd = doc.lineAt(lastLineNum).to
    return {
      from: line.from + 2,  // after //
      to: lastLineEnd,
      prompt: combinedPrompt,
      charStart: line.from,
      charEnd: lastLineEnd,
    }
  }

  // Inline: ` = //something` or `://`
  const inlineMatch = text.match(/(?:=\s*)?\/\/\s*(.+?)(?:\s*['"`]?)$/)
  if (inlineMatch && inlineMatch.index !== undefined) {
    const promptStart = line.from + inlineMatch.index + inlineMatch[0].indexOf('//') + 2
    const promptText = inlineMatch[1].trim()
    return {
      from: promptStart,
      to: promptStart + promptText.length,
      prompt: promptText,
      charStart: line.from,
      charEnd: line.to,
    }
  }

  return null
}

// ─── Widget for trigger indicator ────────────────────────────────────
class TriggerWidget extends WidgetType {
  constructor(private prompt: string, private hasIndicator: boolean) {}
  override toDOM() {
   const btn = document.createElement('span')
   btn.className = 'codex-trigger-indicator'
   btn.textContent = '↵ generate'
   btn.style.cssText = 'display:inline-block;margin-left:4px;padding:0 6px;border-radius:10px;background:#4a90e2;color:#fff;font-size:10px;cursor:pointer;vertical-align:middle;opacity:0.7'
   btn.title = 'Generate with Codex (Tab)'
   btn.addEventListener('click', (e: Event) => {
     e.preventDefault()
     window.dispatchEvent(new CustomEvent('codex:generate'))
   })
   return btn
 }
 override eq(other: TriggerWidget) { return other.prompt === this.prompt && other.hasIndicator === this.hasIndicator }
 override get estimatedHeight() { return -1 }
 override ignoreEvent(e: Event) { return e.type !== 'click' && e.type !== 'mousedown' && e.type !== 'mouseup' }
 override destroy() {}
 override updateDOM() { return true }
 }

// ─── Ghost text widget (auto-suggestion) ────────────────────────────
class GhostWidget extends WidgetType {
  constructor(private text: string) {}
  override toDOM() {
    const span = document.createElement('span')
    span.className = 'codex-ghost-suggestion'
    span.textContent = this.text
    span.style.cssText = 'color: #999; font-style: italic; margin-left: 4px;'
    return span
  }
  override eq(other: GhostWidget) { return other.text === this.text }
  override get estimatedHeight() { return -1 }
  override ignoreEvent() { return true }
  override destroy() {}
  override updateDOM() { return true }
}

// ─── Loading indicator ──────────────────────────────────────────────
class LoadingWidget extends WidgetType {
  constructor() {}
  override toDOM() {
    const span = document.createElement('span')
    span.className = 'codex-loading'
    span.textContent = '…'
    span.style.cssText = 'color: #4a90e2; margin-left: 4px; animation: codex-pulse 1s infinite;'
    return span
  }
  override eq() { return true }
  override get estimatedHeight() { return -1 }
  override ignoreEvent() { return false }
  override destroy() {}
  override updateDOM() { return true }
}

// ─── Decoration plugin state ─────────────────────────────────────────
const clearTrigger = StateEffect.define()

const triggerField = StateField.define<{ decorations: DecorationSet; trigger: ActiveTrigger | null }>({
  create() {
    return { decorations: DecorationSet.empty, trigger: null }
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(clearTrigger)) {
        return { decorations: DecorationSet.empty, trigger: null }
      }
    }
    if (tr.docChanged) {
      return updateTriggerDecorations(tr.view, value.trigger)
    }
    return value
  },
})

function updateTriggerDecorations(view: EditorView, prevTrigger: ActiveTrigger | null) {
  const { state } = view
  const { doc } = state
  const builder = new DecorationSet.builder() as DecorationSet.Builder

  let currentTrigger: ActiveTrigger | null = null

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const trig = detectTrigger(doc, lineNum)
    if (!trig) continue

    // Add trigger indicator widget
    const deco = Decoration.widget({ widget: new TriggerWidget(trig.prompt, true), side: 1 })
    builder.add(trig.to, trig.to, deco)

    // Auto-suggest line range (ghost text) only if no explicit range in prompt
    const { cleanPrompt } = parseLineRange(trig.prompt)
    if (cleanPrompt && !trig.prompt.match(/\(line\s+\d+-\d+\)/i)) {
      // Smart range: short note → whole note, long note → surrounding paragraph
      const SHORT_NOTE_THRESHOLD = 30
      let suggestion: { from: number; to: number } | null = null

      if (doc.lines < SHORT_NOTE_THRESHOLD) {
        // Whole note
        const firstLine = doc.lineAt(1)
        const lastLine = doc.lineAt(doc.lines)
        suggestion = { from: firstLine.from, to: lastLine.to }
      } else {
        // Surrounding paragraph of the first // line
        suggestion = getSurroundingParagraph(doc, lineNum)
      }

      if (suggestion) {
        const sugText = doc.sliceString(suggestion.from, suggestion.to).trim()
        if (sugText.length > 0) {
          trig.suggestionFrom = suggestion.from
          trig.suggestionTo = suggestion.to
          const firstLine = doc.lineAt(suggestion.from)
          const lastLine = doc.lineAt(suggestion.to)
          const ghostDeco = Decoration.widget({ widget: new GhostWidget(`(line ${firstLine.number}-${lastLine.number})`), side: 1 })
          builder.add(trig.to, trig.to, ghostDeco)
        }
      }
    }

    currentTrigger = trig

    // Only process the first valid trigger found (avoid multiple active ones)
    break
  }

  return { decorations: builder.finish(), trigger: currentTrigger }
}

// ─── Generate function ───────────────────────────────────────────────
let _app: App | null = null

async function generate(trigger: ActiveTrigger): Promise<void> {
  if (triggerState.phase === 'generating') return
  if (!_app) return

  const config = await loadConfig(_app)
  if (!config.endpointUrl || !config.apiKey) {
    showStatus('Codex: configure endpoint URL + API key in settings', true)
    return
  }

  const view = _app.getActiveEditor()
  if (!view) return

  const doc = view.state.doc
  const { cleanPrompt, rangeFrom, rangeTo } = parseLineRange(trigger.prompt)

  // Build context block
  let contextBlock = ''
  if (rangeFrom !== undefined && rangeTo !== undefined) {
    const ctxDoc = view.state.doc
    const startLine = ctxDoc.lineAt(rangeFrom)
    const endLine = ctxDoc.lineAt(rangeTo)
    const contextText = ctxDoc.sliceString(Math.max(0, trigger.suggestionFrom ?? rangeFrom), Math.min(ctxDoc.length, trigger.suggestionTo ?? rangeTo))
    contextBlock = `\n\n[Context from lines ${startLine.number}-${endLine.number}]\n${contextText}`
  } else if (trigger.suggestionFrom && trigger.suggestionTo) {
    const contextText = doc.sliceString(trigger.suggestionFrom, trigger.suggestionTo)
    const startLine = doc.lineAt(trigger.suggestionFrom)
    const endLine = doc.lineAt(trigger.suggestionTo)
    contextBlock = `\n\n[Context from lines ${startLine.number}-${endLine.number}]\n${contextText}`
  }

  const fullPrompt = cleanPrompt + contextBlock

  // DEBUG: gated behind localStorage.getItem('codex:debug') for logic verification
  if (localStorage.getItem('codex:debug')) {
    console.log('[Codex] Trigger payload:', {
      prompt: cleanPrompt,
      contextRange: rangeFrom !== undefined ? `${rangeFrom}-${rangeTo}` : (trigger.suggestionFrom ? `${trigger.suggestionFrom}-${trigger.suggestionTo}` : 'none'),
      contextLabel: rangeFrom !== undefined ? 'explicit' : (trigger.suggestionFrom ? 'auto-suggested' : 'none'),
      fullPromptLength: fullPrompt.length,
    })
  }

  // Set loading state
  triggerState.phase = 'generating'
  triggerState.ctrl = new AbortController()
  triggerState.errorMsg = null

  try {
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
      signal: triggerState.ctrl.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response stream')

    const decoder = new TextDecoder()
    let accumulated = ''

    // Remove the //prompt line(s) first, then insert output below
    const lineStartPos = doc.lineAt(trigger.charStart).from
    const lineEndPos = doc.lineAt(trigger.charEnd).to
    // Insert position: end of the line below the trigger
    const insertAt = lineEndPos
    // Delete the trigger line(s) and prepare to insert after the line below
    view.dispatch({
      changes: { from: lineStartPos, to: lineEndPos, insert: '' },
    })

    let buffer = ''
    let firstToken = true
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Parse SSE lines
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
            // Insert newline before first token (output goes below trigger line)
            const insertText = firstToken ? '\n' + token : token
            firstToken = false
            view.dispatch({
              changes: { from: insertAt, insert: insertText },
            })
          }
        } catch {
          // skip unparseable line
        }
      }
    }

    triggerState.phase = 'idle'
    showStatus('Codex response complete')

  } catch (err: any) {
    if (err.name === 'AbortError') {
      triggerState.phase = 'idle'
      showStatus('Codex cancelled')
    } else {
      triggerState.phase = 'error'
      triggerState.errorMsg = err.message
      showStatus(err.message, true)
    }
  } finally {
    triggerState.ctrl = null
  }
}

// ─── Escape to cancel ────────────────────────────────────────────────
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && triggerState.phase === 'generating') {
    triggerState.ctrl?.abort()
  }
  if (e.key === 'Tab' && triggerState.trigger && triggerState.phase === 'armed') {
    e.preventDefault()
    void generate(triggerState.trigger)
    triggerState.phase = 'generating'
  }
}

// ─── Main plugin extension ───────────────────────────────────────────
function codexExtension(): Extension {
  // Register keydown listener
  window.addEventListener('keydown', handleKeydown)

  const plugin = ViewPlugin.fromClass(class {
    destroy() {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, {
    decorations: (v) => v.state.field(triggerField).decorations,
  })

  return [
    triggerField,
    plugin,
    EditorView.theme({
      '.codex-trigger-indicator:hover': { opacity: '1 !important' },
      '@keyframes codex-pulse': { '0%, 100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
    }),
  ]
}

// ─── Settings UI ─────────────────────────────────────────────────────
function buildSettingsUI(container: HTMLElement, app: App) {
  container.innerHTML = `
    <div class="codex-settings" style="padding: 16px;">
      <h3>Codex Plugin Settings</h3>
      <label style="display:block;margin:8px 0;">
        <span style="display:block;font-size:12px;color:#999;">API Endpoint URL</span>
        <input type="url" id="codex-endpoint" placeholder="https://api.openai.com/v1/chat/completions"
          style="width:100%;padding:6px;margin-top:2px;border:1px solid #ccc;border-radius:4px;">
      </label>
      <label style="display:block;margin:8px 0;">
        <span style="display:block;font-size:12px;color:#999;">API Key</span>
        <input type="password" id="codex-apikey" placeholder="sk-..."
          style="width:100%;padding:6px;margin-top:2px;border:1px solid #ccc;border-radius:4px;">
      </label>
      <label style="display:block;margin:8px 0;">
        <span style="display:block;font-size:12px;color:#999;">Model (optional)</span>
        <input type="text" id="codex-model" placeholder="gpt-4o-mini"
          style="width:100%;padding:6px;margin-top:2px;border:1px solid #ccc;border-radius:4px;">
      </label>
      <button id="codex-save" style="margin-top:12px;padding:6px 16px;background:#4a90e2;color:#fff;border:none;border-radius:4px;cursor:pointer;">
        Save
      </button>
      <p id="codex-status" style="margin-top:8px;font-size:12px;color:#666;"></p>
    </div>
  `

  loadConfig(app).then(config => {
    const ep = container.querySelector<HTMLInputElement>('#codex-endpoint')!
    const ak = container.querySelector<HTMLInputElement>('#codex-apikey')!
    const md = container.querySelector<HTMLInputElement>('#codex-model')!
    ep.value = config.endpointUrl
    md.value = config.model
    // Don't populate API key field for security (encrypted at rest)
  })

  container.querySelector('#codex-save')!.addEventListener('click', async () => {
    const ep = container.querySelector<HTMLInputElement>('#codex-endpoint')!
    const ak = container.querySelector<HTMLInputElement>('#codex-apikey')!
    const md = container.querySelector<HTMLInputElement>('#codex-model')!
    const st = container.querySelector('#codex-status') as HTMLElement

    const config: CodexConfig = {
      endpointUrl: ep.value.trim(),
      apiKey: ak.value.trim(),
      model: md.value.trim(),
    }

    try {
      await saveConfig(app, config)
      st.textContent = 'Settings saved (encrypted).'
      st.style.color = '#4a9'
    } catch (err: any) {
      st.textContent = `Error: ${err.message}`
      st.style.color = '#e5534b'
    }
  })
}

// ─── Plugin factory ──────────────────────────────────────────────────
function makeCodexPlugin(): Plugin {
  let removeExt: (() => void) | null = null
  let removePanel: (() => void) | null = null

  return {
    id: 'codex',
    name: 'Codex AI',
    version: '0.1.0',
    permissions: ['editor', 'read-files', 'write-files', 'network'] as Permission[],

    onLoad(app: App) {
      _app = app

      // Register status bar item
      statusBarEl = app.addStatusBarItem()
      statusBarEl.textContent = ''

      // Register sidebar panel for settings
      removePanel = app.addSidebarPanel('codex-settings', 'Codex Settings', (container) => {
        buildSettingsUI(container, app)
      })

      // Register the editor extension
      removeExt = app.addEditorExtension(codexExtension())

      // Listen for generate events from widget clicks
      window.addEventListener('codex:generate', () => {
        if (triggerState.trigger && triggerState.phase === 'idle') {
          triggerState.phase = 'armed'
          void generate(triggerState.trigger)
        }
      })
    },

    onUnload() {
      removeExt?.()
      removePanel?.()
      removeExt = null
      removePanel = null
      _app = null
      triggerState.phase = 'idle'
      triggerState.trigger = null
      triggerState.ctrl?.abort()
    },
  }
}

export default makeCodexPlugin()
