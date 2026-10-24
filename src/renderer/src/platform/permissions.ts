// —— 权限系统（预留接口，暂未启用）——
// manifest.json 的 permissions 字段声明应用需要的权限；目前一律放行，
// 将来接权限系统时只需要换掉 checkPermission / requestPermission 的实现，
// 应用侧与主进程侧的调用方式不用动。
import type { AppId } from './contract'

/** 已规划的权限点（应用 manifest 里按 id 声明）。 */
export type PermissionId =
  | 'fs.read' // 读应用包之外的文件
  | 'fs.write' // 写文件
  | 'device.removable' // 访问可移动存储
  | 'net' // 联网
  | 'shell.open' // 用系统程序打开文件/目录

export interface PermissionSpec {
  id: PermissionId
  label: string
}

export const ALL_PERMISSIONS: PermissionSpec[] = [
  { id: 'fs.read', label: '读取文件' },
  { id: 'fs.write', label: '写入文件' },
  { id: 'device.removable', label: '访问可移动存储' },
  { id: 'net', label: '联网' },
  { id: 'shell.open', label: '调用系统程序打开' }
]

export interface PermissionDecision {
  granted: boolean
  /** 未启用权限系统时固定为 true；启用后这里是用户的选择。 */
  byPolicy: boolean
  reason: string
}

/** 同步检查（应用每次调用受限能力前自查）。 */
export function checkPermission(appId: AppId, permission: PermissionId): PermissionDecision {
  void appId
  void permission
  return { granted: true, byPolicy: true, reason: '权限系统未启用，一律放行' }
}

/** 弹窗请求（将来接权限系统时返回真实的用户选择）。 */
export async function requestPermission(
  appId: AppId,
  permission: PermissionId
): Promise<PermissionDecision> {
  return checkPermission(appId, permission)
}
