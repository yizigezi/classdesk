// —— 壳层状态：应用切换 / 任务栏 / 系统导航 / 底栏操作插槽 ——
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
  // 外部应用（apps/ 仓库）用同样的机制挂载 iframe，id 即应用 id
  const activated = ref<Record<string, boolean>>({
    launcher: true,
    ...(activeApp.value === 'pptx' ? { pptx: true } : {})
  })

  // 任务栏 = 当前打开的应用（launcher 本身不算）
  const runningApps = computed<AppId[]>(() =>
    Object.keys(activated.value).filter((id) => id !== 'launcher' && activated.value[id])
  )

  // —— 应用列表（Launchpad）开合 ——
  const launchpadOpen = ref(false)

  function toggleLaunchpad(): void {
    launchpadOpen.value = !launchpadOpen.value
  }

  function closeLaunchpad(): void {
    launchpadOpen.value = false
  }

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

  /** 打开应用（带返回栈）。 */
  function openApp(id: AppId): void {
    closeLaunchpad()
    if (id === activeApp.value) return
    navStack.value.push(activeApp.value)
    activated.value = { ...activated.value, [id]: true }
    activeApp.value = id
  }

  /** 任务栏直接切换：不进返回栈。 */
  function focusApp(id: AppId): void {
    closeLaunchpad()
    if (id === activeApp.value) return
    activated.value = { ...activated.value, [id]: true }
    activeApp.value = id
  }

  /** 关闭应用（任务栏上的 ×）：卸载组件、清返回栈。 */
  function closeApp(id: AppId): void {
    if (id === 'launcher') return
    if (appActions.value[id]) {
      const next = { ...appActions.value }
      delete next[id]
      appActions.value = next
    }
    activated.value = { ...activated.value, [id]: false }
    navStack.value = navStack.value.filter((item) => item !== id)
    if (activeApp.value === id) activeApp.value = navStack.value.pop() ?? 'launcher'
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
    runningApps,
    launchpadOpen,
    toggleLaunchpad,
    closeLaunchpad,
    appActions,
    currentActions,
    navStack,
    registerActions,
    unregisterActions,
    openApp,
    focusApp,
    closeApp,
    goBack,
    goHome
  }
})
