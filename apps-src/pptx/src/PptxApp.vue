<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PowerPointViewer, type PowerPointViewerExpose } from 'pptx-vue-viewer'
import 'pptx-vue-viewer/styles'
import * as bridge from './bridge'

// —— 演示应用（独立应用包）——
// 跑在 classdesk-app:// 的 iframe 里（自己的 document），解析崩了也碰不到壳层；
// 底栏操作通过 postMessage 桥注册到壳层（翻页 / 编辑 / 放映都在壳层底栏）。
// 放映画布等比缩放在应用窗口内：引擎按窗口宽算 16:9，超高窗口会溢出，这里缩回去。

const viewer = ref<PowerPointViewerExpose | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

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

// —— 底栏操作：注册到壳层（postMessage 桥）——
function pushActions(): void {
  bridge.setActions({
    left: [
      { id: 'slide-pos', label: slideLabel.value, icon: 'slide', info: true },
      { id: 'open-file', label: '打开', icon: 'folder' }
    ],
    right: [
      {
        id: 'prev-slide',
        label: '上一页',
        icon: 'prev',
        disabled: !content.value
      },
      {
        id: 'next-slide',
        label: '下一页',
        icon: 'next',
        disabled: !content.value
      },
      {
        id: 'edit-pane',
        label: '编辑',
        icon: 'pen',
        active: showToolbar.value,
        disabled: !content.value
      },
      {
        id: 'present',
        label: mode.value === 'present' ? '结束放映' : '放映',
        icon: mode.value === 'present' ? 'exit' : 'play',
        active: mode.value === 'present',
        disabled: !content.value
      }
    ]
  })
}

watch([slideLabel, content, showToolbar, mode], pushActions, { immediate: true })

// 编辑功能区开关存进设置库（sqlite，scope 锁本应用）：下次进来保持习惯
watch(showToolbar, (v) => void bridge.settingsSet('showToolbar', v))

bridge.onInvoke((id) => {
  switch (id) {
    case 'open-file':
      fileInput.value?.click()
      break
    case 'prev-slide':
      viewer.value?.goPrev()
      break
    case 'next-slide':
      viewer.value?.goNext()
      break
    case 'edit-pane':
      showToolbar.value = !showToolbar.value
      break
    case 'present':
      viewer.value?.setMode(mode.value === 'present' ? 'edit' : 'present')
      break
  }
})

// —— 放映等比缩放：引擎按窗口宽算 16:9 铺满（超高窗口会溢出上下），缩回窗口内 ——
// 缩放系数走 CSS 变量：引擎会重写演示画布 inline style，挂 documentElement 它管不着
let fitRaf = 0

function fitPresentation(): void {
  const container = document.querySelector<HTMLElement>('.pptx-vue-presentation')
  const frame = document.querySelector<HTMLElement>('.pptx-vue-presentation-frame')
  if (!container || !frame) return
  const k = Math.min(
    container.clientWidth / (frame.offsetWidth || 1),
    container.clientHeight / (frame.offsetHeight || 1),
    1
  )
  document.documentElement.style.setProperty('--pres-scale', String(k))
}

function scheduleFit(): void {
  cancelAnimationFrame(fitRaf)
  fitRaf = requestAnimationFrame(fitPresentation)
}

// 引擎进放映后才挂演示容器，且随时可能改画布尺寸：盯 DOM 变化 + 窗口尺寸
const fitObserver = new MutationObserver(scheduleFit)

function onFullscreenChange(): void {
  // 放映保持在应用窗口内（iframe 本身也拦了全屏），双保险
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
}

// —— 解析失败兜底：接出壳层同款「重试 / 换个文件」，不让应用卡死 ——
const errorObserver = new MutationObserver(() => {
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

onMounted(() => {
  void bridge.settingsGet('showToolbar').then((saved) => {
    if (saved === true || saved === 1 || saved === '1') showToolbar.value = true
  })
  fitObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  })
  errorObserver.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', scheduleFit)
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  fitObserver.disconnect()
  errorObserver.disconnect()
  cancelAnimationFrame(fitRaf)
  window.removeEventListener('resize', scheduleFit)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
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
  <div class="pv-root" @dragover.prevent @drop.prevent="onDrop">
    <!-- 文件输入常驻（底栏「打开」随时可用） -->
    <input
      ref="fileInput"
      class="pv-hidden"
      type="file"
      accept=".pptx,.pptm,.ppsx"
      @change="onPick"
    />

    <!-- 空态：选文件 -->
    <div v-if="!content" class="pv-empty">
      <svg class="pv-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <rect x="3" y="4.5" width="18" height="12" rx="2.2" />
        <path d="M12 16.5v3M8.6 19.5h6.8" />
        <path d="M10.6 8.2l4 2.3-4 2.3z" fill="currentColor" stroke="none" />
      </svg>
      <div class="pv-empty-title">动画放映</div>
      <div class="pv-empty-sub">打开 .pptx 课件，动画与切换效果照常播放</div>
      <button class="pv-primary" type="button" @click="fileInput?.click()">打开 PPTX 文件</button>
      <div class="pv-empty-hint">也可以把文件拖进这个区域</div>
    </div>

    <!-- 放映：画布等比缩放在应用窗口内（顶/底栏在壳层，一直可见） -->
    <template v-else>
      <PowerPointViewer
        ref="viewer"
        class="pv-viewer"
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

      <!-- 解析中 -->
      <div v-if="loading" class="pv-loading">
        <span class="pv-spin"></span>
        <div>正在解析课件…</div>
      </div>

      <!-- 解析失败：重试 / 换个文件 -->
      <div v-if="errorMsg" class="pv-banner">
        <span class="pv-banner-text">{{ errorMsg }}</span>
        <button class="pv-banner-btn" type="button" @click="retry">重试</button>
        <button class="pv-banner-btn" type="button" @click="closeFile">换个文件</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pv-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #22262e;
  user-select: none;
}

.pv-hidden {
  display: none;
}

.pv-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.pv-empty-icon {
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.7);
}

.pv-empty-title {
  margin-top: 16px;
  font-size: 20px;
  font-weight: 500;
}

.pv-empty-sub {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
}

.pv-primary {
  margin-top: 28px;
  height: 44px;
  padding: 0 36px;
  border: 0;
  border-radius: 999px;
  background: #fff;
  color: #22262e;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.pv-primary:hover {
  background: rgba(255, 255, 255, 0.9);
}

.pv-empty-hint {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.pv-viewer {
  width: 100%;
  height: 100%;
}

.pv-loading {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #22262e;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.pv-spin {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  animation: pv-spin 0.9s linear infinite;
}

@keyframes pv-spin {
  to {
    transform: rotate(360deg);
  }
}

.pv-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(140, 58, 46, 0.92);
  color: #fff;
  font-size: 13px;
}

.pv-banner-text {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pv-banner-btn {
  border: 0;
  border-radius: 999px;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.pv-banner-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
