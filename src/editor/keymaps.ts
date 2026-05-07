import { keymap } from '@codemirror/view'
import type { KeyBinding } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

export function buildKeymaps(onSave: () => void): Extension {
  const bindings: KeyBinding[] = [
    {
      key: 'Ctrl-s',
      mac: 'Cmd-s',
      run: () => {
        onSave()
        return true
      },
      preventDefault: true,
    },
  ]
  return keymap.of(bindings)
}
