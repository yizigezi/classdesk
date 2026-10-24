// —— classdesk 主进程：窗口 / 壁纸 / 应用仓库 / 可移动存储 ——
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { cp, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AppManifest, DriveInfo, InstallResult, InstalledApp } from '../shared/types'

const execFileAsync = promisify(execFile)

const BING_ARCHIVE = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN'

interface BingArchive {
  images?: Array<{ urlbase?: string }>
}

let wallpaperCache: { day: string; url: string | null } | null = null

async function fetchWallpaperUrl(): Promise<string | null> {
  const day = new Date().toISOString().slice(0, 10)
  if (wallpaperCache?.day === day) return wallpaperCache.url

  let url: string | null = null
  try {
    const res = await fetch(BING_ARCHIVE)
    if (res.ok) {
      const data = (await res.json()) as BingArchive
      const urlbase = data.images?.[0]?.urlbase
      if (urlbase) url = `https://www.bing.com${urlbase}_1920x1080.jpg`
    }
  } catch {
    url = null
  }

  wallpaperCache = { day, url }
  return url
}

// ─────────────────────────── 应用仓库 ───────────────────────────
// 应用存储位置 = 应用根目录下的 apps/（打包版 = 程序所在目录，开发版 = 项目根目录），
// 启动时扫描加载；安装 = 拷贝应用包进 apps/<id>/，卸载 = 移入回收站。
// 权限系统暂未启用（渲染层 platform/permissions.ts 预留接口），manifest 里的
// permissions 字段照常读取、透传给渲染层。

const APP_ID_RE = /^[a-z0-9][a-z0-9_-]*$/i
/** 保留 id：壳层自己用，外部应用不得占用。 */
const RESERVED_APP_IDS = new Set(['launcher', 'pptx'])

function appRoot(): string {
  if (process.env.CLASSDESK_APPS_DIR) return resolve(process.env.CLASSDESK_APPS_DIR)
  // 打包版（portable）以 exe 所在目录为应用根目录；开发版用项目根目录
  return app.isPackaged ? dirname(process.execPath) : app.getAppPath()
}

let appsDirCache: string | null = null

function ensureAppsDir(): string {
  if (appsDirCache) return appsDirCache
  const primary = join(appRoot(), 'apps')
  try {
    mkdirSync(primary, { recursive: true })
    appsDirCache = primary
  } catch {
    // 根目录不可写（如装在 Program Files）时退回用户数据目录
    const fallback = join(app.getPath('userData'), 'apps')
    mkdirSync(fallback, { recursive: true })
    appsDirCache = fallback
  }
  return appsDirCache
}

function readManifest(dir: string): AppManifest | null {
  try {
    const raw = readFileSync(join(dir, 'manifest.json'), 'utf8')
    const data = JSON.parse(raw) as AppManifest
    if (!data || typeof data.id !== 'string' || typeof data.name !== 'string') return null
    return data
  } catch {
    return null
  }
}

function toInstalledApp(dir: string, manifest: AppManifest): InstalledApp {
  return {
    ...manifest,
    id: manifest.id,
    name: manifest.name,
    version: manifest.version ?? '0.0.0',
    icon: manifest.icon ?? 'apps',
    entry: manifest.entry ?? 'index.html',
    description: manifest.description ?? '',
    permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
    dir,
    removable: true
  }
}

function scanApps(): InstalledApp[] {
  const base = ensureAppsDir()
  const out: InstalledApp[] = []
  for (const name of readdirSync(base)) {
    if (!APP_ID_RE.test(name)) continue
    const dir = join(base, name)
    try {
      if (!statSync(dir).isDirectory()) continue
    } catch {
      continue
    }
    const manifest = readManifest(dir)
    if (!manifest || manifest.id !== name) continue
    out.push(toInstalledApp(dir, manifest))
  }
  out.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return out
}

function assertSafeAppId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !APP_ID_RE.test(id)) throw new Error(`非法应用 id：${String(id)}`)
}

async function installAppFromDir(src: string): Promise<InstalledApp> {
  const manifest = readManifest(src)
  if (!manifest) throw new Error('所选文件夹里没有有效的 manifest.json')
  assertSafeAppId(manifest.id)
  if (RESERVED_APP_IDS.has(manifest.id)) throw new Error(`id「${manifest.id}」是系统保留的，换一个`)
  const target = join(ensureAppsDir(), manifest.id)
  if (existsSync(target)) throw new Error(`应用「${manifest.name}」已安装（${manifest.id}）`)
  await cp(src, target, { recursive: true })
  const installed = readManifest(target)
  if (!installed) throw new Error('安装后校验失败：manifest.json 缺失')
  return toInstalledApp(target, installed)
}

