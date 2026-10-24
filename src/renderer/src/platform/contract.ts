// —— 应用平台契约（壳层 ⇄ 应用）——
// 壳层常驻顶栏 / 底栏 / 任务栏，应用只负责中间区域，
// 并通过这组 API 自定义底栏左 / 右区的操作（如放映翻页、调出编辑功能区）。
import type { IconName } from '../icons'
import type { InstalledApp } from '../../../shared/types'

export type { InstalledApp }

/** 应用 id：内置应用（launcher / pptx）+ apps/ 仓库里安装的外部应用。 */
export type AppId = 'launcher' | 'pptx' | (string & {})

/** 内置应用（随程序编译，不可卸载），与 apps/ 仓库里的外部应用在界面上等价。 */
export interface BuiltinApp {
  id: AppId
  name: string
  icon: IconName
  description: string
  builtin: true
  removable: false
}

/** 应用列表（Launchpad）里的一格：内置应用或已安装应用。 */
export type AppEntry = BuiltinApp | (InstalledApp & { builtin?: false })

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
