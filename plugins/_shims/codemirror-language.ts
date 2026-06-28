const mod = (window as any).__nodepad_cm__.language as typeof import('@codemirror/language')
export const {
  syntaxHighlighting, defaultHighlightStyle,
  HighlightStyle, Language, LRLanguage,
  indentUnit, indentOnInput, foldGutter,
  foldKeymap, bracketMatching,
  StreamLanguage, syntaxTree,
} = mod
export type { LezerLanguage } from '@codemirror/language'
