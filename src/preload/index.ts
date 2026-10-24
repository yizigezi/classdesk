import { contextBridge, ipcRenderer } from 'electron'
import type { DriveInfo, InstallResult, InstalledApp } from '../shared/types'

const api = {
  wallpaperToday: (): Promise<string | null> => ipcRenderer.invoke('wallpaper:today'),

  // —— 应用仓库：启动扫描 / 安装 / 卸载 ——
  appsList: (): Promise<InstalledApp[]> => ipcRenderer.invoke('apps:list'),
  appsInstall: (): Promise<InstallResult> => ipcRenderer.invoke('apps:install'),
  appsUninstall: (id: string): Promise<InstalledApp[]> => ipcRenderer.invoke('apps:uninstall', id),

  // —— 可移动存储（实时操作区）——
  drivesList: (): Promise<DriveInfo[]> => ipcRenderer.invoke('drives:list'),
  drivesOpen: (path: string): Promise<string> => ipcRenderer.invoke('drives:open', path)
}

export type WindowApi = typeof api

contextBridge.exposeInMainWorld('desk', api)
