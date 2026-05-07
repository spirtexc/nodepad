import { get, set } from 'idb-keyval'

export type { VaultFile } from './file-tree.ts'

export class Vault {
  private dirHandle: FileSystemDirectoryHandle | null = null

  async openFile(): Promise<{ name: string; handle: FileSystemFileHandle; content: string } | null> {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Markdown / Text', accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt', '.TXT'] } }],
        multiple: false,
      })
      const file = await handle.getFile()
      const content = await file.text()
      return { name: file.name, handle, content }
    } catch {
      return null
    }
  }

  async saveFile(handle: FileSystemFileHandle, content: string): Promise<void> {
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async openFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const dir = await window.showDirectoryPicker()
      this.dirHandle = dir
      await set('handle:vault', dir)
      return dir
    } catch {
      return null
    }
  }

  async tryRestoreVault(): Promise<boolean> {
    try {
      const handle = await get<FileSystemDirectoryHandle>('handle:vault')
      if (!handle) return false
      const perm = await handle.requestPermission({ mode: 'readwrite' })
      if (perm !== 'granted') return false
      this.dirHandle = handle
      return true
    } catch {
      return false
    }
  }

  getVaultRoot(): FileSystemDirectoryHandle | null {
    return this.dirHandle
  }

  async createFile(name: string): Promise<FileSystemFileHandle | null> {
    if (!this.dirHandle) return null
    try {
      return await this.dirHandle.getFileHandle(name, { create: true })
    } catch {
      return null
    }
  }

  async createFolder(name: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null
    try {
      return await this.dirHandle.getDirectoryHandle(name, { create: true })
    } catch {
      return null
    }
  }

  async readFileByHandle(handle: FileSystemFileHandle): Promise<string> {
    const file = await handle.getFile()
    return file.text()
  }

  async scanPluginFiles(): Promise<{ name: string; handle: FileSystemFileHandle }[]> {
    if (!this.dirHandle) return []
    try {
      const pluginsDir = await this.dirHandle.getDirectoryHandle('plugins')
      const results: { name: string; handle: FileSystemFileHandle }[] = []
      for await (const [name, entry] of pluginsDir.entries()) {
        if (entry.kind === 'file' && name.endsWith('.js')) {
          results.push({ name, handle: entry })
        }
      }
      return results
    } catch {
      return []
    }
  }

  async listMarkdownFiles(
    dir: FileSystemDirectoryHandle,
  ): Promise<{ name: string; handle: FileSystemFileHandle }[]> {
    const results: { name: string; handle: FileSystemFileHandle }[] = []
    await this.walkDir(dir, results)
    return results
  }

  private async walkDir(
    dir: FileSystemDirectoryHandle,
    results: { name: string; handle: FileSystemFileHandle }[],
  ): Promise<void> {
    for await (const [, entry] of dir.entries()) {
      if (entry.kind === 'file' && (entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase().endsWith('.txt'))) {
        results.push({ name: entry.name, handle: entry })
      } else if (entry.kind === 'directory') {
        await this.walkDir(entry, results)
      }
    }
  }
}
