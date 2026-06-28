import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { VaultFile } from '../vault/file-tree.ts'

export type Unsubscribe = () => void

export interface Command {
  id: string
  name: string
  callback: () => void
  hotkey?: string
}

export interface View {
  container: HTMLElement
  onClose?: () => void
}

export type Permission =
  | 'read-files'
  | 'write-files'
  | 'network'
  | 'ui-panels'
  | 'commands'
  | 'editor'

export interface App {
  registerPlugin(plugin: Plugin): void
  addView(id: string, factory: (container: HTMLElement) => View): void
  addSidebarPanel(id: string, title: string, factory: (container: HTMLElement) => void): Unsubscribe
  openDiff(nameA: string, contentA: string, nameB: string, contentB: string, onRestoreA?: () => void): void
  addCommand(cmd: Command): void
  addMenuItem(label: string, onClick: () => void): void
  addSidebarIcon(icon: string, title: string, onClick: () => void): void
  addStatusBarItem(): HTMLElement
  openModal(content: HTMLElement): () => void
  getActiveEditor(): EditorView | null
  replaceSelection(text: string): void
  addEditorExtension(extension: Extension): Unsubscribe
  getActiveFile(): VaultFile | null
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  readConfig(path: string): Promise<string>
  writeConfig(path: string, content: string): Promise<void>
  listFiles(folder?: string): VaultFile[]
  getBacklinks(path: string): VaultFile[]
  openFile(path: string): Promise<void>
  onFileOpen(cb: (file: VaultFile) => void): Unsubscribe
  onFileChange(cb: (file: VaultFile) => void): Unsubscribe
  onFileSave(cb: (file: VaultFile) => void): Unsubscribe
  onFileRename(cb: (oldPath: string, newPath: string) => void): Unsubscribe
  onPreviewUpdate(cb: (container: HTMLElement) => void): Unsubscribe
  onOnline(cb: () => void): Unsubscribe
  onOffline(cb: () => void): Unsubscribe
}

export interface Plugin {
  id: string
  name: string
  version: string
  permissions: Permission[]
  onLoad(app: App): void | Promise<void>
  onUnload(): void | Promise<void>
}
