// —— classdesk 主进程：窗口 / 壁纸 / 应用仓库 / 设置库 / 可移动存储 ——
import { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } from 'electron'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { copyFile, cp, mkdir, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, extname, join, resolve } from 'node:path'
import {
  APP_ID_RE,
  assertSafeAppId,
  openAppPackage,
  type AppPackageReader
} from './appkg'
import {
  openSettings,
  settingsDelete,
  settingsGet,
  settingsList,
  settingsSet,
  type SettingValue
} from './settings'
import type {
  AppManifest,
  CreateWebResult,
  DriveInfo,
  InstallResult,
  InstalledApp
} from '../shared/types'

const execFileAsync = promisify(execFile)

// ─────────────────────────── 壁纸 ───────────────────────────

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
// 应用包两种形态：文件夹包（开发用）和 .cdapp（asar 归档包，发布用）。
// 存储位置：应用根目录 apps/（用户安装，可装卸）；随程序分发的内置应用在
// resources/apps-system（打包版）或 dist-apps（开发版），不可卸载。
// 启动时扫描加载；权限系统暂未启用（渲染层 platform/permissions.ts 预留接口）。

function appRoot(): string {
  if (process.env.CLASSDESK_APPS_DIR) return resolve(process.env.CLASSDESK_APPS_DIR)
  return app.isPackaged ? dirname(process.execPath) : app.getAppPath()
}

function systemAppsDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'apps-system')
    : join(app.getAppPath(), 'dist-apps')
}

let userAppsDirCache: string | null = null

function userAppsDir(): string {
  if (userAppsDirCache) return userAppsDirCache
  const primary = join(appRoot(), 'apps')
  try {
    mkdirSync(primary, { recursive: true })
    userAppsDirCache = primary
  } catch {
    // 根目录不可写（如装在 Program Files）时退回用户数据目录
    const fallback = join(app.getPath('userData'), 'apps')
    mkdirSync(fallback, { recursive: true })
    userAppsDirCache = fallback
  }
  return userAppsDirCache
}

function toInstalledApp(
  pkgPath: string,
  kind: 'dir' | 'cdapp',
  manifest: AppManifest,
  source: 'system' | 'user'
): InstalledApp {
  return {
    ...manifest,
    id: manifest.id,
    name: manifest.name,
    version: manifest.version ?? '0.0.0',
    icon: manifest.icon ?? 'apps',
    entry: manifest.entry ?? 'index.html',
    description: manifest.description ?? '',
    permissions: Array.isArray(manifest.permissions) ? manifest.permissions : [],
    type: manifest.type === 'web' ? 'web' : 'app',
    url: manifest.url ?? '',
    pkgPath,
    kind,
    source,
    removable: source === 'user'
  }
}

interface ScannedPackage {
  id: string
  pkgPath: string
  kind: 'dir' | 'cdapp'
  reader: AppPackageReader
}

/** 扫一个目录下的 <id>/ 和 <id>.cdapp */
function scanDir(dir: string): ScannedPackage[] {
  const out: ScannedPackage[] = []
  let names: string[] = []
  try {
    names = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of names) {
    const full = join(dir, name)
    const isCdapp = name.endsWith('.cdapp')
    const id = isCdapp ? name.slice(0, -'.cdapp'.length) : name
    if (!APP_ID_RE.test(id)) continue
    try {
      const st = statSync(full)
      if (isCdapp ? !st.isFile() : !st.isDirectory()) continue
    } catch {
      continue
    }
    const reader = openAppPackage(full)
    if (!reader || reader.manifest.id !== id) continue
    out.push({ id, pkgPath: full, kind: reader.kind, reader })
  }
  return out
}

function canLoadUnpackedFolders(): boolean {
  return settingsGet('system', 'developerOptions') === true &&
    settingsGet('system', 'loadUnpackedFolders') === true
}

function scanApps(): InstalledApp[] {
  const out: InstalledApp[] = []
  for (const pkg of scanDir(systemAppsDir())) {
    out.push(toInstalledApp(pkg.pkgPath, pkg.kind, pkg.reader.manifest, 'system'))
  }
  for (const pkg of scanDir(userAppsDir())) {
    // 关闭开发者选项后，用户安装的未打包目录不会被加载；.cdapp 不受影响。
    if (pkg.kind === 'dir' && !canLoadUnpackedFolders()) continue
    out.push(toInstalledApp(pkg.pkgPath, pkg.kind, pkg.reader.manifest, 'user'))
  }
  out.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return out
}

