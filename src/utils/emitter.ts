type Listener<T> = (arg: T) => void

export function makeEmitter<T>() {
  const listeners = new Set<Listener<T>>()
  return {
    emit(arg: T) { listeners.forEach(l => l(arg)) },
    on(cb: Listener<T>): () => void {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

export function makeVoidEmitter() {
  const listeners = new Set<() => void>()
  return {
    emit() { listeners.forEach(l => l()) },
    on(cb: () => void): () => void {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
