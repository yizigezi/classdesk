// —— 壳层状态：应用切换 / 系统导航 / 底栏操作插槽 ——
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AppActions, AppId } from '@/platform/contract'

function initialApp(): AppId {
  // 便于调试/无头截图直达某个应用：?module=pptx
  const m = new URLSearchParams(window.location.search).get('module')
  return m === 'pptx' ? 'pptx' : 'launcher'
}

export const useShellStore = defineStore('shell', () => {
  const activeApp = ref<AppId>(initialApp())

  // 已激活（挂载过）的应用：挂载一次常驻，返回桌面仅隐藏，保留应用内状态
  const activated = ref<Record<AppId, boolean>>({
    launcher: true,
    pptx: activeApp.value === 'pptx'
  })

  // —— 平台 API：应用注册底栏操作 ——
  const appActions = ref<Partial<Record<AppId, AppActions>>>({})

  function registerActions(id: AppId, actions: AppActions): void {
    appActions.value = { ...appActions.value, [id]: actions }
  }

  function unregisterActions(id: AppId): void {
    if (!(id in appActions.value)) return
    const next = { ...appActions.value }
    delete next[id]
    appActions.value = next
  }

  const currentActions = computed(() => appActions.value[activeApp.value] ?? null)

  // —— 系统导航（底栏左端）：返回 / 回桌面 ——
  const navStack = ref<AppId[]>([])

  function openApp(id: AppId): void {
    if (id === activeApp.value) return
    navStack.value.push(activeApp.value)
    activated.value = { ...activated.value, [id]: true }
    activeApp.value = id
  }

  function goBack(): void {
    activeApp.value = navStack.value.pop() ?? 'launcher'
  }

  function goHome(): void {
    navStack.value = []
    activeApp.value = 'launcher'
  }

  return {
    activeApp,
    activated,
    appActions,
    currentActions,
    navStack,
    registerActions,
    unregisterActions,
    openApp,
    goBack,
    goHome
  }
})
