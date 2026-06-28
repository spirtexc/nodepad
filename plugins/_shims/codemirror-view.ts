const mod = (window as any).__nodepad_cm__.view as typeof import('@codemirror/view')
export const {
  EditorView, ViewPlugin, Decoration, DecorationSet,
  WidgetType, MatchDecorator, ViewUpdate,
  keymap, drawSelection, dropCursor, highlightActiveLine,
  highlightActiveLineGutter, highlightSpecialChars,
  lineNumbers, gutter, GutterMarker,
  tooltips, showTooltip, showPanel,
  placeholder, scrollPastEnd,
  rectangularSelection, crosshairCursor,
} = mod
export type {
  DecorationSet as DecorationSetType,
  KeyBinding, Command, PluginValue, PluginSpec,
  ViewPluginSpec, PanelConstructor, Tooltip,
} from '@codemirror/view'
