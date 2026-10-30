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
    <input
      ref="fileInput"
      class="pv-hidden"
      type="file"
      accept=".pptx,.pptm,.ppsx"
      @change="onPick"
    />

    <div v-if="!content" class="pv-empty">
      <div class="pv-empty-art">
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
      <span class="pv-eyebrow"><i></i> POWERPOINT WORKSPACE</span>
      <div class="pv-empty-title">让想法，精彩呈现</div>
      <div class="pv-empty-sub">打开 PowerPoint 课件，在 ClassDesk 中继续编辑或开始放映。</div>

      <div class="pv-dropzone">
        <span class="drop-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M3.5 7.5h6l2 2h9v9.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/>
            <path d="M12 12v5m-2-2 2 2 2-2"/>
          </svg>
        </span>
        <strong>从文件开始</strong>
        <span>选择一个课件，或将文件拖放到此处</span>
        <button class="pv-primary" type="button" @click="fileInput?.click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 15V3m-4 4 4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
          </svg>
          选择 PPTX 文件
        </button>
      </div>
      <div class="pv-formats"><span>PPTX</span><span>PPTM</span><span>PPSX</span><i></i><small>支持 PowerPoint 格式</small></div>
    </div>

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

      <div v-if="loading" class="pv-loading">
        <div class="pv-loading-card">
          <span class="pv-spin"></span>
          <div><strong>正在准备课件</strong><small>正在解析页面与动画资源…</small></div>
        </div>
      </div>

      <div v-if="errorMsg" class="pv-error-layer">
        <section class="pv-error-card" role="alertdialog" aria-modal="true" aria-labelledby="pv-error-title">
          <span class="pv-error-symbol">!</span>
          <h2 id="pv-error-title">无法打开课件</h2>
          <p>{{ errorMsg }}</p>
          <div class="pv-error-actions">
            <button type="button" class="pv-error-secondary" @click="closeFile">返回</button>
            <button type="button" class="pv-error-primary" @click="retry">重试</button>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pv-root { position:absolute; inset:0; overflow:hidden; background:
  radial-gradient(700px 440px at 18% 8%,rgba(102,128,194,.17),transparent 65%),
  radial-gradient(620px 420px at 88% 88%,rgba(150,111,177,.13),transparent 65%),
  linear-gradient(145deg,#171b26,#202633 58%,#1a202c); color:#f3f2f8; user-select:none; }
.pv-hidden { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.pv-empty { display:flex; width:100%; height:100%; box-sizing:border-box; flex-direction:column; align-items:center; justify-content:center; overflow:auto; padding:26px 24px; text-align:center; }
.pv-empty-art { position:relative; width:154px; height:112px; margin-bottom:18px; }
.art-shadow { position:absolute; top:12px; left:27px; width:105px; height:80px; transform:rotate(8deg); border:1px solid rgba(255,255,255,.1); border-radius:18px; background:rgba(151,165,208,.18); }
.art-sheet { position:absolute; inset:0 30px 16px 16px; display:flex; flex-direction:column; padding:14px 13px; transform:rotate(-5deg); border:1px solid rgba(255,255,255,.14); border-radius:18px; background:linear-gradient(145deg,#f7f7ff,#dfe5fb); box-shadow:0 16px 38px rgba(0,0,0,.24); }
.art-kicker { color:#7380aa; font-size:5px; font-weight:800; letter-spacing:.13em; }
.art-title { width:76%; height:7px; margin-top:11px; border-radius:6px; background:#404d7c; }
.art-line { width:100%; height:3px; margin-top:6px; border-radius:5px; background:#aeb6d0; }.art-line.medium { width:80%; margin-top:4px; }.art-line.short { width:56%; margin-top:4px; }
.art-chart { display:flex; height:25px; align-items:flex-end; gap:4px; margin-top:auto; }.art-chart i { width:10px; border-radius:4px 4px 1px 1px; background:linear-gradient(#9d8ad5,#6d74b5); }
.art-chart i:nth-child(1){height:45%}.art-chart i:nth-child(2){height:72%}.art-chart i:nth-child(3){height:58%}.art-chart i:nth-child(4){height:94%}
.art-orbit { position:absolute; right:2px; bottom:2px; width:35px; height:35px; border:7px solid #9bb0df; border-right-color:#dacff2; border-radius:50%; box-shadow:0 0 0 7px rgba(155,176,223,.1); }
.pv-eyebrow { display:flex; align-items:center; gap:7px; color:#aeb9dc; font-size:9px; font-weight:800; letter-spacing:.16em; }.pv-eyebrow i { width:6px; height:6px; border-radius:50%; background:#a8b8ef; box-shadow:0 0 0 4px rgba(168,184,239,.12); }
.pv-empty-title { margin-top:9px; color:#f5f4fb; font-size:27px; font-weight:700; letter-spacing:-.045em; }
.pv-empty-sub { max-width:450px; margin-top:8px; color:rgba(226,230,244,.66); font-size:12px; line-height:1.8; }
.pv-dropzone { display:flex; width:min(430px,calc(100vw - 48px)); box-sizing:border-box; flex-direction:column; align-items:center; margin-top:24px; padding:19px 18px 18px; border:1px dashed rgba(183,196,235,.28); border-radius:24px; background:rgba(255,255,255,.045); }
.drop-icon { display:grid; width:42px; height:42px; place-items:center; border-radius:15px; background:rgba(181,194,239,.13); color:#c3cdf2; }.drop-icon svg { width:23px; height:23px; }
.pv-dropzone strong { margin-top:9px; color:#f0eff8; font-size:13px; font-weight:650; }.pv-dropzone > span:not(.drop-icon) { margin-top:3px; color:rgba(222,227,243,.52); font-size:10px; }
.pv-primary { display:inline-flex; min-height:40px; align-items:center; gap:8px; margin-top:14px; padding:0 18px; border:0; border-radius:999px; background:#d9e1ff; color:#17213c; font:750 11px inherit; cursor:pointer; transition:transform .18s ease,background .18s ease; }.pv-primary svg { width:16px; height:16px; }.pv-primary:hover { transform:translateY(-1px); background:#e8ebff; }.pv-primary:active { transform:scale(.98); }
.pv-formats { display:flex; align-items:center; gap:6px; margin-top:13px; color:#aab3cd; }.pv-formats span { padding:3px 7px; border:1px solid rgba(185,197,230,.14); border-radius:7px; background:rgba(255,255,255,.05); font-size:8px; font-weight:700; letter-spacing:.04em; }.pv-formats i { width:3px; height:3px; margin:0 3px; border-radius:50%; background:rgba(200,209,231,.4); }.pv-formats small { color:rgba(221,226,242,.45); font-size:9px; }
.pv-viewer { width:100%; height:100%; }
.pv-loading,.pv-error-layer { position:absolute; inset:0; display:grid; place-items:center; padding:24px; background:rgba(12,15,23,.5); backdrop-filter:blur(14px); }.pv-loading { z-index:30; }.pv-error-layer { z-index:40; }
.pv-loading-card { display:flex; align-items:center; gap:14px; padding:20px 24px; border:1px solid rgba(255,255,255,.12); border-radius:22px; background:rgba(36,43,59,.94); box-shadow:0 18px 55px rgba(0,0,0,.25); }.pv-spin { width:27px; height:27px; border:3px solid rgba(205,214,248,.2); border-top-color:#c5d0ff; border-radius:50%; animation:pv-spin .8s linear infinite; }.pv-loading-card div { display:flex; flex-direction:column; gap:4px; text-align:left; }.pv-loading-card strong { color:#f4f3fb; font-size:13px; }.pv-loading-card small { color:rgba(220,225,242,.56); font-size:10px; }
.pv-error-card { width:min(390px,100%); box-sizing:border-box; padding:25px; border:1px solid rgba(255,255,255,.13); border-radius:28px; background:#282d3c; box-shadow:0 24px 70px rgba(0,0,0,.35); color:#f4f2f8; text-align:left; }.pv-error-symbol { display:grid; width:38px; height:38px; place-items:center; border-radius:14px; background:#593c4b; color:#ffc1c5; font-size:20px; font-weight:800; }.pv-error-card h2 { margin:16px 0 0; font-size:19px; font-weight:700; letter-spacing:-.03em; }.pv-error-card p { margin:8px 0 0; color:rgba(232,230,241,.66); font-size:12px; line-height:1.7; }
.pv-error-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:23px; }.pv-error-actions button { min-height:38px; padding:0 16px; border:0; border-radius:999px; font-size:11px; font-weight:700; cursor:pointer; transition:transform .16s ease,background .16s ease; }.pv-error-secondary { background:rgba(255,255,255,.08); color:#e8e7f2; }.pv-error-secondary:hover { background:rgba(255,255,255,.14); }.pv-error-primary { background:#d9e1ff; color:#17213c; }.pv-error-primary:hover { background:#e8ebff; }.pv-error-actions button:active { transform:scale(.98); }
@keyframes pv-spin { to { transform:rotate(360deg); } }
</style>
