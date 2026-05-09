# Markdown Plugin

The **Markdown** plugin provides live WYSIWYG formatting in the editor.
When active, Markdown syntax markers are hidden and content is styled in place.
Moving your cursor onto any line reveals the raw Markdown for editing.

## What it covers

### Basic Syntax
| Syntax | Result |
| --- | --- |
| `# Heading 1` … `###### Heading 6` | Six heading sizes |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `> blockquote` | Indented quote with accent border |
| `` `code` `` | Inline monospace code |
| `[link text](url)` | Clickable link (markers hidden) |
| `![alt](url)` | Rendered image (http URLs) |
| `---` | Horizontal rule |

### Extended Syntax
| Syntax | Result |
| --- | --- |
| `~~strikethrough~~` | Line-through text |
| `==highlight==` | Yellow highlight background |
| `~subscript~` | Subscript text |
| `^superscript^` | Superscript text |
| ` - [ ] task` | Interactive checkbox (unchecked) |
| ` - [x] task` | Interactive checkbox (checked) |
| ` ```lang ``` ` | Fenced code block (fence line dimmed) |

## Behaviour

- Formatting is applied to all lines **except** the line the cursor is on
- Moving the cursor to a formatted line reveals the raw Markdown instantly
- Toggling **Plugins OFF** in the status bar strips all formatting and shows plain text
- Disabling the Markdown plugin individually in the plugin panel has the same effect

## Files in this folder

- `example.md` — Live demo of every supported syntax element
