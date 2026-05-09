import { get, set } from 'idb-keyval'

export type { VaultFile } from './file-tree.ts'
export type { VaultFolder } from './file-tree.ts'

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
      const dir = await window.showDirectoryPicker({ mode: 'readwrite' })
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

  private async resolveDir(path: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null
    const parts = path.split('/').filter(Boolean)
    let dir: FileSystemDirectoryHandle = this.dirHandle
    for (const part of parts) {
      try { dir = await dir.getDirectoryHandle(part) }
      catch { return null }
    }
    return dir
  }

  private async copyDir(src: FileSystemDirectoryHandle, dst: FileSystemDirectoryHandle): Promise<void> {
    for await (const [name, entry] of src.entries()) {
      if (entry.kind === 'file') {
        const buf = await (await entry.getFile()).arrayBuffer()
        const dstFile = await dst.getFileHandle(name, { create: true })
        const w = await dstFile.createWritable()
        await w.write(buf)
        await w.close()
      } else {
        await this.copyDir(entry, await dst.getDirectoryHandle(name, { create: true }))
      }
    }
  }

  async deleteFile(filePath: string, name: string): Promise<boolean> {
    if (!this.dirHandle) return false
    try {
      const parentPath = filePath.split('/').slice(0, -1).join('/')
      const parentDir = parentPath ? await this.resolveDir(parentPath) : this.dirHandle
      if (!parentDir) return false
      await parentDir.removeEntry(name)
      return true
    } catch { return false }
  }

  async deleteFolder(folderPath: string, name: string): Promise<boolean> {
    if (!this.dirHandle) return false
    try {
      const parentPath = folderPath.split('/').slice(0, -1).join('/')
      const parentDir = parentPath ? await this.resolveDir(parentPath) : this.dirHandle
      if (!parentDir) return false
      await parentDir.removeEntry(name, { recursive: true })
      return true
    } catch { return false }
  }

  async createFileInFolder(folderPath: string, name: string): Promise<FileSystemFileHandle | null> {
    if (!this.dirHandle) return null
    try {
      const dir = folderPath ? await this.resolveDir(folderPath) : this.dirHandle
      if (!dir) return null
      return await dir.getFileHandle(name, { create: true })
    } catch { return null }
  }

  async createFolderInFolder(folderPath: string, name: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null
    try {
      const dir = folderPath ? await this.resolveDir(folderPath) : this.dirHandle
      if (!dir) return null
      return await dir.getDirectoryHandle(name, { create: true })
    } catch { return null }
  }

  async moveFile(fromPath: string, toFolderPath: string): Promise<boolean> {
    if (!this.dirHandle) return false
    try {
      const name = fromPath.split('/').pop()!
      const fromParentPath = fromPath.split('/').slice(0, -1).join('/')
      const fromDir = fromParentPath ? await this.resolveDir(fromParentPath) : this.dirHandle
      if (!fromDir) return false
      const toDir = toFolderPath ? await this.resolveDir(toFolderPath) : this.dirHandle
      if (!toDir) return false
      const srcHandle = await fromDir.getFileHandle(name)
      const buf = await (await srcHandle.getFile()).arrayBuffer()
      const dstHandle = await toDir.getFileHandle(name, { create: true })
      const w = await dstHandle.createWritable()
      await w.write(buf)
      await w.close()
      await fromDir.removeEntry(name)
      return true
    } catch { return false }
  }

  async moveFolder(fromPath: string, toFolderPath: string): Promise<boolean> {
    if (!this.dirHandle) return false
    try {
      const name = fromPath.split('/').pop()!
      const fromParentPath = fromPath.split('/').slice(0, -1).join('/')
      const fromParent = fromParentPath ? await this.resolveDir(fromParentPath) : this.dirHandle
      if (!fromParent) return false
      const toDir = toFolderPath ? await this.resolveDir(toFolderPath) : this.dirHandle
      if (!toDir) return false
      const srcDir = await fromParent.getDirectoryHandle(name)
      const dstDir = await toDir.getDirectoryHandle(name, { create: true })
      await this.copyDir(srcDir, dstDir)
      await fromParent.removeEntry(name, { recursive: true })
      return true
    } catch { return false }
  }

  async renameFile(filePath: string, oldName: string, newName: string): Promise<boolean> {
    if (!this.dirHandle) return false
    try {
      const parentPath = filePath.split('/').slice(0, -1).join('/')
      const parentDir = parentPath ? await this.resolveDir(parentPath) : this.dirHandle
      if (!parentDir) return false
      const handle = await parentDir.getFileHandle(oldName)
      const content = await (await handle.getFile()).arrayBuffer()
      const newHandle = await parentDir.getFileHandle(newName, { create: true })
      const w = await newHandle.createWritable()
      await w.write(content)
      await w.close()
      await parentDir.removeEntry(oldName)
      return true
    } catch { return false }
  }

  async renameFolder(folderPath: string, oldName: string, newName: string): Promise<boolean> {
    if (!this.dirHandle) return false
    try {
      const parentPath = folderPath.split('/').slice(0, -1).join('/')
      const parentDir = parentPath ? await this.resolveDir(parentPath) : this.dirHandle
      if (!parentDir) return false
      const oldDir = await parentDir.getDirectoryHandle(oldName)
      const newDir = await parentDir.getDirectoryHandle(newName, { create: true })
      await this.copyDir(oldDir, newDir)
      await parentDir.removeEntry(oldName, { recursive: true })
      return true
    } catch { return false }
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
