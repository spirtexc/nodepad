// Shim: re-exports @codemirror/state from the main app's shared instance.
// This ensures plugins use the same class instances as the editor,
// so instanceof checks inside CodeMirror pass correctly.
const mod = (window as any).__nodepad_cm__.state as typeof import('@codemirror/state')
export const {
  EditorState, EditorSelection, SelectionRange,
  StateField, StateEffect, StateEffectType,
  Facet, Compartment, Annotation, AnnotationType,
  RangeSetBuilder, RangeSet, RangeValue,
  Transaction, ChangeSet, ChangeDesc, MapMode,
  CharCategory, findClusterBreak, codePointAt, codePointSize, fromCodePoint,
} = mod
export type {
  Extension, TransactionSpec, EditorStateConfig,
  StateCommand, Text, Line,
} from '@codemirror/state'
