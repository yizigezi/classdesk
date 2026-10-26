// —— 浏览器预览用假数据（仅 ?mock=1 且没有 window.desk 时启用）——
// Electron 里一律走 preload 的真桥；这里只为无 Electron 环境下看界面用。
import type { DriveInfo, InstalledApp } from '../../../shared/types'

type DeskApi = Window['desk']

const fakeApps: InstalledApp[] = [
  {
    id: 'cn.yizigezi.pptx',
    name: '演示',
    version: '0.5.0',
    icon: 'slide',
    entry: 'index.html',
    description: 'PPTX 课件动画放映',
    permissions: [],
    type: 'app',
    url: '',
    pkgPath: 'dist-apps/cn.yizigezi.pptx.cdapp',
    kind: 'cdapp',
    source: 'system',
    removable: false
  },
  {
    id: 'cn.yizigezi.web-bilibili',
    name: '课堂视频',
    version: '1.0.0',
    icon: 'apps',
    entry: 'index.html',
    description: 'www.bilibili.com',
    permissions: ['net'],
    type: 'web',
    url: 'https://www.bilibili.com',
    pkgPath: 'apps/cn.yizigezi.web-bilibili',
    kind: 'dir',
    source: 'user',
    removable: true
  }
]

const fakeDrives: DriveInfo[] = [
  { id: 'E:', label: 'U 盘', path: 'E:\\' },
  { id: 'F:', label: 'SD 卡', path: 'F:\\' }
]

// 开发调试：?mockApp=<url> 可以把一个假应用指到指定页面（比如本地跑的应用包），
// 用来在浏览器里联调 iframe 应用的桥（底栏操作 / 设置 API）
const mockAppUrl = new URLSearchParams(window.location.search).get('mockApp')
if (mockAppUrl) {
  fakeApps[1] = { ...fakeApps[1], id: 'cn.yizigezi.web-local', name: '本地调试', type: 'web', url: mockAppUrl }
}

type SettingValue = string | number | boolean | null

const fakeSettings: Record<string, Record<string, SettingValue>> = {}

export const mockDesk: DeskApi = {
  wallpaperToday: () => Promise.resolve(null),
  appsList: () => Promise.resolve([...fakeApps]),
  appsInstall: () =>
    Promise.resolve({ canceled: true, apps: [...fakeApps], error: '预览模式不支持安装' }),
  appsUninstall: (id: string) => Promise.resolve(fakeApps.filter((a) => a.id !== id)),
  appsCreateWeb: () =>
    Promise.resolve({ ok: false, apps: [...fakeApps], error: '预览模式不支持添加网页' }),
  drivesList: () => Promise.resolve([...fakeDrives]),
  drivesOpen: () => Promise.resolve('预览模式不支持打开'),
  settings: {
    get: (scope: string, key: string) => Promise.resolve(fakeSettings[scope]?.[key] ?? null),
    set: (scope: string, key: string, value: SettingValue) => {
      fakeSettings[scope] = { ...(fakeSettings[scope] ?? {}), [key]: value }
      return Promise.resolve(true)
    },
    delete: (scope: string, key: string) => {
      if (fakeSettings[scope]) delete fakeSettings[scope][key]
      return Promise.resolve(true)
    },
    list: (scope: string) => Promise.resolve({ ...(fakeSettings[scope] ?? {}) })
  }
}

export function installMockDesk(): boolean {
  if (window.desk) return false
  if (!new URLSearchParams(window.location.search).has('mock')) return false
  ;(window as unknown as { desk: DeskApi }).desk = mockDesk
  return true
}
