// —— 主进程 ⇄ 渲染层共享的类型（纯类型，无运行时依赖）——

/** apps/<id>/manifest.json 的结构。permissions 为预留的权限声明，权限系统启用前仅透传展示。 */
export interface AppManifest {
  id: string
  name: string
  version?: string
  /** 图标：内置图标名，或应用包内的图标文件（如 icon.png） */
  icon?: string
  /** 入口页面，相对应用包根目录，默认 index.html */
  entry?: string
  description?: string
  author?: string
  permissions?: string[]
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
  /** 安装目录（apps/<id>） */
  dir: string
  /** 是否可卸载（内置应用为 false） */
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
