import type { TreeNode, VaultFile, VaultFolder } from '../vault/file-tree.ts'

interface SidebarCallbacks {
  onOpenFolder: () => void
  onNewFile: () => void
  onNewFolder: () => void
  onRenameFile: (file: VaultFile, newName: string) => Promise<void>
  onRenameFolder: (folder: VaultFolder, newName: string) => Promise<void>
  onDeleteFile: (file: VaultFile) => Promise<void>
  onDeleteFolder: (folder: VaultFolder) => Promise<void>
  onNewFileInFolder: (folderPath: string) => Promise<void>
  onNewFolderInFolder: (folderPath: string) => Promise<void>
  onCompareFiles: (a: VaultFile, b: VaultFile) => void
  onMoveFile: (fromPath: string, toFolderPath: string) => Promise<void>
  onMoveFolder: (fromPath: string, toFolderPath: string) => Promise<void>
}

// ── Drag helpers ──────────────────────────────────────────────────────────────

interface DragPayload { type: 'file' | 'folder'; path: string; name: string }

let activeDrag: DragPayload | null = null

function getDragData(e: DragEvent): DragPayload | null {
  if (activeDrag) return activeDrag
  try {
    const raw = e.dataTransfer?.getData('text/plain')
    if (!raw) return null
    const d = JSON.parse(raw) as DragPayload
    return d.type === 'file' || d.type === 'folder' ? d : null
  } catch { return null }
}

// ── Cached icon templates (parse SVG once, clone per use) ─────────────────────

function makeIconEl(svgContent: string, w = 13): HTMLElement {
  const span = document.createElement('span')
  span.className = 'sidebar-item-icon'
  span.innerHTML = svgContent.replace('WW', String(w))
  return span
}

