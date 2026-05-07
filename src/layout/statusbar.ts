export class StatusBar {
  private root: HTMLElement
  private filenameItem: HTMLElement
  private posItem: HTMLElement
  private wordItem: HTMLElement

  constructor(container: HTMLElement) {
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

    this.root.appendChild(this.filenameItem)
    this.root.appendChild(spacer)
    this.root.appendChild(this.posItem)
    this.root.appendChild(this.wordItem)

    container.appendChild(this.root)
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
