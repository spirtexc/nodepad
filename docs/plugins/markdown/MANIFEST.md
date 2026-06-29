# Markdown Plugin — MANIFEST

Per-plugin map. Read this before touching Markdown code.

## What it does
Live WYSIWYG rendering of Markdown syntax in the editor. Hides raw Markdown
tokens (`**bold**`, `` `code` ``, `~~strike~~`) and shows formatted text inline,
while the underlying document remains valid Markdown. Also renders code blocks
and `[[wikilinks]]` as clickable decorated spans.

## Key files
| File | Role |
|---|---|
| `plugins/markdown/index.ts` | Plugin entry — registers the editor extension bundle |
| `src/editor/markdown.ts` | Inline bold/italic/code/strike rendering |
| `src/editor/codeblock.ts` | Code block decorations |
| `src/editor/wikilinks.ts` | `[[wikilink]]` decorations (core feature shared with graph-view) |

## Architecture
- **Permissions**: `editor`
- **Entry point**: `makeMarkdownPlugin()` → exported as default
- **Core coupling**: imports directly from `src/editor/` (markdown, codeblock, wikilinks). These are core modules the plugin hosts — this is the intended architecture, not a back door.
- **API used**: `app.addEditorExtension([markdownWYSIWYG, codeBlockWidgets, wikilinkDecorations, wikilinkTheme])`
- **State**: shares the CodeMirror compartment with other editor plugins via independent StateFields; StateField names are local to each extension module.
- **Styling**: CSS via `wikilinkTheme` (CodeMirror theme) + inline editor theme extensions.

## Status
- Shipped — loads with the editor, no configuration.
