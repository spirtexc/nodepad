# Offline Timeline Plugin

Automatically saves a full snapshot of every file every time you save. Browse past versions, compare them with the current file, and restore any snapshot — no cloud required.

---

## How it works

Every time a file is saved (`Ctrl + S` or auto-save), the plugin writes a complete copy of the file content to **IndexedDB**. Up to **50 snapshots** are kept per file.

---

## Opening the Timeline

The Timeline appears as a collapsible panel at the **bottom of the sidebar**.

1. Open any `.md` file
2. Look for the **Timeline** section at the bottom of the sidebar
3. Click the header to expand or collapse it

---

## Using the timeline

| Action | Result |
|--------|--------|
| Click a snapshot row | Opens diff view comparing that snapshot to the current file |
| Right-click → Compare with Current | Opens diff view |
| Right-click → Compare with Previous | Diffs two snapshots against each other |
| Right-click → Restore This Version | Overwrites the file with that snapshot |
| Restore button in diff view | Writes the snapshot back to disk |

---

## Try it

1. Open [[timeline/example|Timeline example]]
2. Make some edits and save (`Ctrl + S`) a few times
3. Open the Timeline panel in the sidebar
4. Click any snapshot to compare it with the current version
5. Try restoring an older version

---

## Permissions

| Permission | Reason |
|------------|--------|
| `read-files` | Reads file content after save to create snapshots |
| `write-files` | Writes restored snapshot content back to disk |
| `ui-panels` | Adds the collapsible Timeline panel to the sidebar |
