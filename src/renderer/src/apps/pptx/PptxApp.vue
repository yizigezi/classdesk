<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PowerPointViewer, type PowerPointViewerExpose } from 'pptx-vue-viewer'
import 'pptx-vue-viewer/styles'
import SvgIcon from '@/components/SvgIcon.vue'
import { useShellStore } from '@/stores/shell'
import type { ShellAction } from '@/platform/contract'

// —— 演示应用（pptx-vue-viewer 动画放映）——
// 只负责中间区域的放映画布；顶栏 / 底栏 / 系统导航栏由壳层常驻，
// 通过平台 API 把翻页、批注工具栏等操作注册到底栏两侧。

const shell = useShellStore()

const fileInput = ref<HTMLInputElement | null>(null)
const viewer = ref<PowerPointViewerExpose | null>(null)
const rootEl = ref<HTMLElement | null>(null)

const content = ref<Uint8Array | null>(null)
const fileName = ref('')
const errorMsg = ref('')
const loading = ref(false)
const slideIndex = ref(0)
const slideCount = ref(0)
const mode = ref('edit')
const showToolbar = ref(false) // 编辑功能区（Office 风格功能区，含绘图/批注工具）

const slideLabel = computed(() =>
  content.value ? `${slideIndex.value + 1} / ${Math.max(slideCount.value, 1)}` : '未打开课件'
)

// —— 应用自定义底栏操作（平台 API）——
const leftActions = computed<ShellAction[]>(() => [
  { id: 'slide-pos', label: slideLabel.value, icon: 'slide', info: true },
  { id: 'open-file', label: '打开', icon: 'folder', onClick: () => fileInput.value?.click() }
])

const rightActions = computed<ShellAction[]>(() => [
  {
    id: 'prev-slide',
    label: '上一页',
    icon: 'prev',
    disabled: !content.value,
    onClick: () => viewer.value?.goPrev()
  },
  {
    id: 'next-slide',
    label: '下一页',
    icon: 'next',
    disabled: !content.value,
    onClick: () => viewer.value?.goNext()
  },
  {
    id: 'edit-pane',
    label: '编辑',
    icon: 'pen',
    active: showToolbar.value,
    disabled: !content.value,
    onClick: () => {
      showToolbar.value = !showToolbar.value
    }
  },
  {
    id: 'present',
    label: mode.value === 'present' ? '结束放映' : '放映',
    icon: mode.value === 'present' ? 'exit' : 'play',
    active: mode.value === 'present',
    disabled: !content.value,
    onClick: () => viewer.value?.setMode(mode.value === 'present' ? 'edit' : 'present')
  }
])

watch(
  [leftActions, rightActions],
  () => {
    shell.registerActions('pptx', { left: leftActions.value, right: rightActions.value })
  },
  { immediate: true }
)

// 放映只在中间区域显示：拦掉放映引擎的全屏接管，
// 顶/底栏保持常驻可见，底栏就是放映工具栏
function onFullscreenChange(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
}

// —— 放映等比缩放 ——
// 引擎按窗口宽算 16:9 铺满（演示容器 teleport 到 body、还会溢出顶/底栏），
// 这里把演示画布等比缩回中间区域：顶/底栏不再被盖住，底栏翻页也点得到
let fitRaf = 0
let fitTimer = 0

function fitPresentation(): void {
  const container = document.querySelector<HTMLElement>('.pptx-vue-presentation')
  const frame = document.querySelector<HTMLElement>('.pptx-vue-presentation-frame')
  if (!container || !frame) return
  const k = Math.min(
    container.clientWidth / (frame.offsetWidth || 1),
    container.clientHeight / (frame.offsetHeight || 1),
    1
  )
  // 缩放系数走 CSS 变量：引擎会重写演示画布的 inline style，
  // 挂在 documentElement 上它管不着（样式规则见 style.css）
  document.documentElement.style.setProperty('--pres-scale', String(k))
}

function scheduleFit(): void {
  cancelAnimationFrame(fitRaf)
  fitRaf = requestAnimationFrame(fitPresentation)
}

function startFitting(): void {
  // 进放映后引擎才挂演示容器：先短轮询到容器挂上，之后靠 resize 重算
  window.clearInterval(fitTimer)
  let tries = 0
  fitTimer = window.setInterval(() => {
    tries += 1
    fitPresentation()
    if (document.querySelector('.pptx-vue-presentation-frame') || tries > 40) {
      window.clearInterval(fitTimer)
      fitTimer = 0
    }
  }, 150)
}

watch(mode, (m) => {
  if (m === 'present') startFitting()
})

// —— 解析失败兜底（解耦）——
// 引擎解析失败时只在自己画布里画错误态（@error 不一定触发），
// 这里监听它的错误态、接上壳层自己的「重试 / 换个文件」，不让应用卡死
let errorObserver: MutationObserver | null = null

