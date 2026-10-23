import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'

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

ipcMain.handle('wallpaper:today', () => fetchWallpaperUrl())

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
