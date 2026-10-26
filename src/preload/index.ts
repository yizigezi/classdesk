import { contextBridge, ipcRenderer } from 'electron'
import type {
  CreateWebResult,
  DriveInfo,
  InstallResult,
  InstalledApp
} from '../shared/types'

type SettingValue = string | number | boolean | null

const api = {
  wallpaperToday: (): Promise<string | null> => ipcRenderer.invoke('wallpaper:today'),

  // —— 应用仓库：启动扫描 / 安装 / 卸载 / 加网页 ——
  appsList: (): Promise<InstalledApp[]> => ipcRenderer.invoke('apps:list'),
  appsInstall: (): Promise<InstallResult> => ipcRenderer.invoke('apps:install'),
  appsUninstall: (id: string): Promise<InstalledApp[]> => ipcRenderer.invoke('apps:uninstall', id),
  appsCreateWeb: (name: string, url: string): Promise<CreateWebResult> =>
    ipcRenderer.invoke('apps:create-web', { name, url }),

  // —— 可移动存储（实时操作区）——
  drivesList: (): Promise<DriveInfo[]> => ipcRenderer.invoke('drives:list'),
  drivesOpen: (path: string): Promise<string> => ipcRenderer.invoke('drives:open', path),

  // —— 设置库（sqlite）：scope = 'system' 或应用 id，值走 JSON ——
  settings: {
    get: (scope: string, key: string): Promise<SettingValue> =>
      ipcRenderer.invoke('settings:get', scope, key),
    set: (scope: string, key: string, value: SettingValue): Promise<boolean> =>
      ipcRenderer.invoke('settings:set', scope, key, value),
    delete: (scope: string, key: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:delete', scope, key),
    list: (scope: string): Promise<Record<string, SettingValue>> =>
      ipcRenderer.invoke('settings:list', scope)
  }
}

export type WindowApi = typeof api

contextBridge.exposeInMainWorld('desk', api)