function findUserPackage(id: string, includeDisabledFolders = false): ScannedPackage | null {
  const pkg = scanDir(userAppsDir()).find((p) => p.id === id) ?? null
  if (pkg?.kind === 'dir' && !includeDisabledFolders && !canLoadUnpackedFolders()) return null
  return pkg
}

async function installFromPath(src: string): Promise<InstalledApp> {
  const isCdapp = src.endsWith('.cdapp')
  if (
    !isCdapp &&
    !(settingsGet('system', 'developerOptions') === true &&
      settingsGet('system', 'loadUnpackedFolders') === true)
  ) {
    throw new Error('未打包文件夹加载已关闭。请先在「设置 → 开发者选项」中启用。')
  }
  const reader = openAppPackage(src)
  if (!reader) {
    throw new Error(isCdapp ? '不是有效的 .cdapp 应用包' : '所选文件夹里没有有效的 manifest.json')
  }
  assertSafeAppId(reader.manifest.id)
  const id = reader.manifest.id
  const target = join(userAppsDir(), isCdapp ? `${id}.cdapp` : id)
  if (existsSync(target)) throw new Error(`应用「${reader.manifest.name}」已安装（${id}）`)

  if (isCdapp) await copyFile(src, target)
  else await cp(src, target, { recursive: true })

  const installed = openAppPackage(target)
  if (!installed) throw new Error('安装后校验失败：manifest.json 缺失')
  return toInstalledApp(target, installed.kind, installed.manifest, 'user')
}

async function uninstallApp(id: string): Promise<void> {
  assertSafeAppId(id)
  const pkg = findUserPackage(id, true)
  if (!pkg) throw new Error('应用不存在或为内置应用')
  await stat(pkg.pkgPath)
  await shell.trashItem(pkg.pkgPath) // 进回收站，可恢复
}

// ─────────────────────────── 网页应用 ───────────────────────────

const ICON_EXT_RE = /\.(png|jpe?g|webp|gif|svg|ico)$/i

interface FetchedIcon {
  ext: string
  data: Buffer
}

async function fetchBinary(url: string): Promise<{ data: Buffer; type: string } | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'follow' })
  if (!res.ok) return null
  const type = res.headers.get('content-type') ?? ''
  const data = Buffer.from(await res.arrayBuffer())
  return { data, type }
}

/** 抓网页图标：先 favicon.ico，再页面里的 link[rel=icon/apple-touch-icon] */
async function fetchWebIcon(pageUrl: string): Promise<FetchedIcon | null> {
  const origin = new URL(pageUrl).origin
  try {
    const ico = await fetchBinary(`${origin}/favicon.ico`)
    if (ico && ico.type.startsWith('image/') && ico.data.length > 0) {
      return { ext: 'ico', data: ico.data }
    }
  } catch {
    // 继续走 link[rel=icon]
  }

  try {
    const pageRes = await fetch(pageUrl, { signal: AbortSignal.timeout(8000), redirect: 'follow' })
    if (pageRes.ok) {
      const html = (await pageRes.text()).slice(0, 512 * 1024)
      const links = [...html.matchAll(/<link\b[^>]*rel=["'](?:apple-touch-icon|shortcut icon|icon)["'][^>]*>/gi)]
        .map((m) => m[0])
        .reverse()
      for (const tag of links) {
        const href = /href=["']([^"']+)["']/i.exec(tag)?.[1]
        if (!href) continue
        const iconUrl = new URL(href, pageUrl).toString()
        if (!ICON_EXT_RE.test(new URL(iconUrl).pathname) && !/format=(png|ico|svg)/i.test(iconUrl)) {
          // 没有扩展名也试试（很多站点图标地址不带后缀）
        }
        try {
          const icon = await fetchBinary(iconUrl)
          if (icon && icon.type.startsWith('image/') && icon.data.length > 0) {
            const ext =
              ICON_EXT_RE.exec(new URL(iconUrl).pathname)?.[1]?.toLowerCase() ??
              (icon.type.includes('svg') ? 'svg' : icon.type.includes('webp') ? 'webp' : 'png')
            return { ext: ext === 'jpeg' ? 'jpg' : ext, data: icon.data }
          }
        } catch {
          // 换下一个候选
        }
      }
    }
  } catch {
    // 抓不到图标就用默认图标
  }
  return null
}

function webAppId(url: string): string {
  const host = new URL(url).hostname.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  const slug = host.replace(/-/g, '') || 'page'
  const base = `cn.yizigezi.web-${slug}`.slice(0, 64)
  if (!existsSync(join(userAppsDir(), base)) && !existsSync(join(userAppsDir(), `${base}.cdapp`))) {
    return base
  }
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!existsSync(join(userAppsDir(), candidate))) return candidate
  }
  return `${base}-${Date.now()}`
}

async function createWebApp(name: string, url: string): Promise<InstalledApp> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('名称不能为空')
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    throw new Error('网址不对，要以 http:// 或 https:// 开头')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('网址只支持 http/https')
  }

  const id = webAppId(parsed.toString())
  const dir = join(userAppsDir(), id)
  await mkdir(dir, { recursive: true })

  const icon = await fetchWebIcon(parsed.toString())
  const manifest: AppManifest = {
    id,
    name: trimmedName,
    version: '1.0.0',
    icon: icon ? `icon.${icon.ext}` : 'apps',
    type: 'web',
    url: parsed.toString(),
    description: parsed.hostname,
    author: 'user',
    permissions: ['net']
  }
  if (icon) writeFileSync(join(dir, `icon.${icon.ext}`), icon.data)
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  const installed = openAppPackage(dir)
  if (!installed) throw new Error('创建失败：manifest.json 缺失')
  return toInstalledApp(dir, 'dir', installed.manifest, 'user')
}

