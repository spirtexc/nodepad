import type { App } from '../../src/plugin-api/index.ts'

export interface CodexConfig {
  endpointUrl: string
  apiKey: string
  model: string
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
export async function loadConfig(app: App): Promise<CodexConfig> {
  const raw = await app.readConfig('codex/credentials.enc')
  if (!raw) return { endpointUrl: '', apiKey: '', model: '' }
  try {
    const json = await decryptString(raw.trim())
    return JSON.parse(json)
  } catch {
    return { endpointUrl: '', apiKey: '', model: '' }
  }
}

export async function saveConfig(app: App, config: CodexConfig): Promise<void> {
  const json = JSON.stringify(config)
  const encrypted = await encryptString(json)
  await app.writeConfig('codex/credentials.enc', encrypted)
}
