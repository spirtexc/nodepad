import { SplitPane } from './split.ts'

export class LayoutManager {
  left!: HTMLElement
  right!: HTMLElement

  mount(container: HTMLElement): void {
    const split = new SplitPane(container)
    this.left = split.left
    this.right = split.right
  }
}

export const layout = new LayoutManager()
