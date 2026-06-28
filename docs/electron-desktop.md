# Electron Desktop Shell

`electron/` at repo root: `main.ts` (main process), `preload.ts` (context bridge), `dev.ts` (dev-mode launcher). Compiled output goes to `electron/dist/` (gitignored — rebuild with the Electron build script, don't hand-edit `.js` there).

## File I/O: two parallel paths

The web app talks to `src/vault/index.ts`, which uses the browser File System Access API. In Electron, `src/vault/electron-shim.ts` intercepts and redirects to Node's `fs` via IPC, so the same `Vault` class works in both the browser and the packaged app without an `if (electron)` branch scattered through vault logic.

IPC channels (`electron/main.ts`, registered with `ipcMain.handle`):
```
fs:select-directory   fs:select-file
fs:read-directory      fs:read-file       fs:write-file
fs:exists              fs:is-directory
fs:mkdir               fs:unlink          fs:rmdir       fs:rename
```
`fs:select-directory`/`fs:select-file` open native OS dialogs via `dialog.showOpenDialog`.

## System tray

`initTray()` in `electron/main.ts` creates a `Tray` from `public/tray-icon.png`. Falls back to skipping tray init (with a console warning) if the icon asset is missing — not a hard failure.

## Build pipeline

```bash
npm run build           # tsc + vite build -> dist/
npm run electron:build  # electron-builder -> dist-desktop/Nodepad Setup <version>.exe
```

`dist/` and `dist-desktop/` are both build output, gitignored — never commit them.

## Known fixes already applied (don't re-debug these)

- **winCodeSign extraction failure** (7-Zip choking on macOS symlinks inside the cached `winCodeSign-2.6.0.7z`) — fixed by enabling Windows Developer Mode (Settings → Privacy & Security → For Developers). Not a code fix; it's a one-time machine setting.
- **`ERR_FILE_NOT_FOUND` on packaged app's CSS/JS** — packaged app loads via `file://`, and Vite's default absolute asset paths (`/assets/...`) don't resolve under `file://`. Fixed with `base: './'` in `vite.config.ts`.

## Not yet done

- Auto-updater
- Capacitor / mobile shell (Phase 6, separate from Electron)
