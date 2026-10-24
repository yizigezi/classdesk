// —— 浏览器预览用假数据（仅 ?mock=1 且没有 window.desk 时启用）——
// Electron 里一律走 preload 的真桥；这里只为无 Electron 环境下看界面用。
import type { DriveInfo, InstalledApp } from '../../../shared/types'

type DeskApi = Window['desk']

const fakeApps: InstalledApp[] = [
  {
    id: 'files',
    name: '文件管理',
    version: '0.1.0',
    icon: 'folder',
    entry: 'index.html',
    description: '浏览文件',
    permissions: ['fs.read'],
    dir: 'apps/files',
    removable: true
  },
  {
    id: 'clock-app',
    name: '时钟',
    version: '0.2.0',
    icon: 'clock',
    entry: 'index.html',
    description: '看时间',
    permissions: [],
    dir: 'apps/clock-app',
    removable: true
  }
]

const fakeDrives: DriveInfo[] = [
  { id: 'E:', label: 'U 盘', path: 'E:\\' },
  { id: 'F:', label: 'SD 卡', path: 'F:\\' }
]

export const mockDesk: DeskApi = {
  wallpaperToday: () => Promise.resolve(null),
  appsList: () => Promise.resolve([...fakeApps]),
  appsInstall: () => Promise.resolve({ canceled: true, apps: [...fakeApps], error: '预览模式不支持安装' }),
  appsUninstall: (id: string) => Promise.resolve(fakeApps.filter((a) => a.id !== id)),
  drivesList: () => Promise.resolve([...fakeDrives]),
  drivesOpen: () => Promise.resolve('预览模式不支持打开')
}

export function installMockDesk(): boolean {
  if (window.desk) return false
  if (!new URLSearchParams(window.location.search).has('mock')) return false
  ;(window as unknown as { desk: DeskApi }).desk = mockDesk
  return true
}
