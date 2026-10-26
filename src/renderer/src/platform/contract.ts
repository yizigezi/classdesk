// —— 应用平台契约（壳层 ⇄ 应用）——
// 壳层常驻顶栏 / 底栏 / 任务栏，应用只负责中间区域。
// 内置应用（编译进壳层）走这套 TS API 注册底栏操作；外部应用（apps/ 仓库里的
// 应用包 / 网页应用）跑在 iframe 里，走 postMessage 桥（见 ExternalAppFrame.vue）。
import type { IconName } from '../icons'
import type { InstalledApp } from '../../../shared/types'

export type { InstalledApp }

/** 应用 id：包名风格（cn.yizigezi.xxx）；'launcher' 是桌面自己。 */
export type AppId = 'launcher' | (string & {})

/** 应用列表（Launchpad）里的一格。 */
export type AppEntry = InstalledApp

/** 底栏上的一个操作项。 */
export interface ShellAction {
  id: string
  label: string
  /** 不传则渲染为纯文字信息位（如页码）。 */
  icon?: IconName
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  /** 只展示信息、不可点击（页码、状态等）。 */
  info?: boolean
}

/**
 * 应用注册到底栏的操作集合。
 * 左区在系统导航（返回/桌面）之后；右区在任务栏/实时操作区外侧。
 */
export interface AppActions {
  left?: ShellAction[]
  right?: ShellAction[]
}
