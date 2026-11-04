import { ipcMain } from 'electron'

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
      if (urlbase) url = `https://www.bing.com${urlbase}_UHD.jpg`
    }
  } catch {
    url = null
  }

  wallpaperCache = { day, url }
  return url
}

export function registerWallpaperIpc(): void {
  ipcMain.handle('wallpaper:today', () => fetchWallpaperUrl())
}
