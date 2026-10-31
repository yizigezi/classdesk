import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { settingsGet } from './settings'

export function createMainWindow(): void {
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

  win.on('ready-to-show', () => {
    // 默认启动全屏；设置中关闭后则以普通窗口启动。
    win.setFullScreen(settingsGet('system', 'startFullscreen') !== false)
    win.show()
  })

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