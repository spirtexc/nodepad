export class TabBar {
  private root: HTMLElement
  private tabs: Map<string, HTMLElement> = new Map()
  private activeTab: string | null = null

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'tab-bar'

    const empty = document.createElement('div')
    empty.className = 'tab-bar-empty'
    empty.textContent = 'No file open'
    this.root.appendChild(empty)

    container.appendChild(this.root)
  }

  addTab(name: string, onClick: () => void): void {
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
    tab.addEventListener('click', onClick)

    this.tabs.set(name, tab)
    this.root.appendChild(tab)
    this.setActive(name)
  }

  setActive(name: string): void {
    this.activeTab = name
    this.tabs.forEach((el, key) => {
      el.classList.toggle('active', key === name)
    })
    const tab = this.tabs.get(name)
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  markUnsaved(name: string, unsaved: boolean): void {
    const tab = this.tabs.get(name)
    if (tab) tab.classList.toggle('unsaved', unsaved)
  }

  getActive(): string | null {
    return this.activeTab
  }
}
