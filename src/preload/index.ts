import { contextBridge, ipcRenderer } from 'electron'

const api = {
  wallpaperToday: (): Promise<string | null> => ipcRenderer.invoke('wallpaper:today')
}

export type WindowApi = typeof api

contextBridge.exposeInMainWorld('desk', api)
