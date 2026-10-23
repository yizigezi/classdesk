<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import TitleBar from './components/TitleBar.vue'
import PagedShell from './components/PagedShell.vue'
import BottomBar from './components/BottomBar.vue'
import AppLoading from './components/AppLoading.vue'
import AppError from './components/AppError.vue'
import { useShellStore } from '@/stores/shell'

// —— 壳层：顶栏 / 底栏常驻（底栏左端 = 系统导航），应用只占中间区域 ——
// 应用整体懒加载，不进首屏 bundle；加载中有占位、失败可重试，不再白屏
const PptxApp = defineAsyncComponent({
  loader: () => import('./apps/pptx/PptxApp.vue'),
  loadingComponent: AppLoading,
  errorComponent: AppError,
  delay: 120,
  timeout: 120000
})

const shell = useShellStore()
const { activeApp, activated } = storeToRefs(shell)

const wallpaper = ref('')

const fallbackStyle = {
  backgroundColor: '#414a5e',
  backgroundImage: [
    'radial-gradient(1100px 620px at 12% -12%, rgba(126, 168, 214, 0.30), transparent 62%)',
    'radial-gradient(960px 560px at 92% 4%, rgba(170, 196, 170, 0.20), transparent 60%)',
    'radial-gradient(1020px 660px at 58% 116%, rgba(196, 186, 168, 0.18), transparent 62%)'
  ].join(', ')
}

function wallpaperStyle(url: string): Record<string, string> {
  return {
    backgroundColor: fallbackStyle.backgroundColor,
    backgroundImage: `url(${url}), ${fallbackStyle.backgroundImage}`,
    backgroundSize: 'cover, auto, auto, auto',
    backgroundPosition: 'center, 0 0, 0 0, 0 0',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat'
  }
}

onMounted(async () => {
  try {
    const url = await window.desk?.wallpaperToday()
    if (url) wallpaper.value = url
  } catch {
    wallpaper.value = ''
  }

  // 演示模块的引擎包很大：首屏稳定后空闲预取，等老师点「开始演示」时已经就位
  const warm = (): void => {
    void import('./apps/pptx/PptxApp.vue').catch(() => {})
  }
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: unknown) => void })
    .requestIdleCallback
  if (typeof idle === 'function') idle(warm, { timeout: 8000 })
  else window.setTimeout(warm, 2500)
})
</script>

<template>
  <div
    class="shell-root relative flex h-full w-full flex-col overflow-hidden"
    :style="wallpaper ? wallpaperStyle(wallpaper) : fallbackStyle"
  >
    <TitleBar />

    <div class="flex min-h-0 flex-1">
      <main class="relative min-h-0 flex-1 overflow-hidden">
        <!-- 启动器（桌面） -->
        <div v-show="activeApp === 'launcher'" class="absolute inset-0 flex flex-col">
          <PagedShell />
        </div>

        <!-- 应用区：挂载一次常驻，返回桌面仅隐藏（保留应用内状态） -->
        <PptxApp v-if="activated.pptx" v-show="activeApp === 'pptx'" />
      </main>
    </div>

    <BottomBar />
  </div>
</template>
