export class SplitPane {
  left: HTMLElement
  right: HTMLElement
  private handle: HTMLElement
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    container.style.display = 'flex'
    container.style.flexDirection = 'row'
    container.style.flex = '1'
    container.style.minHeight = '0'
    container.style.overflow = 'hidden'

    this.left = document.createElement('div')
    this.left.style.width = '220px'
    this.left.style.minWidth = '150px'
    this.left.style.flexShrink = '0'
    this.left.style.height = '100%'
    this.left.style.overflow = 'hidden'

    this.handle = document.createElement('div')
    this.handle.style.width = '4px'
    this.handle.style.cursor = 'col-resize'
    this.handle.style.background = 'var(--border)'
    this.handle.style.flexShrink = '0'
    this.handle.style.userSelect = 'none'

    this.right = document.createElement('div')
    this.right.style.flex = '1'
    this.right.style.minWidth = '0'
    this.right.style.height = '100%'
    this.right.style.overflow = 'hidden'

    container.appendChild(this.left)
    container.appendChild(this.handle)
    container.appendChild(this.right)

    this.initResize()
  }

  private initResize(): void {
    let dragging = false
    let startX = 0
    let startWidth = 0

    this.handle.addEventListener('mousedown', (e) => {
      dragging = true
      startX = e.clientX
      startWidth = this.left.getBoundingClientRect().width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    })

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return
      const delta = e.clientX - startX
      const containerWidth = this.container.getBoundingClientRect().width
      const maxWidth = containerWidth * 0.7
      const newWidth = Math.min(maxWidth, Math.max(150, startWidth + delta))
      this.left.style.width = `${newWidth}px`
    })

    document.addEventListener('mouseup', () => {
      if (!dragging) return
      dragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    })
  }
}
