# Offline Timeline Plugin

Automatically saves a full snapshot of every file every time you save. Browse and restore past versions at any time — no cloud required, everything stays on your device.

---

## How it works

Every time a file is saved (manually with `Ctrl + S` or via auto-save), the plugin writes a complete copy of the file content to **IndexedDB** (browser local storage). Up to **50 snapshots** are kept per file; older ones are dropped automatically.

Snapshots are stored with:
- Full file content
- Timestamp
- A stable device ID (so you can tell which device created each snapshot if you ever sync)

---

## Opening the timeline

1. Open any `.md` file in the editor
2. Click the **clock icon** in the left dock
3. The timeline panel opens as a modal

---

## Timeline panel

The panel shows all saved snapshots for the currently open file, newest first.

| Column | Description |
|--------|-------------|
| Time | How long ago the snapshot was saved (e.g. "5m ago", "2h ago") |
| Preview | First non-empty line of the file at that point in time |
| Restore | Button to restore that version |

If no snapshots exist yet, the panel shows:
> "No snapshots yet. Save the file to create one."

---

## Restoring a snapshot

1. Find the version you want in the timeline list
2. Click **Restore**
3. A confirmation dialog appears showing the timestamp
4. Confirm — the file is immediately overwritten with the snapshot content

The restore also triggers a new snapshot, so you can undo a restore by opening the timeline again.

---

## Storage limits

- **50 snapshots** per file (configurable in source)
- Stored in browser IndexedDB — private to this browser/device
- Clearing browser site data will delete all snapshots
- There is no export or cloud backup in this plugin

---

## Permissions

| Permission | Reason |
|------------|--------|
| `read-files` | Reads file content after save to create snapshots |
| `write-files` | Writes restored snapshot content back to disk |
| `ui-panels` | Adds the clock icon to the dock and opens the modal |
