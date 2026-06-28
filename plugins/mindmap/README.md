# Mindmap Plugin

Visualises the heading structure of the active Markdown file as an interactive horizontal tree diagram. Powered by [D3.js](https://d3js.org/).

---

## How it works

The plugin reads all `#` through `######` headings from the currently open file and builds a hierarchy from them. It renders that hierarchy as a horizontal tree where:

- The **root node** is the filename
- **Level 1 headings** (`#`) are direct children of the root
- **Level 2–6 headings** nest under their parent heading
- Nodes are **colour-coded** by heading level

---

## Opening the Mindmap

1. Open any `.md` file that contains headings
2. Click the **tree icon** in the left dock
3. The mindmap opens as a full-screen modal

If the active file has no headings:
> "No headings found in this file."

---

## Navigating

| Action | Result |
|--------|--------|
| Scroll (mouse wheel) | Zoom in / out |
| Click + drag on background | Pan the view |
| × button in header | Close the modal |

The mindmap starts centred and auto-fits to the content. Scroll to zoom out if the tree is large.

---

## Node colours by heading level

| Colour | Level |
|--------|-------|
| Blue | Root (filename) |
| Purple | `#` H1 |
| Red | `##` H2 |
| Orange | `###` H3 |
| Green | `####` H4 |
| Cyan | `#####` H5 |
| Yellow | `######` H6 |

---

## Example

Given a file with this structure:

```markdown
# Introduction
## Background
## Goals

# Implementation
## Architecture
### Frontend
### Backend
## Testing

# Conclusion
```

The mindmap renders as a horizontal tree:

```
filename ── Introduction ── Background
         │              └── Goals
         ├── Implementation ── Architecture ── Frontend
         │                 │               └── Backend
         │                 └── Testing
         └── Conclusion
```

Displayed left-to-right with curved links connecting parent and child nodes.

---

## Permissions

| Permission | Reason |
|------------|--------|
| `read-files` | Reads the active file's content to extract headings |
| `ui-panels` | Adds the tree icon to the dock and opens the modal |
