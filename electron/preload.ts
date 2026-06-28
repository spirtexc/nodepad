import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File pickers
  selectDirectory: () => ipcRenderer.invoke('fs:select-directory'),
  selectFile: () => ipcRenderer.invoke('fs:select-file'),

  // FS basics
  readDirectory: (path: string) => ipcRenderer.invoke('fs:read-directory', path),
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  isDirectory: (path: string) => ipcRenderer.invoke('fs:is-directory', path),
  mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  unlink: (path: string) => ipcRenderer.invoke('fs:unlink', path),
  rmdir: (path: string, recursive: boolean) => ipcRenderer.invoke('fs:rmdir', path, recursive),
  rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:rename', oldPath, newPath),

  // Multi-window
  openDetachedWindow: (path: string, name: string) => ipcRenderer.send('window:open-detached', path, name),
  openDetachedWindowAtCursor: (path: string, name: string) => ipcRenderer.send('window:open-detached-at-cursor', path, name),
  redockTab: (path: string, name: string) => ipcRenderer.send('window:redock-tab', path, name),
  closeDetachedWindow: (path: string) => ipcRenderer.send('window:close-detached', path),

  // Real-time synchronization
  watchDirectory: (path: string) => ipcRenderer.invoke('fs:watch-directory', path),
  onFileUpdated: (callback: (path: string) => void) => {
    const subscription = (_event: any, filePath: string) => callback(filePath)
    ipcRenderer.on('fs:file-updated', subscription)
    return () => {
      ipcRenderer.removeListener('fs:file-updated', subscription)
    }
  },
  onTabRedock: (callback: (path: string, name: string) => void) => {
    const subscription = (_event: any, path: string, name: string) => callback(path, name)
    ipcRenderer.on('tab:redock', subscription)
    return () => {
      ipcRenderer.removeListener('tab:redock', subscription)
    }
  }
})
