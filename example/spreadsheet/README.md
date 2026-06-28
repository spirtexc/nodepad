# Spreadsheet Plugin

Turns any Markdown table into an interactive editable grid. Click a cell to edit, changes are saved back as standard Markdown automatically — no proprietary format.

---

## How it works

When your cursor is **outside** a table, the plugin replaces it with a Handsontable grid. When your cursor moves **inside** the table, the raw Markdown is restored for direct editing. All changes are serialised back to standard `|` pipe-table syntax.

---

## Using the table editor

| Action | How |
|--------|-----|
| Edit a cell | Click the cell and type |
| Confirm edit | Press Enter or click away |
| Navigate cells | Press Tab / Shift+Tab |
| Add a row | Click **+ Row** in the toolbar |
| Add a column | Click **+ Col** in the toolbar |
| Delete a row | Hover the row → click **×** on the right |
| Edit as Markdown | Move cursor into the table |

---

## Entering and exiting table view

- **Table view** is shown automatically when your cursor is outside the table
- **Raw Markdown** is shown when your cursor is inside the table
- Click anywhere outside the table to return to table view

---

## Try it

Open [[spreadsheet/example|Spreadsheet example]] to see live tables you can edit.

---

## Permissions

| Permission | Reason |
|------------|--------|
| `editor` | Adds a CodeMirror extension to intercept and render Markdown tables |
