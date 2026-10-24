// —— 应用仓库（渲染层）：内置应用 + apps/ 目录里安装的外部应用 ——
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AppEntry, BuiltinApp, InstalledApp } from '@/platform/contract'
import type { InstallResult } from '../../../shared/types'

/** 内置应用：随程序编译，不占 apps/ 目录，不可卸载。 */
export const BUILTIN_APPS: BuiltinApp[] = [
  {
    id: 'pptx',
    name: '演示',
    icon: 'slide',
    description: 'PPTX 课件动画放映',
    builtin: true,
    removable: false
  }
]

export const useRegistryStore = defineStore('registry', () => {
  const installed = ref<InstalledApp[]>([])
  const error = ref('')
  const busy = ref(false)

  const entries = computed<AppEntry[]>(() => [...BUILTIN_APPS, ...installed.value])

  function byId(id: string): AppEntry | null {
    return entries.value.find((a) => a.id === id) ?? null
  }

  async function refresh(): Promise<void> {
    try {
      installed.value = (await window.desk?.appsList()) ?? []
      error.value = ''
    } catch (err) {
      error.value = `应用列表读取失败：${(err as Error).message}`
    }
  }

  async function install(): Promise<InstallResult | null> {
    busy.value = true
    try {
      const res = await window.desk?.appsInstall()
      if (!res) return null
      installed.value = res.apps
      error.value = res.error ?? ''
      return res
    } catch (err) {
      error.value = `安装失败：${(err as Error).message}`
      return null
    } finally {
      busy.value = false
    }
  }

  async function uninstall(id: string): Promise<void> {
    busy.value = true
    try {
      installed.value = (await window.desk?.appsUninstall(id)) ?? []
      error.value = ''
    } catch (err) {
      error.value = `卸载失败：${(err as Error).message}`
    } finally {
      busy.value = false
    }
  }

  return { installed, error, busy, entries, byId, refresh, install, uninstall }
})
