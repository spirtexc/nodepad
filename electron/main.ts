import { app, BrowserWindow, dialog, ipcMain, Menu, screen, Tray } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import chokidar from 'chokidar'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const detachedWindows: Map<string, BrowserWindow> = new Map()
let watcher: chokidar.FSWatcher | null = null
let currentVaultPath: string | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const preloadPath = path.join(__dirname, 'preload.js')

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Nodepad',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    // Close all detached windows too
    for (const win of detachedWindows.values()) {
      win.close()
    }
    detachedWindows.clear()
  })
}

// Watch folder for real-time synchronization
function watchVault(vaultPath: string) {
  if (watcher) {
    watcher.close()
  }
  currentVaultPath = vaultPath
  console.log(`[Main] Starting watcher for vault: ${vaultPath}`)

  watcher = chokidar.watch(vaultPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  })

  const notifyChange = (filePath: string) => {
    // Normalize path to forward slashes for renderer consistency
    const normalized = filePath.replace(/\\/g, '/')
    const relative = currentVaultPath
      ? normalized.replace(currentVaultPath.replace(/\\/g, '/') + '/', '')
      : normalized

    console.log(`[Watcher] File changed: ${relative}`)

    if (mainWindow) {
      mainWindow.webContents.send('fs:file-updated', relative)
    }
    for (const win of detachedWindows.values()) {
      win.webContents.send('fs:file-updated', relative)
    }
  }

  watcher.on('add', notifyChange)
  watcher.on('change', notifyChange)
  watcher.on('unlink', notifyChange)
}

function createDetachedWindow(filePath: string, fileName: string, x?: number, y?: number) {
  if (detachedWindows.has(filePath)) {
    detachedWindows.get(filePath)?.focus()
    return
  }

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    ...(x !== undefined && y !== undefined ? { x, y } : {}),
    title: `${fileName} - Nodepad`,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const queryParams = `?mode=detached&path=${encodeURIComponent(filePath)}&name=${encodeURIComponent(fileName)}`

  if (isDev) {
    win.loadURL(`http://localhost:5173/${queryParams}`)
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), {
      query: { mode: 'detached', path: filePath, name: fileName },
    })
  }

  win.on('closed', () => {
    detachedWindows.delete(filePath)
  })

  detachedWindows.set(filePath, win)
}

function initTray() {
  // Dev: icon lives in public/. Prod: Vite copies public/ → dist/, use app.getAppPath().
  const iconPath = isDev
    ? path.join(__dirname, '..', 'public', 'tray-icon.png')
    : path.join(app.getAppPath(), 'dist', 'tray-icon.png')

  try {
    if (!fs.existsSync(iconPath)) {
      console.warn('[Main] Tray icon not found at', iconPath)
      return
    }
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Nodepad',
        click: () => {
          if (mainWindow) {
            mainWindow.focus()
          } else {
            createMainWindow()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        },
      },
    ])
    tray.setToolTip('Nodepad')
    tray.setContextMenu(contextMenu)
  } catch (err) {
    console.warn('[Main] System Tray initialization deferred or skipped: icon asset not found.', err)
  }
}

app.whenReady().then(() => {
  createMainWindow()
  initTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC FS Handlers
ipcMain.handle('fs:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const folderPath = result.filePaths[0]
  const name = path.basename(folderPath)

  // Start watching this folder immediately
  watchVault(folderPath)

  return { name, path: folderPath }
})

ipcMain.handle('fs:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown / Text', extensions: ['md', 'txt'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const name = path.basename(filePath)
  return { name, path: filePath }
})

ipcMain.handle('fs:read-directory', async (_, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }))
  } catch (err: any) {
    if (err.code === 'ENOENT') return []
    throw err
  }
})

ipcMain.handle('fs:read-file', async (_, filePath: string) => {
  return fs.promises.readFile(filePath, 'utf-8')
})

ipcMain.handle('fs:write-file', async (_, filePath: string, content: string) => {
  // Ensure the parent directory exists first
  const parent = path.dirname(filePath)
  if (!fs.existsSync(parent)) {
    await fs.promises.mkdir(parent, { recursive: true })
  }
  return fs.promises.writeFile(filePath, content, 'utf-8')
})

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  return fs.promises.access(filePath)
    .then(() => true)
    .catch(() => false)
})

ipcMain.handle('fs:is-directory', async (_, itemPath: string) => {
  const stat = await fs.promises.stat(itemPath)
  return stat.isDirectory()
})

ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
  return fs.promises.mkdir(dirPath, { recursive: true })
})

ipcMain.handle('fs:unlink', async (_, filePath: string) => {
  return fs.promises.unlink(filePath)
})

ipcMain.handle('fs:rmdir', async (_, dirPath: string, recursive: boolean) => {
  return fs.promises.rm(dirPath, { recursive, force: true })
})

ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
  return fs.promises.rename(oldPath, newPath)
})

// Detached window IPC
ipcMain.on('window:open-detached', (_, filePath: string, fileName: string) => {
  createDetachedWindow(filePath, fileName)
})

ipcMain.on('window:open-detached-at-cursor', (_, filePath: string, fileName: string) => {
  const { x, y } = screen.getCursorScreenPoint()
  createDetachedWindow(filePath, fileName, x, y)
})

ipcMain.on('window:redock-tab', (event, filePath: string, fileName: string) => {
  if (mainWindow) {
    mainWindow.webContents.send('tab:redock', filePath, fileName)
    mainWindow.focus()
  }
  BrowserWindow.fromWebContents(event.sender)?.close()
})

ipcMain.on('window:close-detached', (_, filePath: string) => {
  detachedWindows.get(filePath)?.close()
})

ipcMain.handle('fs:watch-directory', async (_, dirPath: string) => {
  watchVault(dirPath)
  return true
})
