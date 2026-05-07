import type { VaultSearch, SearchResult } from '../vault/search.ts'

export class QuickSwitcher {
  private search: VaultSearch
  private overlay: HTMLElement | null = null
  private resultList: HTMLElement | null = null
  private results: SearchResult[] = []
  private activeIndex = -1

  constructor(search: VaultSearch) {
    this.search = search
  }

  open(onSelect: (path: string) => void): void {
    if (this.overlay) return

    const overlay = document.createElement('div')
    overlay.className = 'qs-overlay'

    const box = document.createElement('div')
    box.className = 'qs-box'

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'qs-input'
    input.placeholder = 'Search files…'
    const resultList = document.createElement('div')
    resultList.className = 'qs-results'
    this.resultList = resultList

    box.appendChild(input)
    box.appendChild(resultList)
    overlay.appendChild(box)
    document.body.appendChild(overlay)
    this.overlay = overlay

    input.addEventListener('input', () => {
      this.results = this.search.search(input.value)
      this.activeIndex = this.results.length > 0 ? 0 : -1
      this.renderResults(onSelect)
    })

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.activeIndex = Math.min(this.activeIndex + 1, this.results.length - 1)
        this.highlightActive()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.activeIndex = Math.max(this.activeIndex - 1, 0)
        this.highlightActive()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = this.results[this.activeIndex]
        if (selected) {
          this.close()
          onSelect(selected.path)
        }
      } else if (e.key === 'Escape') {
        this.close()
      }
    })

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close()
    })

    requestAnimationFrame(() => input.focus())
  }

  close(): void {
    this.overlay?.remove()
    this.overlay = null
    this.resultList = null
    this.results = []
    this.activeIndex = -1
  }

  private renderResults(onSelect: (path: string) => void): void {
    if (!this.resultList) return
    this.resultList.innerHTML = ''

    const shown = this.results.slice(0, 8)
    for (let i = 0; i < shown.length; i++) {
      const r = shown[i]!
      const item = document.createElement('div')
      item.className = 'qs-result-item'
      if (i === this.activeIndex) item.classList.add('active')

      const nameEl = document.createElement('div')
      nameEl.className = 'qs-result-name'
      nameEl.textContent = r.name

      const pathEl = document.createElement('div')
      pathEl.className = 'qs-result-path'
      pathEl.textContent = r.path

      item.appendChild(nameEl)
      item.appendChild(pathEl)

      const idx = i
      item.addEventListener('mousedown', (e) => {
        e.preventDefault()
        this.close()
        onSelect(r.path)
      })
      item.addEventListener('mouseenter', () => {
        this.activeIndex = idx
        this.highlightActive()
      })

      this.resultList.appendChild(item)
    }
  }

  private highlightActive(): void {
    if (!this.resultList) return
    const items = this.resultList.querySelectorAll('.qs-result-item')
    items.forEach((el, i) => {
      el.classList.toggle('active', i === this.activeIndex)
    })
  }
}
