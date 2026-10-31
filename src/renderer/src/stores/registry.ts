// —— 应用仓库（渲染层）：应用列表 = 内置应用 + apps/ 里安装的（含网页应用）——
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AppEntry, InstalledApp } from '@/platform/contract'
import type { CreateWebResult, InstallResult } from '../../../shared/types'

/** 「演示」应用包的 id（随程序分发的内置应用）。 */
export const PRESENT_APP_ID = 'cn.yizigezi.pptx'
export const SETTINGS_APP_ID = 'cn.yizigezi.settings'

const settingsApp: InstalledApp = {
  id: SETTINGS_APP_ID,
  name: '设置',
  version: '0.5.0',
  icon: 'setting',
  entry: '',
  description: 'ClassDesk 系统设置与开发者选项',
  permissions: [],
  type: 'app',
  url: '',
  pkgPath: 'builtin:settings',
  kind: 'dir',
  source: 'system',
  removable: false
}

export const useRegistryStore = defineStore('registry', () => {
  const apps = ref<InstalledApp[]>([])
  const error = ref('')
  const busy = ref(false)

  const entries = computed<AppEntry[]>(() =>
    [...apps.value.filter((app) => app.id !== SETTINGS_APP_ID), settingsApp]
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  )

  function byId(id: string): AppEntry | null {
    return entries.value.find((a) => a.id === id) ?? null
  }

  async function refresh(): Promise<void> {
    try {
      apps.value = (await window.desk?.appsList()) ?? []
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
      apps.value = res.apps
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
      apps.value = (await window.desk?.appsUninstall(id)) ?? []
      error.value = ''
    } catch (err) {
      error.value = `卸载失败：${(err as Error).message}`
    } finally {
      busy.value = false
    }
  }

  async function createWeb(name: string, url: string): Promise<CreateWebResult | null> {
    busy.value = true
    try {
      const res = await window.desk?.appsCreateWeb(name, url)
      if (!res) return null
      apps.value = res.apps
      error.value = res.error ?? ''
      return res
    } catch (err) {
      error.value = `添加失败：${(err as Error).message}`
      return null
    } finally {
      busy.value = false
    }
  }

  return { apps, entries, error, busy, byId, refresh, install, uninstall, createWeb }
})
