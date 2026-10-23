// —— 应用平台契约（壳层 ⇄ 应用）——
// 壳层常驻顶栏 / 底栏 / 系统导航栏，应用只负责中间区域，
// 并通过这组 API 自定义底栏左侧 / 右侧的操作（如放映翻页、调出批注工具栏）。
import type { IconName } from '../icons'

export type AppId = 'launcher' | 'pptx'

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

/** 应用注册到底栏的操作集合。左区在系统导航（返回/桌面）之后，右区靠应用坞外侧。 */
export interface AppActions {
  left?: ShellAction[]
  right?: ShellAction[]
}
