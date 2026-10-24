// —— 可移动存储（底栏「实时操作」区）——
// 轮询主进程枚举可移动磁盘；点开先用系统文件管理器（explorer），
// 将来换成内置文件管理应用时只改 open()。
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DriveInfo } from '../../../shared/types'

export const useDevicesStore = defineStore('devices', () => {
  const drives = ref<DriveInfo[]>([])
  const error = ref('')
  let timer = 0

  async function refresh(): Promise<void> {
    try {
      drives.value = (await window.desk?.drivesList()) ?? []
      error.value = ''
    } catch {
      // 枚举失败不打断界面，等下一轮
    }
  }

  function startPolling(intervalMs = 5000): void {
    if (timer) return
    void refresh()
    timer = window.setInterval(() => void refresh(), intervalMs)
  }

  function stopPolling(): void {
    if (!timer) return
    window.clearInterval(timer)
    timer = 0
  }

  async function open(drive: DriveInfo): Promise<void> {
    try {
      const err = await window.desk?.drivesOpen(drive.path)
      error.value = err || ''
    } catch (err) {
      error.value = (err as Error).message
    }
  }

  return { drives, error, refresh, startPolling, stopPolling, open }
})
