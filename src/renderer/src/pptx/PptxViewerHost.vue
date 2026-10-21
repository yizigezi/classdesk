<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { PowerPointViewer } from 'pptx-vue-viewer'
import 'pptx-vue-viewer/styles'
import { useModuleStore } from '@/stores/module'

// —— 动画放映入口（pptx-vue-viewer）——
// 选一个 .pptx → 原样渲染放映（支持 PPT 动画/切换效果/墨迹批注），替代 PPTist 的放映职责
const moduleStore = useModuleStore()
const { pptxContent, pptxFileName } = storeToRefs(moduleStore)

const fileInput = ref<HTMLInputElement | null>(null)
const errorMsg = ref('')

// 懒加载 chunk 到位、首帧挂载完成，外壳收起加载幕
onMounted(() => moduleStore.markPptxReady())

async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await loadFile(file)
}

async function loadFile(file: File): Promise<void> {
  errorMsg.value = ''
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    moduleStore.setPptx(bytes, file.name)
  } catch (err) {
    errorMsg.value = `打开失败：${(err as Error).message}`
  }
}

function onDrop(event: DragEvent): void {
  const file = event.dataTransfer?.files?.[0]
  if (file && /\.pptx?$/i.test(file.name)) void loadFile(file)
}

function goBack(): void {
  moduleStore.closePptx()
}
</script>

<template>
  <div
    class="pptx-host fixed inset-0 z-50 overflow-hidden bg-[#22262e]"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <!-- 空态：选文件 -->
    <div v-if="!pptxContent" class="flex h-full w-full flex-col items-center justify-center text-white">
      <div class="text-[22px] font-medium">动画放映</div>
      <div class="mt-2 text-[13px] text-white/55">打开 .pptx 课件，动画与切换效果照常播放</div>

      <button
        class="no-drag mt-8 h-12 rounded-pill bg-white px-10 text-[15px] font-medium text-ink-900 transition hover:bg-white/90"
        type="button"
        @click="fileInput?.click()"
      >
        打开 PPTX 文件
      </button>
      <input ref="fileInput" class="hidden" type="file" accept=".pptx,.pptm,.ppsx" @change="onFile" />

      <div class="mt-4 text-[12px] text-white/40">也可以把文件拖进这个窗口</div>
      <div v-if="errorMsg" class="mt-3 text-[13px] text-red-300">{{ errorMsg }}</div>

      <button
        class="no-drag mt-10 text-[12px] text-white/45 underline-offset-4 transition hover:text-white/80 hover:underline"
        type="button"
        @click="moduleStore.openPptist()"
      >
        旧版演示（PPTist）
      </button>
    </div>

    <!-- 放映：全窗口渲染，可编辑（改动不落盘，导出走组件内另存） -->
    <PowerPointViewer
      v-else
      class="h-full w-full"
      :content="pptxContent"
      :file-name="pptxFileName"
      :can-edit="true"
      :autosave="false"
    />

    <!-- 常驻返回入口 -->
    <button class="pptx-back no-drag" type="button" @click="goBack">返回</button>
  </div>
</template>

<style scoped>
/* 外壳 body 上的 user-select:none 会波及组件内文本编辑，这里恢复默认 */
.pptx-host {
  user-select: auto;
  -webkit-user-select: auto;
}

.pptx-back {
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

.pptx-back:hover {
  opacity: 1;
  background: rgba(30, 34, 42, 0.8);
}
</style>
