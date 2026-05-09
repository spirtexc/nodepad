export class StatusBar {
  private root: HTMLElement
  private filenameItem: HTMLElement
  private posItem: HTMLElement
  private wordItem: HTMLElement
  private pluginsToggle: HTMLButtonElement

  constructor(container: HTMLElement, onPluginsToggle: (enabled: boolean) => void, initialEnabled = true) {
    this.root = document.createElement('div')
    this.root.className = 'statusbar'

    this.filenameItem = document.createElement('span')
    this.filenameItem.className = 'statusbar-item statusbar-filename'

    const spacer = document.createElement('span')
    spacer.className = 'statusbar-spacer'

    this.posItem = document.createElement('span')
    this.posItem.className = 'statusbar-item'
    this.posItem.textContent = 'Ln 1, Col 1'

    this.wordItem = document.createElement('span')
    this.wordItem.className = 'statusbar-item'
    this.wordItem.textContent = '0 words'

    this.pluginsToggle = document.createElement('button')
    this.pluginsToggle.className = 'statusbar-plugins-toggle'
    this.pluginsToggle.title = 'Toggle all plugins'
    this._syncToggle(initialEnabled)
    this.pluginsToggle.addEventListener('click', () => {
      const next = this.pluginsToggle.dataset['enabled'] !== 'true'
      this._syncToggle(next)
      onPluginsToggle(next)
    })

    this.root.appendChild(this.filenameItem)
    this.root.appendChild(spacer)
    this.root.appendChild(this.posItem)
    this.root.appendChild(this.wordItem)
    this.root.appendChild(this.pluginsToggle)

    container.appendChild(this.root)
  }

  setPluginsEnabled(enabled: boolean): void {
    this._syncToggle(enabled)
  }

  private _syncToggle(enabled: boolean): void {
    this.pluginsToggle.dataset['enabled'] = String(enabled)
    this.pluginsToggle.textContent = enabled ? '⬡ Plugins ON' : '⬡ Plugins OFF'
    this.pluginsToggle.setAttribute('aria-pressed', String(enabled))
  }

  setFilename(name: string): void {
    this.filenameItem.textContent = name
  }

  update(line: number, col: number, words: number): void {
    this.posItem.textContent = `Ln ${line}, Col ${col}`
    this.wordItem.textContent = `${words} word${words !== 1 ? 's' : ''}`
  }

  addItem(): HTMLElement {
    const item = document.createElement('span')
    item.className = 'statusbar-item'
    this.root.appendChild(item)
    return item
  }
}