// ─────────────────────────── 应用包协议 ───────────────────────────
// classdesk-app://<appId>/<相对路径> → 应用包内静态文件（iframe 应用沙箱）；
// 文件夹包和 .cdapp 都支持，带目录穿越防护。
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'classdesk-app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
  }
])

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
  map: 'application/json; charset=utf-8'
}

function registerAppProtocol(): void {
  protocol.handle('classdesk-app', async (request) => {
    let url: URL
    try {
      url = new URL(request.url)
    } catch {
      return new Response('bad request', { status: 400 })
    }
    const appId = decodeURIComponent(url.hostname).toLowerCase()
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
    if (!APP_ID_RE.test(appId)) return new Response('forbidden', { status: 403 })
    if (rel.split('/').some((seg) => seg === '..')) return new Response('forbidden', { status: 403 })

    // 用户安装的优先于内置的
    const pkg =
      findUserPackage(appId) ??
      scanDir(systemAppsDir()).find((p) => p.id === appId) ??
      null
    if (!pkg) return new Response('not found', { status: 404 })

    const data = pkg.reader.read(rel)
    if (!data) return new Response('not found', { status: 404 })
    const type = CONTENT_TYPES[extname(rel).slice(1).toLowerCase()] ?? 'application/octet-stream'
    return new Response(data, { headers: { 'content-type': type } })
  })
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
  // 卷标可能是中文：卷标一律 Base64 回传，绕开 PowerShell 控制台编码坑；
  // 可移动磁盘（DriveType=2）和 USB 接口磁盘（U 盘/移动硬盘）都算
  const script = [
    '$map = @{}',
    'Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | ForEach-Object { $map[[string]$_.DeviceID] = [string]$_.VolumeName }',
    'Get-Disk | Where-Object { $_.BusType -eq "USB" } | ForEach-Object { Get-Partition -DiskNumber $_.Number } | Where-Object { $_.DriveLetter } | ForEach-Object {',
    '  $id = [string]$_.DriveLetter + ":"',
    '  if (-not $map.ContainsKey($id)) {',
    '    $label = ""',
    '    try { $label = [string](Get-Volume -DriveLetter $_.DriveLetter).VolumeLabel } catch {}',
    '    $map[$id] = $label',
    '  }',
    '}',
    '$map.GetEnumerator() | ForEach-Object { $_.Key + "|" + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_.Value)) }'
  ].join('\n')

  const { stdout } = await execFileAsync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 }
  )

  const out: DriveInfo[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const [root, b64] = line.trim().split('|')
    if (!root || !/^[A-Za-z]:$/.test(root)) continue
    let label = ''
    try {
      label = Buffer.from(b64 ?? '', 'base64').toString('utf8').trim()
    } catch {
      label = ''
    }
    out.push({ id: root, label: label || root, path: root.endsWith('\\') ? root : `${root}\\` })
  }
  return out
}

