# Timeline Plugin — Try It Yourself

Follow these steps to test the Timeline plugin:

---

## Step 1 — Save this file

Press `Ctrl + S` to save. This creates the **first snapshot** in the Timeline panel on the left sidebar.

---

## Step 2 — Make a change and save again

Edit something below, then press `Ctrl + S` again:

> **Edit me:** Replace this line with anything you like, then save.

---

## Step 3 — Open the Timeline

Look at the bottom of the sidebar. You should see a **Timeline** section. Click it to expand — your snapshots appear here, newest first.

---

## Step 4 — Compare versions

Click any snapshot row to open a **diff view** showing exactly what changed between that version and the current file. Added lines are green, removed lines are red.

---

## Step 5 — Restore a version

In the diff view, click the **Restore** button to write that snapshot back to the file. Or right-click a snapshot row and choose **Restore This Version**.

After restoring, check the timeline again — a new snapshot is automatically created of the restored content, so you can always undo a restore.

---

## Notes

- Snapshots are stored in your browser's IndexedDB
- Clearing browser site data will delete all snapshots
- Up to 50 snapshots are kept per file
