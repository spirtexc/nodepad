# Graph View Plugin

Renders a force-directed graph of all `[[wikilink]]` connections across your vault. See how your notes relate to each other at a glance — and click any node to open that file.

Powered by [D3.js](https://d3js.org/).

---

## How it works

When you open the graph, the plugin:

1. Revads every file in the ault
2. Scans each file for `[[wikilinks]]` using the same syntax as the backlink index
3. Builds a graph where each file is a **node** and each link is an **edge**
4. Renders the graph with a D3.js force simulation — nodes repel each other, links pull connected nodes together

---

## Opening the Graph View

1. Click the **network icon** in the left dock
2. The graph builds and opens as a full-screen modal
3. A "Building graph…" message shows while reading the vault

---

## Interacting with the graph

| Action                     | Result                                                                   |
| -------------------------- | ------------------------------------------------------------------------ |
| Scroll (mouse wheel)       | Zoom in / out                                                            |
| Click + drag on background | Pan the entire graph                                                     |
| Click + drag a node        | Reposition that node (temporarily pins it)                               |
| **Click a node**           | Closes the graph and opens that file in the editor                       |
| Hover a node               | Highlights that node and all its direct neighbours; dims everything else |
| × button in header         | Close the graph without opening a file                                   |

---

## Node appearance

| Property                 | Meaning                                                         |
| ------------------------ | --------------------------------------------------------------- |
| **Node size**            | Proportional to the number of connections (larger = more links) |
| **Blue / accent colour** | The file currently open in the editor                           |
| **Highlighted on hover** | Direct neighbours of the hovered node                           |
| **Dimmed on hover**      | Nodes with no connection to the hovered node                    |

---

## Example

A vault with these files:

```
project-overview.md  ──links to──►  architecture.md
project-overview.md  ──links to──►  roadmap.md
architecture.md      ──links to──►  frontend.md
architecture.md      ──links to──►  backend.md
roadmap.md           ──links to──►  milestones.md
```

Renders as a graph where `project-overview` and `architecture` appear as larger nodes (more connections) and isolated files appear as small nodes on the periphery.

---

## Wikilink syntax

The graph recognises standard wikilink syntax:

```markdown
[[filename]]
[[filename|display text]]
```

Links to files that do not exist in the vault are ignored (no dangling nodes).

---

## Performance

The graph reads all vault files on every open. For large vaults (hundreds of files) this may take a moment — the "Building graph…" loading state will show during this time.

---

## Permissions

| Permission   | Reason                                                |
| ------------ | ----------------------------------------------------- |
| `read-files` | Reads every vault file to extract wikilinks           |
| `ui-panels`  | Adds the network icon to the dock and opens the modal |
