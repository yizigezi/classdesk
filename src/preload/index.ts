import { contextBridge, ipcRenderer } from 'electron'
import type { CreateWebResult, DriveInfo, InstallResult, InstalledApp } from '../shared/types'
type SettingValue = string | number | boolean | null

const api = {
  wallpaperToday: (): Promise<string | null> => ipcRenderer.invoke('wallpaper:today'),
  window: {
    isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:is-fullscreen'),
    toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-fullscreen'),
    showDesktop: (): Promise<boolean> => ipcRenderer.invoke('window:show-desktop')
  },
  appsList: (): Promise<InstalledApp[]> => ipcRenderer.invoke('apps:list'),
  appsInstall: (): Promise<InstallResult> => ipcRenderer.invoke('apps:install'),
  appsUninstall: (id: string): Promise<InstalledApp[]> => ipcRenderer.invoke('apps:uninstall', id),
  appsCreateWeb: (name: string, url: string): Promise<CreateWebResult> => ipcRenderer.invoke('apps:create-web', { name, url }),
  drivesList: (): Promise<DriveInfo[]> => ipcRenderer.invoke('drives:list'),
  drivesOpen: (path: string): Promise<string> => ipcRenderer.invoke('drives:open', path),
  settings: {
    get: (scope: string, key: string): Promise<SettingValue> => ipcRenderer.invoke('settings:get', scope, key),
    set: (scope: string, key: string, value: SettingValue): Promise<boolean> => ipcRenderer.invoke('settings:set', scope, key, value),
    delete: (scope: string, key: string): Promise<boolean> => ipcRenderer.invoke('settings:delete', scope, key),
    list: (scope: string): Promise<Record<string, SettingValue>> => ipcRenderer.invoke('settings:list', scope)
  }
}

export type WindowApi = typeof api
contextBridge.exposeInMainWorld('desk', api)
