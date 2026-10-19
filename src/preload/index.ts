import { contextBridge, ipcRenderer } from 'electron'

const api = {
  wallpaperToday: (): Promise<string | null> => ipcRenderer.invoke('wallpaper:today'),
  // 生产模式（file://）下读取内置 mock JSON（PPTist 初始数据 / 模板库）
  readMock: (name: string): Promise<unknown> => ipcRenderer.invoke('mock:read', name)
}

export type WindowApi = typeof api

contextBridge.exposeInMainWorld('desk', api)
