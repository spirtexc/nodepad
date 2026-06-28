import { spawn, spawnSync } from 'child_process'
import net from 'net'

// Compile preload.ts → preload.js (CommonJS) before launching Electron.
// Electron's sandboxed preload context cannot execute ES module imports.
console.log('[DevLauncher] Compiling preload script...')
const preloadBuild = spawnSync(
  'npx',
  ['esbuild', 'electron/preload.ts', '--bundle', '--platform=node', '--format=cjs', '--external:electron', '--outfile=electron/preload.js'],
  { shell: true, stdio: 'inherit' },
)
if (preloadBuild.status !== 0) {
  console.error('[DevLauncher] Preload compilation failed.')
  process.exit(1)
}
console.log('[DevLauncher] Preload compiled. Starting Vite...')

const vite = spawn('npx', ['vite'], { shell: true, stdio: 'inherit' })

function checkViteReady() {
  const socket = new net.Socket()
  socket.connect(5173, 'localhost', () => {
    socket.end()
    console.log('[DevLauncher] Vite dev server is ready! Launching Electron...')
    const electron = spawn('npx', ['electron', '-r', 'tsx/cjs', 'electron/main.ts'], { shell: true, stdio: 'inherit' })
    electron.on('close', () => {
      console.log('[DevLauncher] Electron window closed. Stopping Vite...')
      vite.kill()
      process.exit()
    })
  })
  socket.on('error', () => {
    setTimeout(checkViteReady, 200)
  })
}

checkViteReady()
