<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'

// —— PPTist 入口（vendor/pptist 源码，零改动）——
import PptistApp from '@ppt/App.vue'
import PptistDirective from '@ppt/directive'

// PPTist 自带样式，引入顺序与其 src/main.ts 一致（随本懒加载组件打包）
import 'prosemirror-view/style/prosemirror.css'
import 'animate.css'
import '@ppt/assets/styles/prosemirror.scss'
import '@ppt/assets/styles/global.scss'
import '@ppt/assets/styles/font.scss'

import { useModuleStore } from '@/stores/module'

const moduleStore = useModuleStore()
const hostEl = ref<HTMLElement | null>(null)

let innerApp: VueApp<Element> | null = null

onMounted(() => {
  // 用独立子应用挂载 PPTist：它自带 pinia 与全局指令，与外壳应用互不污染
  innerApp = createApp(PptistApp)
  innerApp.use(PptistDirective)
  innerApp.use(createPinia())
  innerApp.mount(hostEl.value as Element)
  moduleStore.markPptistReady()
})

onBeforeUnmount(() => {
  innerApp?.unmount()
  innerApp = null
})

function goBack(): void {
  moduleStore.closePptist()
}
</script>

<template>
  <div class="pptist-host fixed inset-0 z-50 overflow-hidden bg-white">
    <!-- PPTist 子应用挂载点 -->
    <div ref="hostEl" class="h-full w-full"></div>

    <!-- 常驻返回入口（PPTist 全屏放映时同样可用，Esc 由 PPTist 自带逻辑退出放映） -->
    <button class="pptist-back no-drag" type="button" @click="goBack">返回</button>
  </div>
</template>

<style scoped>
/* 外壳 body 上的 user-select:none 会波及 PPTist 文本编辑，这里恢复默认 */
.pptist-host {
  user-select: auto;
  -webkit-user-select: auto;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    'Helvetica Neue',
    Helvetica,
    Arial,
    sans-serif;
  font-size: 14px;
  color: #41464b;
}

.pptist-back {
  position: fixed;
  left: 16px;
  top: 12px;
  z-index: 2147483647;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 999px;
  background: rgba(30, 34, 42, 0.38);
  color: #ffffff;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  opacity: 0.55;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
  backdrop-filter: blur(4px);
}

.pptist-back:hover {
  opacity: 1;
  background: rgba(30, 34, 42, 0.8);
}
</style>