function watchEngineErrors(root: HTMLElement): void {
  errorObserver = new MutationObserver(() => {
    if (errorMsg.value) return
    const errEl = document.querySelector<HTMLElement>('.pptx-vue-error')
    if (!errEl) return
    loading.value = false
    const detail = errEl.innerText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' ')
    errorMsg.value = detail ? `课件解析失败：${detail}` : '课件解析失败'
  })
  errorObserver.observe(root, { childList: true, subtree: true })
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('resize', scheduleFit)
  const root = rootEl.value
  if (root) watchEngineErrors(root)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('resize', scheduleFit)
  cancelAnimationFrame(fitRaf)
  window.clearInterval(fitTimer)
  document.documentElement.style.removeProperty('--pres-scale')
  errorObserver?.disconnect()
  errorObserver = null
  shell.unregisterActions('pptx')
})

// —— 文件载入 ——
function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void loadFile(file)
}

async function loadFile(file: File): Promise<void> {
  errorMsg.value = ''
  loading.value = true
  try {
    content.value = new Uint8Array(await file.arrayBuffer())
    fileName.value = file.name
    slideIndex.value = 0
    slideCount.value = 0
    mode.value = 'edit'
    showToolbar.value = false
  } catch (err) {
    loading.value = false
    errorMsg.value = `打开失败：${(err as Error).message}`
  }
}

function onDrop(event: DragEvent): void {
  const file = event.dataTransfer?.files?.[0]
  if (file && /\.pptx?$/i.test(file.name)) void loadFile(file)
}

function onViewerLoad(): void {
  loading.value = false
  errorMsg.value = ''
}

function onViewerError(message: string): void {
  // 加载失败不再白屏：给提示和重试入口
  loading.value = false
  errorMsg.value = message || '课件加载失败'
}

function retry(): void {
  errorMsg.value = ''
  if (content.value) {
    // 重新挂载 viewer 再试一次
    const bytes = content.value
    content.value = null
    loading.value = true
    requestAnimationFrame(() => {
      content.value = bytes
    })
  }
}

function closeFile(): void {
  content.value = null
  fileName.value = ''
  errorMsg.value = ''
  loading.value = false
}
</script>

<template>
  <div
    ref="rootEl"
    class="absolute inset-0 select-auto overflow-hidden bg-[#22262e]"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <!-- 空态：选文件 -->
    <div
      v-if="!content"
      class="flex h-full w-full flex-col items-center justify-center text-white"
    >
      <SvgIcon name="slide" class="h-10 w-10 text-white/70" />
      <div class="mt-4 text-[20px] font-medium">动画放映</div>
      <div class="mt-1.5 text-[13px] text-white/55">打开 .pptx 课件，动画与切换效果照常播放</div>

      <button
        class="no-drag mt-7 h-11 rounded-pill bg-white px-9 text-[14px] font-medium text-ink-900 transition hover:bg-white/90"
        type="button"
        @click="fileInput?.click()"
      >
        打开 PPTX 文件
      </button>
      <input
        ref="fileInput"
        class="hidden"
        type="file"
        accept=".pptx,.pptm,.ppsx"
        @change="onPick"
      />

      <div class="mt-3 text-[12px] text-white/40">也可以把文件拖进这个区域</div>
    </div>

    <!-- 放映：渲染在应用区（顶/底栏与系统导航栏保持常驻可见） -->
    <template v-else>
      <PowerPointViewer
        ref="viewer"
        class="h-full w-full"
        :content="content"
        :file-name="fileName"
        :can-edit="true"
        :autosave="false"
        :show-toolbar="showToolbar"
        :on-open-file="() => fileInput?.click()"
        @load="onViewerLoad"
        @error="onViewerError"
        @active-slide-change="slideIndex = $event"
        @slide-count-change="slideCount = $event"
        @mode-change="mode = $event"
      />

      <!-- 解析中（大课件需要几秒，不再白屏等待） -->
      <div
        v-if="loading"
        class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#22262e] text-white"
      >
        <span class="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white"></span>
        <div class="text-[13px] text-white/70">正在解析课件…</div>
      </div>

      <!-- 加载失败提示 + 重试 -->
      <div
        v-if="errorMsg"
        class="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-[#8c3a2e]/92 px-4 py-2.5 text-[13px] text-white"
      >
        <span class="flex-1 truncate">{{ errorMsg }}</span>
        <button
          class="no-drag rounded-pill bg-white/15 px-3.5 py-1 transition hover:bg-white/25"
          type="button"
          @click="retry"
        >
          重试
        </button>
        <button
          class="no-drag rounded-pill bg-white/15 px-3.5 py-1 transition hover:bg-white/25"
          type="button"
          @click="closeFile"
        >
          换个文件
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 外壳 body 上的 user-select:none 会波及组件内文本编辑，这里恢复默认 */
select-auto,
.select-auto * {
  user-select: auto;
  -webkit-user-select: auto;
}

/* 放映保持在中间区域（壳层约定，见 style.css 的 .pptx-vue-presentation 规则）：
   放映容器固定在顶栏与底栏之间，顶/底栏常驻可见，底栏即放映工具栏 */
</style>
