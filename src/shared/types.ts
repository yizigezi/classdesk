// —— 主进程 ⇄ 渲染层共享的类型（纯类型，无运行时依赖）——

/** 应用包 manifest.json 的结构。permissions 为预留的权限声明，权限系统启用前仅透传展示。 */
export interface AppManifest {
  id: string
  name: string
  version?: string
  /** 图标：内置图标名，或应用包内的图标文件（如 icon.png） */
  icon?: string
  /** 入口页面（type=app），相对应用包根目录，默认 index.html */
  entry?: string
  description?: string
  author?: string
  permissions?: string[]
  /** app = 本地应用包；web = 网页应用（只存 url） */
  type?: 'app' | 'web'
  /** type=web 时的页面地址 */
  url?: string
}

/** 扫描/安装后交给渲染层的应用信息。 */
export interface InstalledApp extends AppManifest {
  id: string
  name: string
  version: string
  icon: string
  entry: string
  description: string
  permissions: string[]
  type: 'app' | 'web'
  url: string
  /** 包位置：文件夹目录，或 .cdapp 文件 */
  pkgPath: string
  /** 包形态：文件夹包 / asar 归档包（.cdapp） */
  kind: 'dir' | 'cdapp'
  /** system = 随程序分发（不可卸载）；user = 用户安装 */
  source: 'system' | 'user'
  removable: boolean
}

/** 可移动存储设备（U 盘、SD 卡等）。 */
export interface DriveInfo {
  id: string
  label: string
  path: string
}

export interface InstallResult {
  canceled: boolean
  apps: InstalledApp[]
  installed?: InstalledApp
  error?: string
}

export interface CreateWebResult {
  ok: boolean
  apps: InstalledApp[]
  installed?: InstalledApp
  error?: string
}
