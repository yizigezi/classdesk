import { app, BrowserWindow, ipcMain } from 'electron'

// classdesk 启动时默认进入真正的 Electron 全屏。
app.on('browser-window-created', (_event, win) => {
  win.once('ready-to-show', () => {
    win.setFullScreen(true)
  })
})

ipcMain.handle('window:is-fullscreen', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false
})

ipcMain.handle('window:toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return false
  win.setFullScreen(!win.isFullScreen())
  return win.isFullScreen()
})

ipcMain.handle('window:show-desktop', () => {
  if (process.platform !== 'win32') return false
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (!win) return false
  win.minimize()
  return true
})
