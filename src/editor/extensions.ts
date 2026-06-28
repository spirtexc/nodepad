import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { Compartment } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

export const themeCompartment = new Compartment()

const lightTheme = EditorView.theme({
  '&': {
    background: '#ffffff',
    color: '#222222',
  },
  '.cm-content': { caretColor: '#3575f0' },
  '.cm-cursor': { borderLeftColor: '#3575f0' },
  '.cm-activeLine': { backgroundColor: 'rgba(53,117,240,.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(53,117,240,.06)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(53,117,240,.2)' },
  '.cm-gutters': {
    background: '#f6f6f6',
    color: '#9aa0a6',
    borderRight: '1px solid #e0e0e0',
  },
  '.cm-lineNumbers .cm-gutterElement': { color: '#9aa0a6' },
  '.cm-foldPlaceholder': { background: '#e0e0e0' },
}, { dark: false })

const darkTheme = oneDark

export function getThemeExtension(isDark: boolean): Extension {
  return isDark ? darkTheme : lightTheme
}

export function buildExtensions(onChange: (content: string) => void): Extension[] {
  const isDark = document.documentElement.dataset['theme'] === 'dark'
  return [
    basicSetup,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    themeCompartment.of(getThemeExtension(isDark)),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString())
      }
    }),
  ]
}
