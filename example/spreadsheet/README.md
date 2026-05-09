# Spreadsheet Tables Plugin

Turns any Markdown table into an interactive spreadsheet — click a cell to edit, changes are saved back as Markdown automatically.

---

## How it works

Any GFM table in your file is rendered as an editable grid. The raw Markdown is preserved — no proprietary format, just standard `|` tables.

---

## Using the table editor

| Action           | How                                      | Col 3 |
| ---------------- | ---------------------------------------- | ----- |
| Edit a cell      | Click the cell and type                  |       |
| Confirm edit     | Press Enter or click away                |       |
| Navigate cells   | Press Tab / Shift+Tab                    |       |
| Add a row        | Click **+ Row** in the toolbar           |       |
| Add a column     | Click **+ Col** in the toolbar           |       |
| Delete a row     | Hover the row → click **×** on the right |       |
| Edit as Markdown | Click **Edit raw** in the toolbar        |       |

---

## Entering and exiting table view

- **Table view** is shown automatically when your cursor is outside the table
- **Raw Markdown** is shown when your cursor is inside the table, or after clicking **Edit raw**
- Move your cursor out of the table (click elsewhere) to return to table view

---

## Try it

Open [[spreadsheet/example|Spreadsheet example]] to see live tables you can edit.

---

## Permissions

| Permission | Reason |
|------------|--------|
| `editor` | Adds a CodeMirror extension to intercept and render Markdown tables |
