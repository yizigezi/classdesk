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
    class="pptx-shell absolute inset-0 select-auto overflow-hidden"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      class="sr-only-file"
      type="file"
      accept=".pptx,.pptm,.ppsx"
      @change="onPick"
    />

    <div v-if="!content" class="pptx-empty">
      <div class="pptx-empty-art">
        <div class="art-shadow"></div>
        <div class="art-sheet">
          <span class="art-kicker">CLASSDESK PRESENTATION</span>
          <span class="art-title"></span>
          <span class="art-line"></span>
          <span class="art-line medium"></span>
          <span class="art-line short"></span>
          <span class="art-chart"><i></i><i></i><i></i><i></i></span>
        </div>
        <span class="art-orbit"></span>
      </div>

      <span class="pptx-eyebrow"><i></i> POWERPOINT WORKSPACE</span>
      <h1>让想法，精彩呈现</h1>
      <p class="pptx-description">打开 PowerPoint 课件，在 ClassDesk 中继续编辑或开始放映。</p>

      <div class="pptx-dropzone">
        <span class="drop-icon"><SvgIcon name="folder-open" class="h-6 w-6" /></span>
        <strong>从文件开始</strong>
        <span>选择一个课件，或将文件拖放到此处</span>
        <button class="pptx-primary" type="button" @click="fileInput?.click()">
          <SvgIcon name="upload" class="h-4 w-4" />
          选择 PPTX 文件
        </button>
      </div>
      <div class="pptx-formats"><span>PPTX</span><span>PPTM</span><span>PPSX</span><i></i><small>支持 PowerPoint 格式</small></div>
    </div>

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

      <div v-if="loading" class="pptx-loading">
        <div class="loading-card">
          <span class="loading-spinner"></span>
          <div><strong>正在准备课件</strong><small>正在解析页面与动画资源…</small></div>
        </div>
      </div>

      <div v-if="errorMsg" class="pptx-error-layer">
        <section class="pptx-error-card" role="alertdialog" aria-modal="true" aria-labelledby="pptx-error-title">
          <span class="error-symbol">!</span>
          <h2 id="pptx-error-title">无法打开课件</h2>
          <p>{{ errorMsg }}</p>
          <div class="error-actions">
            <button type="button" class="error-secondary" @click="closeFile">返回</button>
            <button type="button" class="error-primary" @click="retry">重试</button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pptx-shell {
  background:
    radial-gradient(700px 440px at 18% 8%, rgba(102, 128, 194, .17), transparent 65%),
    radial-gradient(620px 420px at 88% 88%, rgba(150, 111, 177, .13), transparent 65%),
    linear-gradient(145deg, #171b26, #202633 58%, #1a202c);
  color: #f3f2f8;
  font-family: 'MiSans', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', system-ui, sans-serif;
}
.sr-only-file { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.pptx-empty { display:flex; width:100%; height:100%; box-sizing:border-box; flex-direction:column; align-items:center; justify-content:center; overflow:auto; padding:26px 24px; text-align:center; }
.pptx-empty-art { position:relative; width:154px; height:112px; margin-bottom:18px; }
.art-shadow { position:absolute; top:12px; left:27px; width:105px; height:80px; transform:rotate(8deg); border:1px solid rgba(255,255,255,.1); border-radius:18px; background:rgba(151,165,208,.18); }
.art-sheet { position:absolute; inset:0 30px 16px 16px; display:flex; flex-direction:column; padding:14px 13px; transform:rotate(-5deg); border:1px solid rgba(255,255,255,.14); border-radius:18px; background:linear-gradient(145deg,#f7f7ff,#dfe5fb); box-shadow:0 16px 38px rgba(0,0,0,.24); }
.art-kicker { color:#7380aa; font-size:5px; font-weight:800; letter-spacing:.13em; }
.art-title { width:76%; height:7px; margin-top:11px; border-radius:6px; background:#404d7c; }
.art-line { width:100%; height:3px; margin-top:6px; border-radius:5px; background:#aeb6d0; }
.art-line.medium { width:80%; margin-top:4px; }.art-line.short { width:56%; margin-top:4px; }
.art-chart { display:flex; height:25px; align-items:flex-end; gap:4px; margin-top:auto; }
.art-chart i { width:10px; border-radius:4px 4px 1px 1px; background:linear-gradient(#9d8ad5,#6d74b5); }
.art-chart i:nth-child(1){height:45%}.art-chart i:nth-child(2){height:72%}.art-chart i:nth-child(3){height:58%}.art-chart i:nth-child(4){height:94%}
.art-orbit { position:absolute; right:2px; bottom:2px; width:35px; height:35px; border:7px solid #9bb0df; border-right-color:#dacff2; border-radius:50%; box-shadow:0 0 0 7px rgba(155,176,223,.1); }
.pptx-eyebrow { display:flex; align-items:center; gap:7px; color:#aeb9dc; font-size:9px; font-weight:800; letter-spacing:.16em; }
.pptx-eyebrow i { width:6px; height:6px; border-radius:50%; background:#a8b8ef; box-shadow:0 0 0 4px rgba(168,184,239,.12); }
.pptx-empty h1 { margin:9px 0 0; color:#f5f4fb; font-size:27px; font-weight:700; letter-spacing:-.045em; }
.pptx-description { max-width:450px; margin:8px 0 0; color:rgba(226,230,244,.66); font-size:12px; line-height:1.8; }
.pptx-dropzone { display:flex; width:min(430px, calc(100vw - 48px)); box-sizing:border-box; flex-direction:column; align-items:center; margin-top:24px; padding:19px 18px 18px; border:1px dashed rgba(183,196,235,.28); border-radius:24px; background:rgba(255,255,255,.045); }
.drop-icon { display:grid; width:42px; height:42px; place-items:center; border-radius:15px; background:rgba(181,194,239,.13); color:#c3cdf2; }
.pptx-dropzone strong { margin-top:9px; color:#f0eff8; font-size:13px; font-weight:650; }
.pptx-dropzone > span:not(.drop-icon) { margin-top:3px; color:rgba(222,227,243,.52); font-size:10px; }
.pptx-primary { display:inline-flex; min-height:40px; align-items:center; gap:8px; margin-top:14px; padding:0 18px; border-radius:999px; background:#d9e1ff; color:#17213c; font-size:11px; font-weight:750; cursor:pointer; transition:transform .18s ease, background .18s ease; }
.pptx-primary:hover { transform:translateY(-1px); background:#e8ebff; }.pptx-primary:active { transform:scale(.98); }
.pptx-formats { display:flex; align-items:center; gap:6px; margin-top:13px; color:#aab3cd; }
.pptx-formats span { padding:3px 7px; border:1px solid rgba(185,197,230,.14); border-radius:7px; background:rgba(255,255,255,.05); font-size:8px; font-weight:700; letter-spacing:.04em; }
.pptx-formats i { width:3px; height:3px; margin:0 3px; border-radius:50%; background:rgba(200,209,231,.4); }
.pptx-formats small { color:rgba(221,226,242,.45); font-size:9px; }
.pptx-loading { position:absolute; inset:0; z-index:30; display:grid; place-items:center; background:rgba(15,19,28,.48); backdrop-filter:blur(16px); }
.loading-card { display:flex; align-items:center; gap:14px; padding:20px 24px; border:1px solid rgba(255,255,255,.12); border-radius:22px; background:rgba(36,43,59,.94); box-shadow:0 18px 55px rgba(0,0,0,.25); }
.loading-spinner { width:27px; height:27px; border:3px solid rgba(205,214,248,.2); border-top-color:#c5d0ff; border-radius:50%; animation:pptx-spin .8s linear infinite; }
.loading-card div { display:flex; flex-direction:column; gap:4px; text-align:left; }.loading-card strong { color:#f4f3fb; font-size:13px; }.loading-card small { color:rgba(220,225,242,.56); font-size:10px; }
.pptx-error-layer { position:absolute; inset:0; z-index:40; display:grid; place-items:center; padding:24px; background:rgba(12,15,23,.56); backdrop-filter:blur(14px); }
.pptx-error-card { width:min(390px,100%); box-sizing:border-box; padding:25px; border:1px solid rgba(255,255,255,.13); border-radius:28px; background:#282d3c; box-shadow:0 24px 70px rgba(0,0,0,.35); color:#f4f2f8; text-align:left; }
.error-symbol { display:grid; width:38px; height:38px; place-items:center; border-radius:14px; background:#593c4b; color:#ffc1c5; font-size:20px; font-weight:800; }
.pptx-error-card h2 { margin:16px 0 0; font-size:19px; font-weight:700; letter-spacing:-.03em; }.pptx-error-card p { margin:8px 0 0; color:rgba(232,230,241,.66); font-size:12px; line-height:1.7; }
.error-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:23px; }
.error-actions button { min-height:38px; padding:0 16px; border-radius:999px; font-size:11px; font-weight:700; cursor:pointer; transition:transform .16s ease, background .16s ease; }
.error-secondary { background:rgba(255,255,255,.08); color:#e8e7f2; }.error-secondary:hover { background:rgba(255,255,255,.14); }
.error-primary { background:#d9e1ff; color:#17213c; }.error-primary:hover { background:#e8ebff; }
.error-actions button:active { transform:scale(.98); }
@keyframes pptx-spin { to { transform:rotate(360deg); } }
</style>
