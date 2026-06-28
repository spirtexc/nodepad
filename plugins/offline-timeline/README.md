# Offline Timeline Plugin

Automatically saves a full snapshot of every file every time you save. Browse past versions, compare them with the current file, and restore any snapshot — no cloud required, everything stays on your device.

---

## How it works

Every time a file is saved (manually with `Ctrl + S` or via auto-save), the plugin writes a complete copy of the file content to **IndexedDB** (browser local storage). Up to **50 snapshots** are kept per file; older ones are dropped automatically.

Each snapshot stores:
- Full file content
- Timestamp
- A stable device ID (for future multi-device sync)

---

## Opening the Timeline

The Timeline appears as a collapsible panel at the bottom of the file tree sidebar.

1. Open any `.md` file in the editor
2. Look for the **Timeline** section at the bottom of the sidebar
3. Click the **Timeline** header to expand or collapse it

The panel automatically updates when you switch files or save.

---

## Timeline panel

The panel shows all saved snapshots for the currently open file, newest first.

| Column | Description |
|--------|-------------|
| Time | How long ago the snapshot was saved (e.g. "5m ago", "2h ago") |
| Preview | First non-empty line of the file at that point in time |

If no snapshots exist yet:
> "No snapshots yet. Save the file to create one."

---

## Comparing snapshots

**Click** any snapshot row to open a diff view comparing that snapshot against the **current file content**.

The diff modal shows:
- Added lines in green
- Removed lines in red
- Line numbers for both sides
- A **Restore** button in the header to write the snapshot back to disk

**Right-click** any row for more options:

| Option | Action |
|--------|--------|
| Compare with Current | Opens diff against the current editor content |
| Compare with Previous | Opens diff between this snapshot and the one before it |
| Restore This Version | Immediately overwrites the file with this snapshot |

---

## Restoring a snapshot

**From the diff view:**
1. Click any snapshot row to open the diff
2. Review the changes
3. Click **Restore** in the diff header

**From the context menu:**
1. Right-click any snapshot row
2. Choose **Restore This Version**
3. A confirmation dialog appears
4. Confirm — the file is overwritten immediately

Restoring creates a new snapshot of the restored content, so you can undo a restore by opening the timeline again.

---

## File rename tracking

When a file is renamed, the plugin automatically migrates all its snapshots to the new path. No history is lost.

---

## Storage limits

- **50 snapshots** per file maximum
- Stored in browser IndexedDB — private to this browser/device
- Clearing browser site data will delete all snapshots
- No export or cloud backup in this plugin

---

## Permissions

| Permission | Reason |
|------------|--------|
| `read-files` | Reads file content after save to create snapshots |
| `write-files` | Writes restored snapshot content back to disk |
| `ui-panels` | Adds the collapsible Timeline panel to the sidebar |
