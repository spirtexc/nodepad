const DETACHED_MIME = 'application/x-nodepad-detached'

export class TabBar {
  private root: HTMLElement
  private tabs: Map<string, HTMLElement> = new Map()
  private activeTab: string | null = null
  private _isDraggingTab = false
  private _dragLeftWindow = false
  private _dropIndicator: HTMLElement

  onDetachedTabDrop?: (filePath: string, fileName: string, insertIndex: number) => void

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'tab-bar'

    // Vertical drop indicator line
    this._dropIndicator = document.createElement('div')
    this._dropIndicator.className = 'tab-drop-indicator'
    this.root.appendChild(this._dropIndicator)

    const empty = document.createElement('div')
    empty.className = 'tab-bar-empty'
    empty.textContent = 'No file open'
    this.root.appendChild(empty)

    container.appendChild(this.root)

    // Track when an own tab is dragged outside this window
    document.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget && this._isDraggingTab) this._dragLeftWindow = true
    })
    document.addEventListener('dragenter', () => {
      if (this._isDraggingTab) this._dragLeftWindow = false
    })

    // Accept drops from detached windows
    this.root.addEventListener('dragover', (e) => {
      if (!e.dataTransfer?.types.includes(DETACHED_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      this._showDropIndicator(this._getDropIndex(e.clientX))
    })
    this.root.addEventListener('dragleave', (e) => {
      // Only hide if leaving the root itself, not a child
      if (!this.root.contains(e.relatedTarget as Node)) this._hideDropIndicator()
    })
    this.root.addEventListener('drop', (e) => {
      e.preventDefault()
      this._hideDropIndicator()
      const raw = e.dataTransfer?.getData(DETACHED_MIME)
      if (!raw) return
      try {
        const { filePath, fileName } = JSON.parse(raw) as { filePath: string; fileName: string }
        this.onDetachedTabDrop?.(filePath, fileName, this._getDropIndex(e.clientX))
      } catch {}
    })
  }

  addTab(
    name: string,
    onClick: () => void,
    onDetach?: () => void,
    onClose?: () => void,
    onDragOut?: () => void,
    insertIndex?: number,
    dragMimeData?: { filePath: string; fileName: string },
  ): void {
    if (this.tabs.has(name)) {
      this.setActive(name)
      return
    }

    const existing = this.root.querySelector('.tab-bar-empty')
    if (existing) existing.remove()

    const tab = document.createElement('div')
    tab.className = 'tab-item'

    const dot = document.createElement('span')
    dot.className = 'tab-item-dot'

    const label = document.createElement('span')
    label.className = 'tab-item-name'
    label.textContent = name
    label.title = name

    tab.appendChild(dot)
    tab.appendChild(label)

    if (onDetach) {
      const detachBtn = document.createElement('span')
      detachBtn.className = 'tab-item-detach'
      detachBtn.title = 'Open in detached window'
      detachBtn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      `
      detachBtn.addEventListener('click', (e) => { e.stopPropagation(); onDetach() })
      tab.appendChild(detachBtn)
    }

    const closeBtn = document.createElement('span')
    closeBtn.className = 'tab-item-close'
    closeBtn.title = 'Close tab'
    closeBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    `
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); onClose?.() })
    tab.appendChild(closeBtn)

    if (onDragOut) {
      tab.draggable = true
      tab.addEventListener('dragstart', (e) => {
        this._isDraggingTab = true
        this._dragLeftWindow = false
        e.dataTransfer!.effectAllowed = 'move'
        e.dataTransfer!.setData('text/plain', name)
        if (dragMimeData) {
          e.dataTransfer!.setData(DETACHED_MIME, JSON.stringify(dragMimeData))
        }
        tab.classList.add('dragging')
      })
      tab.addEventListener('dragend', (e) => {
        tab.classList.remove('dragging')
        const didLeave = this._dragLeftWindow
        this._isDraggingTab = false
        this._dragLeftWindow = false
        if (e.dataTransfer?.dropEffect === 'move') {
          // Another tab bar accepted the drop — just remove this source tab
          onClose?.()
        } else if (didLeave) {
          // Dragged outside all windows — open as new standalone detached window
          onDragOut()
        }
      })
    }

    tab.addEventListener('click', onClick)

    // Insert at specific position or append
    const tabEls = [...this.tabs.values()]
    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex < tabEls.length) {
      this.root.insertBefore(tab, tabEls[insertIndex])
      const entries = [...this.tabs.entries()]
      entries.splice(insertIndex, 0, [name, tab])
      this.tabs = new Map(entries)
    } else {
      this.root.appendChild(tab)
      this.tabs.set(name, tab)
    }

    this.setActive(name)
  }

  removeTab(name: string): void {
    const tab = this.tabs.get(name)
    if (tab) { tab.remove(); this.tabs.delete(name) }
    if (this.activeTab === name) this.activeTab = null
    if (this.tabs.size === 0) {
      const empty = document.createElement('div')
      empty.className = 'tab-bar-empty'
      empty.textContent = 'No file open'
      this.root.appendChild(empty)
    }
  }

  setActive(name: string): void {
    this.activeTab = name
    this.tabs.forEach((el, key) => el.classList.toggle('active', key === name))
    this.tabs.get(name)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  markUnsaved(name: string, unsaved: boolean): void {
    this.tabs.get(name)?.classList.toggle('unsaved', unsaved)
  }

  getActive(): string | null { return this.activeTab }

  private _getDropIndex(clientX: number): number {
    const tabEls = [...this.tabs.values()]
    for (let i = 0; i < tabEls.length; i++) {
      const rect = tabEls[i].getBoundingClientRect()
      if (clientX < rect.left + rect.width / 2) return i
    }
    return tabEls.length
  }

  private _showDropIndicator(index: number): void {
    const tabEls = [...this.tabs.values()]
    const barRect = this.root.getBoundingClientRect()
    let x = 0
    if (tabEls.length === 0) {
      x = 0
    } else if (index < tabEls.length) {
      x = tabEls[index].getBoundingClientRect().left - barRect.left + this.root.scrollLeft
    } else {
      const last = tabEls[tabEls.length - 1]
      x = last.getBoundingClientRect().right - barRect.left + this.root.scrollLeft
    }
    this._dropIndicator.style.left = `${x}px`
    this._dropIndicator.style.display = 'block'
  }

  private _hideDropIndicator(): void {
    this._dropIndicator.style.display = 'none'
  }
}