async function linuxDrives(): Promise<DriveInfo[]> {
  const { stdout } = await execFileAsync('lsblk', ['-J', '-o', 'NAME,LABEL,MOUNTPOINT,RM,TYPE'])
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
  } catch (err) {
    // 枚举失败按无设备处理，不打断界面（方便排查：留一条日志）
    console.warn('[drives] enumerate failed:', (err as Error).message)
  }
  return []
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
  const canLoadFolders = canLoadUnpackedFolders()
  const buttons = canLoadFolders
    ? ['安装 .cdapp 文件', '加载未打包的文件夹', '取消']
    : ['安装 .cdapp 文件', '取消']
  const choiceOptions: Electron.MessageBoxOptions = {
    type: 'question',
    title: '安装应用',
    message: '选择应用来源',
    detail: canLoadFolders
      ? '推荐安装 .cdapp 文件。未打包文件夹仅适用于开发调试。'
      : '仅允许安装已打包的 .cdapp 应用。需要加载开发文件夹时，请先启用开发者选项。',
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true
  }
  const choice = win
    ? await dialog.showMessageBox(win, choiceOptions)
    : await dialog.showMessageBox(choiceOptions)
  if (choice.response === buttons.length - 1) return { canceled: true, apps: scanApps() }

  const choosingFolder = canLoadFolders && choice.response === 1
  const options: Electron.OpenDialogOptions = choosingFolder
    ? {
        title: '选择未打包的应用文件夹',
        buttonLabel: '加载',
        properties: ['openDirectory']
      }
    : {
        title: '选择 .cdapp 应用包',
        buttonLabel: '安装',
        properties: ['openFile'],
        filters: [{ name: 'ClassDesk 应用包', extensions: ['cdapp'] }]
      }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  if (result.canceled || result.filePaths.length === 0) return { canceled: true, apps: scanApps() }
  try {
    const installed = await installFromPath(result.filePaths[0])
    return { canceled: false, apps: scanApps(), installed }
  } catch (err) {
    return { canceled: false, apps: scanApps(), error: (err as Error).message }
  }
})

ipcMain.handle('apps:uninstall', async (_e, id: string) => {
  await uninstallApp(id)
  return scanApps()
})

ipcMain.handle(
  'apps:create-web',
  async (_e, input: { name: string; url: string }): Promise<CreateWebResult> => {
    try {
      const installed = await createWebApp(input?.name ?? '', input?.url ?? '')
      return { ok: true, apps: scanApps(), installed }
    } catch (err) {
      return { ok: false, apps: scanApps(), error: (err as Error).message }
    }
  }
)

ipcMain.handle('drives:list', () => listRemovableDrives())

ipcMain.handle('drives:open', async (_e, path: string) => {
  if (typeof path !== 'string' || !path) return '路径为空'
  return shell.openPath(path) // 返回错误信息，空串 = 成功
})

// —— 设置库（scope：'system' 或应用 id；值走 JSON）——
ipcMain.handle('settings:get', (_e, scope: string, key: string) => settingsGet(scope, key))
ipcMain.handle('settings:set', (_e, scope: string, key: string, value: SettingValue) => {
  settingsSet(scope, key, value)
  return true
})
ipcMain.handle('settings:delete', (_e, scope: string, key: string) => {
  settingsDelete(scope, key)
  return true
})
ipcMain.handle('settings:list', (_e, scope: string) => settingsList(scope))

app.whenReady().then(() => {
  userAppsDir()
  openSettings(join(appRoot(), 'classdesk.db'))
  registerAppProtocol()

  // 应用（iframe）要用摄像头（展台类应用）：只给本机页面放行媒体/剪贴板类权限，
  // 将来接权限系统时这里换成按应用 manifest 的权限声明判
  const mediaLike = new Set([
    'camera',
    'microphone',
    'media',
    'clipboard-read',
    'clipboard-write',
    'fullscreen',
    'pointerLock'
  ])
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    const url = wc.getURL()
    const local =
      url.startsWith('classdesk-app:') ||
      url.startsWith('file:') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://localhost')
    callback(local && mediaLike.has(permission))
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
