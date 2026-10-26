<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import TitleBar from './components/TitleBar.vue'
import PagedShell from './components/PagedShell.vue'
import BottomBar from './components/BottomBar.vue'
import Launchpad from './components/Launchpad.vue'
import ExternalAppFrame from './components/ExternalAppFrame.vue'
import { useShellStore } from '@/stores/shell'
import { useRegistryStore } from '@/stores/registry'

// —— 壳层：顶栏 / 底栏常驻（底栏 = 系统导航 + 任务栏 + 实时操作），应用只占中间区域 ——
// 应用（应用包 / 网页应用）都在 iframe 里跑，崩了也碰不到壳层
const shell = useShellStore()
const { activeApp, launchpadOpen, runningApps } = storeToRefs(shell)
const registry = useRegistryStore()

// 打开的应用：挂载一次常驻，返回桌面仅隐藏（保留应用内状态）
const running = computed(() =>
  runningApps.value
    .map((id) => registry.byId(id))
    .filter((app): app is NonNullable<typeof app> => app !== null)
)

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
  // 应用仓库：启动扫描（内置应用 + apps/ 里安装的）
  void registry.refresh()

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

        <!-- 打开的应用（应用包 / 网页应用），iframe 隔离 -->
        <ExternalAppFrame
          v-for="app in running"
          :key="app.id"
          v-show="activeApp === app.id"
          :app="app"
        />

        <!-- 应用列表（Launchpad）：盖住中间区域，顶/底栏保持可见 -->
        <Launchpad v-if="launchpadOpen" />
      </main>
    </div>

    <BottomBar />
  </div>
</template>
