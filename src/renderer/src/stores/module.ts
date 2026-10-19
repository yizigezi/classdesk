import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppModule = 'shell' | 'pptist'

function initialModule(): AppModule {
  // 便于调试/无头截图直达演示模块：?module=pptist
  return new URLSearchParams(window.location.search).get('module') === 'pptist' ? 'pptist' : 'shell'
}

export const useModuleStore = defineStore('module', () => {
  const activeModule = ref<AppModule>(initialModule())

  // PPTist 只挂载一次并常驻（返回外壳用 v-show 隐藏），避免重进时丢失编辑内容
  const pptistActivated = ref(activeModule.value === 'pptist')
  const pptistReady = ref(false)

  function openPptist(): void {
    pptistActivated.value = true
    activeModule.value = 'pptist'
  }

  function closePptist(): void {
    // PPTist 在生产模式会挂 window.onbeforeunload 拦截窗口关闭，返回外壳时清除
    window.onbeforeunload = null
    activeModule.value = 'shell'
  }

  function markPptistReady(): void {
    pptistReady.value = true
  }

  return { activeModule, pptistActivated, pptistReady, openPptist, closePptist, markPptistReady }
})
