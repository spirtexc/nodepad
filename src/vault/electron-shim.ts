declare global {
  interface Window {
    electronAPI?: {
      selectDirectory(): Promise<{ name: string; path: string } | null>
      selectFile(): Promise<{ name: string; path: string } | null>
      readDirectory(path: string): Promise<{ name: string; isDirectory: boolean }[]>
      readFile(path: string): Promise<string>
      writeFile(path: string, content: string): Promise<void>
      exists(path: string): Promise<boolean>
      isDirectory(path: string): Promise<boolean>
      mkdir(path: string): Promise<void>
      unlink(path: string): Promise<void>
      rmdir(path: string, recursive: boolean): Promise<void>
      rename(oldPath: string, newPath: string): Promise<void>
      openDetachedWindow(path: string, name: string): void
      openDetachedWindowAtCursor(path: string, name: string): void
      redockTab(path: string, name: string): void
      closeDetachedWindow(path: string): void
      watchDirectory(path: string): Promise<void>
      onFileUpdated(callback: (path: string) => void): () => void
      onTabRedock(callback: (path: string, name: string) => void): () => void
    }
  }
}

export class ElectronWritableFileStream {
  private filePath: string
  private buffer: string = ''

  constructor(filePath: string) {
    this.filePath = filePath
  }

  async write(content: any): Promise<void> {
    if (typeof content === 'string') {
      this.buffer = content
    } else if (content instanceof ArrayBuffer || ArrayBuffer.isView(content)) {
      const decoder = new TextDecoder('utf-8')
      this.buffer = decoder.decode(content)
    } else {
      this.buffer = String(content)
    }
  }

  async close(): Promise<void> {
    if (!window.electronAPI) throw new Error('electronAPI is not available')
    await window.electronAPI.writeFile(this.filePath, this.buffer)
  }

  async seek(): Promise<void> {}
  async truncate(): Promise<void> {}
}

export class ElectronFileHandle {
  kind = 'file' as const
  name: string
  path: string // Host absolute path

  constructor(name: string, path: string) {
    this.name = name
    this.path = path
  }

  async getFile(): Promise<File> {
    if (!window.electronAPI) throw new Error('electronAPI is not available')
    const text = await window.electronAPI.readFile(this.path)
    return new File([text], this.name, { type: 'text/markdown' })
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    return new ElectronWritableFileStream(this.path) as unknown as FileSystemWritableFileStream
  }
}

export class ElectronDirectoryHandle {
  kind = 'directory' as const
  name: string
  path: string // Host absolute path

  constructor(name: string, path: string) {
    this.name = name
    this.path = path
  }

  async *entries(): AsyncIterableIterator<[string, ElectronDirectoryHandle | ElectronFileHandle]> {
    if (!window.electronAPI) throw new Error('electronAPI is not available')
    const list = await window.electronAPI.readDirectory(this.path)
    for (const item of list) {
      const itemPath = `${this.path}/${item.name}`
      if (item.isDirectory) {
        yield [item.name, new ElectronDirectoryHandle(item.name, itemPath)]
      } else {
        yield [item.name, new ElectronFileHandle(item.name, itemPath)]
      }
    }
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<ElectronFileHandle> {
    if (!window.electronAPI) throw new Error('electronAPI is not available')
    const itemPath = `${this.path}/${name}`
    if (options?.create) {
      const exists = await window.electronAPI.exists(itemPath)
      if (!exists) {
        await window.electronAPI.writeFile(itemPath, '')
      }
    }
    return new ElectronFileHandle(name, itemPath)
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<ElectronDirectoryHandle> {
    if (!window.electronAPI) throw new Error('electronAPI is not available')
    const itemPath = `${this.path}/${name}`
    if (options?.create) {
      const exists = await window.electronAPI.exists(itemPath)
      if (!exists) {
        await window.electronAPI.mkdir(itemPath)
      }
    }
    return new ElectronDirectoryHandle(name, itemPath)
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    if (!window.electronAPI) throw new Error('electronAPI is not available')
    const itemPath = `${this.path}/${name}`
    const isDir = await window.electronAPI.isDirectory(itemPath)
    if (isDir) {
      await window.electronAPI.rmdir(itemPath, options?.recursive ?? false)
    } else {
      await window.electronAPI.unlink(itemPath)
    }
  }
}
