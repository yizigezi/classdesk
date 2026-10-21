import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppModule = 'shell' | 'pptist' | 'pptx'

function initialModule(): AppModule {
  // 便于调试/无头截图直达演示模块：?module=pptx / ?module=pptist
  const m = new URLSearchParams(window.location.search).get('module')
  return m === 'pptist' || m === 'pptx' ? m : 'shell'
}

export const useModuleStore = defineStore('module', () => {
  const activeModule = ref<AppModule>(initialModule())

  // —— 动画放映（pptx-vue-viewer）——
  // 打开的 pptx 字节留在 store：返回外壳再进来不用重新选文件
  const pptxActivated = ref(activeModule.value === 'pptx')
  const pptxReady = ref(false)
  const pptxContent = ref<Uint8Array | null>(null)
  const pptxFileName = ref('')

  function openPptx(): void {
    pptxActivated.value = true
    activeModule.value = 'pptx'
  }

  function closePptx(): void {
    activeModule.value = 'shell'
  }

  function markPptxReady(): void {
    pptxReady.value = true
  }

  function setPptx(content: Uint8Array, fileName: string): void {
    pptxContent.value = content
    pptxFileName.value = fileName
  }

  // —— PPTist（旧版演示，暂留暗门，去留待主人定）——
  // 只挂载一次并常驻（返回外壳用 v-show 隐藏），避免重进时丢失编辑内容
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

  return {
    activeModule,
    pptxActivated,
    pptxReady,
    pptxContent,
    pptxFileName,
    openPptx,
    closePptx,
    markPptxReady,
    setPptx,
    pptistActivated,
    pptistReady,
    openPptist,
    closePptist,
    markPptistReady
  }
})
