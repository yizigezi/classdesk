<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import TitleBar from './components/TitleBar.vue'
import PagedShell from './components/PagedShell.vue'
import BottomBar from './components/BottomBar.vue'
import { useModuleStore } from '@/stores/module'

// 演示模块（PPTist）整体懒加载，不进首屏 bundle
const PptistHost = defineAsyncComponent(() => import('./pptist/PptistHost.vue'))

const moduleStore = useModuleStore()
const { activeModule, pptistActivated, pptistReady } = storeToRefs(moduleStore)

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
})
</script>

<template>
  <div
    v-show="activeModule === 'shell'"
    class="shell-root relative flex h-full w-full flex-col overflow-hidden"
    :style="wallpaper ? wallpaperStyle(wallpaper) : fallbackStyle"
  >
    <TitleBar />

    <PagedShell />

    <BottomBar />
  </div>

  <div
    v-if="activeModule === 'pptist' && !pptistReady"
    class="fixed inset-0 z-40 flex items-center justify-center bg-[#414a5e] text-[15px] text-white/90"
  >
    正在加载演示模块…
  </div>

  <!-- PPTist 全窗口覆盖视图：挂载一次后常驻，返回外壳仅隐藏（保留编辑内容） -->
  <PptistHost v-if="pptistActivated" v-show="activeModule === 'pptist'" />
</template>
