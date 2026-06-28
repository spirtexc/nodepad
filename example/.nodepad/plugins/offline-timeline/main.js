// plugins/offline-timeline/ui/timeline-panel.ts
function formatTimestamp(ts) {
  const diff = Date.now() - ts;
  if (diff < 6e4) return "Just now";
  if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
  return new Date(ts).toLocaleString(void 0, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function showRowMenu(x, y, items) {
  document.querySelector(".timeline-ctx-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "timeline-ctx-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  for (const item of items) {
    const btn = document.createElement("button");
    btn.textContent = item.label;
    btn.addEventListener("click", () => {
      menu.remove();
      item.action();
    });
    menu.appendChild(btn);
  }
  document.body.appendChild(menu);
  setTimeout(() => {
    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("mousedown", close);
      }
    };
    document.addEventListener("mousedown", close);
  }, 0);
}
function buildTimelinePanel(fileId, snapshots, cbs) {
  const filename = fileId.split("/").pop() ?? fileId;
  const wrap = document.createElement("div");
  wrap.className = "timeline-list";
  if (snapshots.length === 0) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No snapshots yet. Save the file to create one.";
    wrap.appendChild(empty);
    return wrap;
  }
  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    const prev = snapshots[i + 1];
    const row = document.createElement("div");
    row.className = "timeline-row";
    row.title = new Date(snap.timestamp).toLocaleString();
    const icon = document.createElement("span");
    icon.className = "timeline-row-icon";
    icon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const meta = document.createElement("div");
    meta.className = "timeline-meta";
    const time = document.createElement("span");
    time.className = "timeline-time";
    time.textContent = formatTimestamp(snap.timestamp);
    const preview = document.createElement("span");
    preview.className = "timeline-preview";
    const firstLine = snap.content.split("\n").find((l) => l.trim()) ?? "(empty)";
    preview.textContent = firstLine.length > 50 ? firstLine.slice(0, 48) + "\u2026" : firstLine;
    meta.appendChild(time);
    meta.appendChild(preview);
    row.appendChild(icon);
    row.appendChild(meta);
    wrap.appendChild(row);
    const compareWithCurrent = () => void cbs.getCurrentContent().then((current) => {
      cbs.onCompare(
        snap.content,
        formatTimestamp(snap.timestamp),
        current,
        filename + " (current)",
        () => cbs.onRestore(snap)
      );
    });
    row.addEventListener("click", compareWithCurrent);
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menuItems = [
        { label: "Compare with Current", action: compareWithCurrent }
      ];
      if (prev) {
        menuItems.push({
          label: "Compare with Previous",
          action: () => {
            cbs.onCompare(
              prev.content,
              formatTimestamp(prev.timestamp),
              snap.content,
              formatTimestamp(snap.timestamp)
            );
          }
        });
      }
      menuItems.push({
        label: "Restore This Version",
        action: () => cbs.onRestore(snap)
      });
      showRowMenu(e.clientX, e.clientY, menuItems);
    });
  }
  return wrap;
}

// plugins/offline-timeline/index.ts
var MAX_SNAPSHOTS = 50;
function safeKey(fileId) {
  return `timeline/${fileId.replace(/[/\\:*?"<>|]/g, "_")}.json`;
}
async function loadSnapshots(fileId, app) {
  try {
    const text = await app.readConfig(safeKey(fileId));
    return text ? JSON.parse(text) : [];
  } catch {
    return [];
  }
}
async function saveSnapshot(fileId, snapshot, app) {
  const existing = await loadSnapshots(fileId, app);
  const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
  await app.writeConfig(safeKey(fileId), JSON.stringify(updated));
}
var styleEl = null;
var unsubs = [];
var STYLES = `
.timeline-list {
  display: flex;
  flex-direction: column;
}
.timeline-empty {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
.timeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background .1s;
}
.timeline-row:hover {
  background: var(--b3-theme-primary-lightest);
  border-left-color: var(--accent);
}
.timeline-row-icon {
  flex-shrink: 0;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}
.timeline-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.timeline-time {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}
.timeline-preview {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.timeline-ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,.18);
  padding: 4px;
  min-width: 190px;
}
.timeline-ctx-menu button {
  display: block;
  width: 100%;
  padding: 6px 12px;
  background: none;
  border: none;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  font-family: inherit;
}
.timeline-ctx-menu button:hover { background: var(--bg-secondary); }
`;
var plugin = {
  id: "offline-timeline",
  name: "Offline Timeline",
  version: "1.0.0",
  permissions: ["read-files", "write-files", "ui-panels"],
  onLoad(app) {
    unsubs = [];
    styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
    let currentFileId = null;
    let panelBody = null;
    const refreshPanel = async () => {
      if (!panelBody || !currentFileId) return;
      const fileId = currentFileId;
      const snapshots = await loadSnapshots(fileId, app);
      const cbs = {
        onRestore: async (snap) => {
          const dateStr = new Date(snap.timestamp).toLocaleString();
          if (!confirm(`Restore snapshot from ${dateStr}?

This will overwrite the current file content.`)) return;
          try {
            await app.writeFile(fileId, snap.content);
            void refreshPanel();
          } catch (err) {
            console.error("[offline-timeline] Restore failed:", err);
            alert("Restore failed. See console for details.");
          }
        },
        onCompare: (contentA, labelA, contentB, labelB, onRestoreA) => {
          app.openDiff(labelA, contentA, labelB, contentB, onRestoreA);
        },
        getCurrentContent: () => app.readFile(fileId)
      };
      panelBody.innerHTML = "";
      panelBody.appendChild(buildTimelinePanel(fileId, snapshots, cbs));
    };
    unsubs.push(
      app.addSidebarPanel("offline-timeline", "Timeline", (body) => {
        panelBody = body;
        void refreshPanel();
      })
    );
    unsubs.push(
      app.onFileOpen((file) => {
        currentFileId = file.path;
        void refreshPanel();
      })
    );
    unsubs.push(
      app.onFileRename(async (oldPath, newPath) => {
        const snapshots = await loadSnapshots(oldPath, app);
        if (snapshots.length > 0) {
          await app.writeConfig(safeKey(newPath), JSON.stringify(snapshots.map((s) => ({ ...s, fileId: newPath }))));
          await app.writeConfig(safeKey(oldPath), JSON.stringify([]));
        }
        if (currentFileId === oldPath) {
          currentFileId = newPath;
          void refreshPanel();
        }
      })
    );
    unsubs.push(
      app.onFileSave(async (file) => {
        try {
          const content = await app.readFile(file.path);
          const snapshot = {
            id: crypto.randomUUID(),
            fileId: file.path,
            content,
            timestamp: Date.now(),
            deviceId: crypto.randomUUID()
          };
          await saveSnapshot(file.path, snapshot, app);
          void refreshPanel();
        } catch (err) {
          console.error("[offline-timeline] Failed to save snapshot:", err);
        }
      })
    );
  },
  onUnload() {
    unsubs.forEach((u) => u());
    unsubs = [];
    styleEl?.remove();
    styleEl = null;
  }
};
var offline_timeline_default = plugin;
export {
  offline_timeline_default as default
};