async function uninstallApp(id: string): Promise<void> {
  assertSafeAppId(id)
  const dir = join(ensureAppsDir(), id)
  if (!existsSync(dir)) throw new Error('应用不存在')
  await stat(dir) // 确认是目录
  await shell.trashItem(dir) // 进回收站，可恢复
}

// ─────────────────────────── 可移动存储 ───────────────────────────

/** 开发/截图用假磁盘：CLASSDESK_FAKE_DRIVES="U盘|/media/fake-usb;SD卡|/media/fake-sd" */
function fakeDrives(): DriveInfo[] {
  const raw = process.env.CLASSDESK_FAKE_DRIVES
  if (!raw) return []
  return raw
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, path] = item.split('|').map((s) => s.trim())
      return { id: path || label, label: label || path, path: path || label }
    })
    .filter((d) => d.label)
}

async function windowsDrives(): Promise<DriveInfo[]> {
  const ps =
    'Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | ' +
    'Select-Object DeviceID,VolumeName | ConvertTo-Json -Compress'
  const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', ps], {
    windowsHide: true
  })
  const text = stdout.trim()
  if (!text) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => {
      const root = String(r.DeviceID ?? '')
      const name = String(r.VolumeName ?? '').trim()
      return {
        id: root,
        label: name || root,
        path: root.endsWith('\\') ? root : `${root}\\`
      }
    })
    .filter((d) => d.id)
}

async function linuxDrives(): Promise<DriveInfo[]> {
  const { stdout } = await execFileAsync('lsblk', [
    '-J',
    '-o',
    'NAME,LABEL,MOUNTPOINT,RM,TYPE'
  ])
  interface LsblkNode {
    name?: string
    label?: string
    mountpoint?: string | null
    rm?: string | number
    type?: string
    children?: LsblkNode[]
  }
  const data = JSON.parse(stdout) as { blockdevices?: LsblkNode[] }
  const out: DriveInfo[] = []
  const walk = (nodes: LsblkNode[]): void => {
    for (const n of nodes) {
      if (n.children) walk(n.children)
      const removable = n.rm === 1 || n.rm === '1'
      if (!removable || !n.mountpoint) continue
      out.push({ id: n.mountpoint, label: n.label || n.name || n.mountpoint, path: n.mountpoint })
    }
  }
  walk(data.blockdevices ?? [])
  return out
}

async function listRemovableDrives(): Promise<DriveInfo[]> {
  const fake = fakeDrives()
  if (fake.length) return fake
  try {
    if (process.platform === 'win32') return await windowsDrives()
    if (process.platform === 'linux') return await linuxDrives()
  } catch {
    // 枚举失败按无设备处理，不打断界面
  }
  return []
}

// ─────────────────────────── 应用包协议 ───────────────────────────
// classdesk-app://<appId>/<相对路径> → apps/<appId>/ 下的静态文件（iframe 应用沙箱）
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'classdesk-app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
  }
])

function registerAppProtocol(): void {
  protocol.handle('classdesk-app', async (request) => {
    let url: URL
    try {
      url = new URL(request.url)
    } catch {
      return new Response('bad request', { status: 400 })
    }
    const appId = decodeURIComponent(url.hostname)
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
    if (!APP_ID_RE.test(appId)) return new Response('forbidden', { status: 403 })

    const base = resolve(join(ensureAppsDir(), appId))
    const file = resolve(join(base, rel))
    if (file !== base && !file.startsWith(base + sep)) return new Response('forbidden', { status: 403 })
    if (!existsSync(file) || !statSync(file).isFile()) return new Response('not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })
}

// ─────────────────────────── 窗口 ───────────────────────────

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    frame: false,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#eef0f4',
    title: '课堂桌面',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ─────────────────────────── IPC ───────────────────────────

ipcMain.handle('wallpaper:today', () => fetchWallpaperUrl())

ipcMain.handle('apps:list', () => scanApps())

ipcMain.handle('apps:install', async (): Promise<InstallResult> => {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const options: Electron.OpenDialogOptions = {
    title: '选择应用文件夹',
    buttonLabel: '安装',
    properties: ['openDirectory']
  }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return { canceled: true, apps: scanApps() }
  try {
    const installed = await installAppFromDir(result.filePaths[0])
    return { canceled: false, apps: scanApps(), installed }
  } catch (err) {
    return { canceled: false, apps: scanApps(), error: (err as Error).message }
  }
})

ipcMain.handle('apps:uninstall', async (_e, id: string) => {
  await uninstallApp(id)
  return scanApps()
})

ipcMain.handle('drives:list', () => listRemovableDrives())

ipcMain.handle('drives:open', async (_e, path: string) => {
  if (typeof path !== 'string' || !path) return '路径为空'
  return shell.openPath(path) // 返回错误信息，空串 = 成功
})

app.whenReady().then(() => {
  ensureAppsDir()
  registerAppProtocol()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