const FILE_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
const FOLDER_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
const CHEVRON_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`

let _fileIconTemplate: HTMLElement | null = null
let _folderIconTemplate: HTMLElement | null = null
let _chevronTemplate: HTMLElement | null = null

function fileIcon(): HTMLElement {
  if (!_fileIconTemplate) _fileIconTemplate = makeIconEl(FILE_SVG)
  return _fileIconTemplate.cloneNode(true) as HTMLElement
}
function folderIcon(): HTMLElement {
  if (!_folderIconTemplate) _folderIconTemplate = makeIconEl(FOLDER_SVG)
  return _folderIconTemplate.cloneNode(true) as HTMLElement
}
function chevronEl(): HTMLElement {
  if (!_chevronTemplate) {
    _chevronTemplate = document.createElement('span')
    _chevronTemplate.className = 'sidebar-folder-icon'
    _chevronTemplate.innerHTML = CHEVRON_SVG
  }
  return _chevronTemplate.cloneNode(true) as HTMLElement
}

// ── Context menu ──────────────────────────────────────────────────────────────

function showContextMenu(
  x: number,
  y: number,
  items: ({ label: string; danger?: boolean; action: () => void } | 'separator')[],
): void {
  document.querySelector('.sidebar-ctx-menu')?.remove()
  const menu = document.createElement('div')
  menu.className = 'sidebar-ctx-menu'
  menu.style.left = `${x}px`
  menu.style.top  = `${y}px`

  for (const item of items) {
    if (item === 'separator') {
      const sep = document.createElement('div')
      sep.className = 'sidebar-ctx-sep'
      menu.appendChild(sep)
      continue
    }
    const btn = document.createElement('button')
    btn.textContent = item.label
    if (item.danger) btn.className = 'danger'
    btn.addEventListener('click', () => { menu.remove(); item.action() })
    menu.appendChild(btn)
  }

  document.body.appendChild(menu)
  setTimeout(() => {
    const close = (e: Event) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove()
        document.removeEventListener('mousedown', close)
      }
    }
    document.addEventListener('mousedown', close)
  }, 0)
}

// ── Inline rename ─────────────────────────────────────────────────────────────

function startInlineRename(
  labelEl: HTMLElement,
  currentName: string,
  onConfirm: (newName: string) => void,
): void {
  const input = document.createElement('input')
  input.name = 'rename'
  input.autocomplete = 'off'
  input.className = 'sidebar-rename-input'
  input.value = currentName
  labelEl.replaceWith(input)
  input.focus()
  const dotIdx = currentName.lastIndexOf('.')
  input.setSelectionRange(0, dotIdx > 0 ? dotIdx : currentName.length)

  let done = false
  const confirm = () => {
    if (done) return
    done = true
    const newName = input.value.trim()
    if (document.body.contains(input)) input.replaceWith(labelEl)
    if (newName && newName !== currentName) onConfirm(newName)
  }
  const cancel = () => {
    if (done) return
    done = true
    if (document.body.contains(input)) input.replaceWith(labelEl)
  }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm() }
    if (e.key === 'Escape') cancel()
  })
  input.addEventListener('blur', cancel)
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export class Sidebar {
  private root: HTMLElement
  private list: HTMLElement
  private emptyMsg: HTMLElement
  private panelsEl: HTMLElement
  private items: Map<string, HTMLElement> = new Map()
  private fileElMap: Map<string, HTMLElement> = new Map()  // path → file DOM element
  private searchInput: HTMLInputElement | null = null
  private treeNodes: TreeNode[] = []
  private treeClickHandler: ((file: VaultFile) => void) | null = null
  private activeFilePath: string | null = null
  private compareSource: VaultFile | null = null
  private callbacks: SidebarCallbacks
  private expandedFolders: Set<string> = new Set()  // persists across re-renders
  private searchDebounceTimer = 0

  constructor(container: HTMLElement, callbacks: SidebarCallbacks) {
    this.callbacks = callbacks
    this.root = document.createElement('div')
    this.root.className = 'sidebar'

    this.root.appendChild(this.buildToolbar(callbacks))
    this.root.appendChild(this.buildSearch())

    this.list = document.createElement('div')
    this.list.className = 'sidebar-list'

    this.emptyMsg = document.createElement('div')
    this.emptyMsg.className = 'sidebar-empty'
    this.emptyMsg.textContent = 'Open a file or folder\nto get started'
    this.list.appendChild(this.emptyMsg)
    this.root.appendChild(this.list)

    // Root drop zone — drop onto the list background moves to vault root
    this.list.addEventListener('dragover', (e) => {
      const data = getDragData(e)
      if (!data) return
      const currentParent = data.path.split('/').slice(0, -1).join('/')
      if (currentParent === '') return
      if (!(e.target as HTMLElement).closest('.sidebar-folder-item')) {
        e.preventDefault()
        e.dataTransfer!.dropEffect = 'move'
        this.list.classList.add('drag-over-root')
      }
    })
    this.list.addEventListener('dragleave', (e) => {
      if (!this.list.contains(e.relatedTarget as Node)) this.list.classList.remove('drag-over-root')
    })
    this.list.addEventListener('drop', (e) => {
      this.list.classList.remove('drag-over-root')
      if ((e.target as HTMLElement).closest('.sidebar-folder-item')) return
      const data = getDragData(e)
      if (!data) return
      const currentParent = data.path.split('/').slice(0, -1).join('/')
      if (currentParent === '') return
      e.preventDefault()
      if (data.type === 'file') void this.callbacks.onMoveFile(data.path, '')
      else void this.callbacks.onMoveFolder(data.path, '')
    })

    this.panelsEl = document.createElement('div')
    this.panelsEl.className = 'sidebar-panels'
    this.root.appendChild(this.panelsEl)

    const handle = document.createElement('div')
    handle.className = 'sidebar-resize-handle'
    this.root.appendChild(handle)
    this.initResize(handle)

    container.appendChild(this.root)
  }

  // ── Panel API (for plugins) ────────────────────────────────────────────────

  addPanel(id: string, title: string, factory: (body: HTMLElement) => void): () => void {
    const existing = this.panelsEl.querySelector(`[data-panel-id="${id}"]`)
    existing?.remove()

    const panel = document.createElement('div')
    panel.className = 'sidebar-panel'
    panel.dataset['panelId'] = id

    const header = document.createElement('div')
    header.className = 'sidebar-panel-header'

    const chevron = chevronEl()
    chevron.className = 'sidebar-panel-chevron open'

    const titleEl = document.createElement('span')
    titleEl.className = 'sidebar-panel-title'
    titleEl.textContent = title

    header.appendChild(chevron)
    header.appendChild(titleEl)
    panel.appendChild(header)

    const body = document.createElement('div')
    body.className = 'sidebar-panel-body'
    panel.appendChild(body)

    header.addEventListener('click', () => {
      const collapsed = body.classList.toggle('collapsed')
      chevron.classList.toggle('open', !collapsed)
    })

    factory(body)
    this.panelsEl.appendChild(panel)
    return () => panel.remove()
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────

  private buildToolbar(callbacks: SidebarCallbacks): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'sidebar-toolbar'

    const title = document.createElement('span')
    title.className = 'sidebar-toolbar-title'
    title.textContent = 'Files'

    const newFileBtn = document.createElement('button')
    newFileBtn.className = 'sidebar-toolbar-btn'
    newFileBtn.title = 'New file'
    newFileBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`
    newFileBtn.addEventListener('click', () => {
      if (this.activeFilePath) {
        const parts = this.activeFilePath.split('/')
        const folderPath = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
        void callbacks.onNewFileInFolder(folderPath)
      } else {
        callbacks.onNewFile()
      }
    })

    const openFolderBtn = document.createElement('button')
    openFolderBtn.className = 'sidebar-toolbar-btn'
    openFolderBtn.title = 'Open folder'
    openFolderBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
    openFolderBtn.addEventListener('click', callbacks.onOpenFolder)

    const newFolderBtn = document.createElement('button')
    newFolderBtn.className = 'sidebar-toolbar-btn'
    newFolderBtn.title = 'New folder'
    newFolderBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`
    newFolderBtn.addEventListener('click', () => {
      if (this.activeFilePath) {
        const parts = this.activeFilePath.split('/')
        const folderPath = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
        void callbacks.onNewFolderInFolder(folderPath)
      } else {
        callbacks.onNewFolder()
      }
    })

    bar.appendChild(title)
    bar.appendChild(newFileBtn)
    bar.appendChild(newFolderBtn)
    bar.appendChild(openFolderBtn)
    return bar
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  private buildSearch(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'sidebar-search-wrap'

    const input = document.createElement('input')
    input.type = 'search'
    input.name = 'sidebar-search'
    input.autocomplete = 'off'
    input.className = 'sidebar-search'
    input.placeholder = 'Search page or heading…'
    this.searchInput = input

    input.addEventListener('input', () => {
      clearTimeout(this.searchDebounceTimer)
      this.searchDebounceTimer = window.setTimeout(() => {
        const q = input.value.toLowerCase().trim()
        if (this.treeNodes.length > 0) {
          this.applyTreeFilter(q)
        } else {
          this.items.forEach((el, name) => {
            el.style.display = q === '' || name.toLowerCase().includes(q) ? '' : 'none'
          })
        }
      }, 120)
    })

    wrap.appendChild(input)
    return wrap
  }

  private applyTreeFilter(q: string): void {
    if (!this.treeClickHandler) return
    this.list.innerHTML = ''
    this.fileElMap.clear()
    this.emptyMsg = document.createElement('div')
    this.emptyMsg.className = 'sidebar-empty'
    this.emptyMsg.textContent = 'No files match your search'
    const frag = document.createDocumentFragment()
    this.renderTree(this.treeNodes, frag, 0, q)
    if (!frag.querySelector('.sidebar-item, .sidebar-folder-item')) {
      frag.appendChild(this.emptyMsg)
    }
    this.list.appendChild(frag)
    if (this.activeFilePath) {
      this.fileElMap.get(this.activeFilePath)?.classList.add('active')
    }
  }

  // ── Tree rendering ─────────────────────────────────────────────────────────

  private renderTree(nodes: TreeNode[], container: Node, depth: number, filter = ''): boolean {
    let hasVisible = false
    for (const node of nodes) {
      if (node.kind === 'file') {
        if (filter && !node.file.name.toLowerCase().includes(filter)) continue
        const item = this.buildFileItem(node.file, depth)
        if (this.activeFilePath === node.file.path) item.classList.add('active')
        if (this.compareSource?.path === node.file.path) item.classList.add('compare-source')
        container.appendChild(item)
        hasVisible = true
      } else {
        const { folderEl, children, chevron } = this.buildFolderItem(node.folder, depth)
        const childFrag = document.createDocumentFragment()
        const childVisible = this.renderTree(node.folder.children, childFrag, depth + 1, filter)
        if (filter && !childVisible) continue
        // During a filter: always expand. Otherwise: restore saved state.
        const isExpanded = filter ? true : this.expandedFolders.has(node.folder.path)
        if (isExpanded) {
          chevron.classList.add('open')
        } else {
          children.classList.add('collapsed')
        }
        children.appendChild(childFrag)
        container.appendChild(folderEl)
        container.appendChild(children)
        hasVisible = true
      }
    }
    return hasVisible
  }

  private buildFolderItem(
    folder: VaultFolder,
    depth: number,
  ): { folderEl: HTMLElement; children: HTMLElement; chevron: HTMLElement } {
    const folderEl = document.createElement('div')
    folderEl.className = 'sidebar-folder-item'
    folderEl.style.paddingLeft = `${8 + depth * 16}px`
    folderEl.draggable = true

    const chevron = chevronEl()
    const fIcon = folderIcon()

    const label = document.createElement('span')
    label.className = 'sidebar-item-name'
    label.textContent = folder.name

    folderEl.appendChild(chevron)
    folderEl.appendChild(fIcon)
    folderEl.appendChild(label)

    const children = document.createElement('div')
    children.className = 'sidebar-folder-children'

    folderEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('input')) return
      const collapsed = children.classList.toggle('collapsed')
      chevron.classList.toggle('open', !collapsed)
      if (collapsed) {
        this.expandedFolders.delete(folder.path)
      } else {
        this.expandedFolders.add(folder.path)
      }
    })

    folderEl.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      showContextMenu(e.clientX, e.clientY, [
        {
          label: 'New File Here',
          action: () => void this.callbacks.onNewFileInFolder(folder.path),
        },
        {
          label: 'New Folder Here',
          action: () => void this.callbacks.onNewFolderInFolder(folder.path),
        },
        'separator',
        {
          label: 'Rename',
          action: () => startInlineRename(label, folder.name, (newName) => {
            void this.callbacks.onRenameFolder(folder, newName)
          }),
        },
        {
          label: 'Delete Folder',
          danger: true,
          action: () => {
            if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return
            void this.callbacks.onDeleteFolder(folder)
          },
        },
      ])
    })

    folderEl.addEventListener('dragstart', (e) => {
      e.stopPropagation()
      activeDrag = { type: 'folder', path: folder.path, name: folder.name }
      e.dataTransfer!.effectAllowed = 'move'
      e.dataTransfer!.setData('text/plain', JSON.stringify(activeDrag))
      folderEl.classList.add('dragging')
    })
    folderEl.addEventListener('dragend', () => {
      activeDrag = null
      folderEl.classList.remove('dragging')
    })

    folderEl.addEventListener('dragover', (e) => {
      const data = getDragData(e)
      if (!data) return
      if (data.type === 'folder' && (data.path === folder.path || folder.path.startsWith(data.path + '/'))) return
      const currentParent = data.path.split('/').slice(0, -1).join('/')
      if (currentParent === folder.path) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer!.dropEffect = 'move'
      folderEl.classList.add('drag-over')
    })
    folderEl.addEventListener('dragleave', (e) => {
      if (!folderEl.contains(e.relatedTarget as Node)) folderEl.classList.remove('drag-over')
    })
    folderEl.addEventListener('drop', (e) => {
      e.preventDefault()
      e.stopPropagation()
      folderEl.classList.remove('drag-over')
      const data = getDragData(e)
      if (!data) return
      if (data.type === 'file') void this.callbacks.onMoveFile(data.path, folder.path)
      else if (data.type === 'folder' && data.path !== folder.path) void this.callbacks.onMoveFolder(data.path, folder.path)
    })

    return { folderEl, children, chevron }
  }

  private buildFileItem(file: VaultFile, depth: number): HTMLElement {
    const item = document.createElement('div')
    item.className = 'sidebar-item'
    item.style.paddingLeft = `${8 + depth * 16}px`
    item.dataset['path'] = file.path
    item.draggable = true

    item.appendChild(fileIcon())

    const label = document.createElement('span')
    label.className = 'sidebar-item-name'
    label.textContent = file.name
    label.title = file.path

    item.appendChild(label)
    item.addEventListener('click', () => this.treeClickHandler?.(file))

    item.addEventListener('dragstart', (e) => {
      e.stopPropagation()
      activeDrag = { type: 'file', path: file.path, name: file.name }
      e.dataTransfer!.effectAllowed = 'move'
      e.dataTransfer!.setData('text/plain', JSON.stringify(activeDrag))
      item.classList.add('dragging')
    })
    item.addEventListener('dragend', () => {
      activeDrag = null
      item.classList.remove('dragging')
    })

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const isCompareSource = this.compareSource?.path === file.path
      const hasCompareSource = this.compareSource !== null && !isCompareSource

      showContextMenu(e.clientX, e.clientY, [
        {
          label: 'Rename',
          action: () => startInlineRename(label, file.name, (newName) => {
            void this.callbacks.onRenameFile(file, newName)
          }),
        },
        {
          label: 'Delete',
          danger: true,
          action: () => {
            if (!confirm(`Delete "${file.name}"?`)) return
            void this.callbacks.onDeleteFile(file)
          },
        },
        'separator',
        {
          label: 'Copy Path',
          action: () => navigator.clipboard.writeText(file.path).catch(() => {}),
        },
        'separator',
        ...(hasCompareSource
          ? [{
              label: `Compare with "${this.compareSource!.name}"`,
              action: () => {
                this.callbacks.onCompareFiles(this.compareSource!, file)
                this.compareSource = null
                this.refreshCompareHighlight()
              },
            }]
          : []),
        {
          label: isCompareSource ? 'Cancel Compare' : 'Select for Compare',
          action: () => {
            this.compareSource = isCompareSource ? null : file
            this.refreshCompareHighlight()
          },
        },
      ])
    })

    this.fileElMap.set(file.path, item)
    return item
  }

  private refreshCompareHighlight(): void {
    this.fileElMap.forEach((el, path) => {
      el.classList.toggle('compare-source', path === this.compareSource?.path)
    })
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private initResize(handle: HTMLElement): void {
    let dragging = false
    let startX = 0
    let startW = 0

    handle.addEventListener('mousedown', (e) => {
      dragging = true
      startX = e.clientX
      startW = this.root.getBoundingClientRect().width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    })

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return
      const w = Math.min(480, Math.max(160, startW + (e.clientX - startX)))
      this.root.style.width = `${w}px`
    })

    document.addEventListener('mouseup', () => {
      if (!dragging) return
      dragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    })
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setFileTree(nodes: TreeNode[], onFileClick: (file: VaultFile) => void): void {
    this.treeNodes = nodes
    this.treeClickHandler = onFileClick
    this.items.clear()
    this.fileElMap.clear()
    if (this.searchInput) this.searchInput.value = ''

    this.list.innerHTML = ''
    this.emptyMsg = document.createElement('div')
    this.emptyMsg.className = 'sidebar-empty'
    this.emptyMsg.textContent = 'No markdown files found'

    const frag = document.createDocumentFragment()
    const hasFiles = this.renderTree(nodes, frag, 0)
    if (!hasFiles) frag.appendChild(this.emptyMsg)
    this.list.appendChild(frag)
  }

  showLoading(): void {
    this.list.innerHTML = ''
    const msg = document.createElement('div')
    msg.className = 'sidebar-empty'
    msg.textContent = 'Loading…'
    this.list.appendChild(msg)
  }

  addFile(name: string, onClick: () => void): void {
    if (this.items.has(name)) return
    const allItems = this.list.querySelectorAll('.sidebar-item, .sidebar-folder-item')
    if (allItems.length === 0) this.list.querySelector('.sidebar-empty')?.remove()

    const item = document.createElement('div')
    item.className = 'sidebar-item'

    item.appendChild(fileIcon())

    const label = document.createElement('span')
    label.className = 'sidebar-item-name'
    label.textContent = name
    label.title = name

    item.appendChild(label)
    item.addEventListener('click', onClick)
    this.items.set(name, item)
    this.list.appendChild(item)
  }

  setActive(name: string): void {
    this.items.forEach((el, key) => el.classList.toggle('active', key === name))
  }

  setActivePath(path: string): void {
    // O(1): clear old, set new using the path→element map
    if (this.activeFilePath) {
      this.fileElMap.get(this.activeFilePath)?.classList.remove('active')
    }
    this.activeFilePath = path
    this.fileElMap.get(path)?.classList.add('active')
  }

  setTags(tags: string[], onTagClick: (tag: string) => void): void {
    this.root.querySelector('.sidebar-tags-section')?.remove()
    if (tags.length === 0) return

    const section = document.createElement('div')
    section.className = 'sidebar-tags-section'

    const header = document.createElement('div')
    header.className = 'sidebar-tags-header'
    header.textContent = 'Tags'
    section.appendChild(header)

    const tagList = document.createElement('div')
    tagList.className = 'sidebar-tags-list'
    for (const tag of tags) {
      const pill = document.createElement('span')
      pill.className = 'sidebar-tag-pill'
      pill.textContent = `#${tag}`
      pill.addEventListener('click', () => onTagClick(tag))
      tagList.appendChild(pill)
    }
    section.appendChild(tagList)
    this.root.appendChild(section)
  }

  focusSearch(): void {
    if (this.searchInput) {
      this.searchInput.focus()
      this.searchInput.select()
    }
  }

  filterByPaths(paths: string[]): void {
    const pathSet = new Set(paths)
    this.fileElMap.forEach((el, path) => {
      el.style.display = pathSet.has(path) ? '' : 'none'
    })
  }

  clear(): void {
    this.items.forEach(el => el.remove())
    this.items.clear()
    this.fileElMap.clear()
    this.treeNodes = []
    this.treeClickHandler = null
    this.list.innerHTML = ''
    this.emptyMsg = document.createElement('div')
    this.emptyMsg.className = 'sidebar-empty'
    this.emptyMsg.textContent = 'Open a file or folder\nto get started'
    this.list.appendChild(this.emptyMsg)
  }
}
