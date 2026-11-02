<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as bridge from './bridge'

// —— 展台（独立应用包）——
// 摄像头画面 / 图片 + 拍照 + 墨迹批注 + 画面拖动缩放，参考希沃视频展台的课堂用法：
// 批注画在与画面同一坐标系的墨迹层上，随画面一起缩放 / 拖动 / 旋转。
// 拍照 / 画笔 / 撤销等主操作注册在壳层底栏（postMessage 桥），设备与笔色在应用内设置条。

const viewportEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const inkEl = ref<HTMLCanvasElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// ── 画面源 ──
const sourceKind = ref<'camera' | 'image' | 'none'>('none')
const baseImageSrc = ref('') // 非空 = 静态照片（拍照 / 打开的图片）
const baseSize = reactive({ w: 1280, h: 720 })
const cameraError = ref('')
const devices = ref<MediaDeviceInfo[]>([])
const deviceId = ref('')
const frozen = ref(false)
let stream: MediaStream | null = null

// ── 摄像头清晰度 ──
type ResolutionId = 'auto' | '480p' | '720p' | '1080p' | '1440p' | '2160p'
interface ResolutionOption {
  id: ResolutionId
  label: string
  width?: number
  height?: number
  fps?: number
}

const resolutionOptions: ResolutionOption[] = [
  { id: 'auto', label: '自动' },
  { id: '480p', label: '480p', width: 854, height: 480, fps: 30 },
  { id: '720p', label: '720p', width: 1280, height: 720, fps: 30 },
  { id: '1080p', label: '1080p', width: 1920, height: 1080, fps: 30 },
  { id: '1440p', label: '1440p', width: 2560, height: 1440, fps: 30 },
  { id: '2160p', label: '4K', width: 3840, height: 2160, fps: 30 }
]
const resolutionId = ref<ResolutionId>('1080p')
const actualResolution = ref('')

// ── 画面变换（拖动 / 缩放 / 旋转 / 镜像）──
const view = reactive({ x: 0, y: 0, scale: 1, rotate: 0, mirror: false })

// ── 墨迹 ──
interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser'
  color: string
  size: number
  points: Array<{ x: number; y: number }>
}
const strokes = ref<Stroke[]>([])
const redoStack = ref<Stroke[]>([])
const tool = ref<'pan' | 'pen' | 'eraser'>('pan')
const brush = reactive({ color: '#e2493c', size: 6 })
const COLORS = ['#e2493c', '#f2b134', '#2fa35e', '#2f7ed8', '#1b2029']
const SIZES = [3, 6, 12]

// ── 滤镜 / 延时 / 相册 ──
const filter = ref<'color' | 'gray' | 'mono' | 'invert' | 'warm'>('color')
const delaySec = ref(0)
const countdown = ref(0)
const captures = ref<Array<{ id: number; url: string }>>([])
let captureInProgress = false
const imageObjectUrls = new Set<string>()

const filterCss = computed(() => {
  switch (filter.value) {
    case 'gray':
      return 'grayscale(1)'
    case 'mono':
      return 'grayscale(1) contrast(1.35) brightness(1.05)'
    case 'invert':
      return 'invert(1)'
    case 'warm':
      return 'sepia(0.45) saturate(1.35) brightness(1.05)'
    default:
      return 'none'
  }
})

const contentStyle = computed(() => ({
  width: `${baseSize.w}px`,
  height: `${baseSize.h}px`,
  transform:
    `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) ` +
    `scale(${view.scale}) rotate(${view.rotate}deg) scaleX(${view.mirror ? -1 : 1})`
}))

// ── 底栏操作（壳层渲染，postMessage 桥）──
function pushActions(): void {
  bridge.setActions({
    left: [
      {
        id: 'status',
        label: baseImageSrc.value
          ? '照片'
          : sourceKind.value === 'camera'
            ? frozen.value
              ? '已冻结'
              : '预览中'
            : '无画面',
        icon: 'camera',
        info: true
      },
      { id: 'open-image', label: '打开图片', icon: 'folder' },
      { id: 'capture', label: '拍照', icon: 'camera' }
    ],
    right: [
      { id: 'tool-pen', label: '画笔', icon: 'pen', active: tool.value === 'pen' },
      { id: 'tool-eraser', label: '橡皮', icon: 'eraser', active: tool.value === 'eraser' },
      {
        id: 'undo',
        label: '撤销',
        icon: 'undo',
        disabled: strokes.value.length === 0
      },
      {
        id: 'clear-ink',
        label: '清墨',
        icon: 'trash',
        disabled: strokes.value.length === 0
      },
      { id: 'fit', label: '适应', icon: 'fit' },
      { id: 'rotate', label: '旋转', icon: 'rotate' },
      { id: 'download', label: '下载', icon: 'download', disabled: sourceKind.value === 'none' }
    ]
  })
}

watch(
  [strokes, tool, frozen, sourceKind, baseImageSrc],
  () => pushActions(),
  { immediate: true }
)

bridge.onInvoke((id) => {
  switch (id) {
    case 'open-image':
      fileInput.value?.click()
      break
    case 'capture':
      void capture()
      break
    case 'tool-pen':
      tool.value = tool.value === 'pen' ? 'pan' : 'pen'
      break
    case 'tool-eraser':
      tool.value = tool.value === 'eraser' ? 'pan' : 'eraser'
      break
    case 'undo':
      undo()
      break
    case 'clear-ink':
      strokes.value = []
      redoStack.value = []
      redrawInk()
      break
    case 'fit':
      fit()
      break
    case 'rotate':
      view.rotate = (view.rotate + 90) % 360
      break
    case 'download':
      download()
      break
  }
})

// ── 摄像头 ──
async function startCamera(id?: string): Promise<void> {
  cameraError.value = ''
  try {
    stopStream()
    const resolution = resolutionOptions.find((item) => item.id === resolutionId.value)
    const videoConstraints: MediaTrackConstraints = {}
    if (id) videoConstraints.deviceId = { exact: id }
    if (resolution?.width && resolution.height) {
      videoConstraints.width = { ideal: resolution.width }
      videoConstraints.height = { ideal: resolution.height }
      videoConstraints.frameRate = { ideal: resolution.fps ?? 30, max: 60 }
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints
    })
    const video = videoEl.value
    if (!video) return
    video.srcObject = stream
    await video.play()
    baseSize.w = video.videoWidth || 1280
    baseSize.h = video.videoHeight || 720
    actualResolution.value = `${baseSize.w}×${baseSize.h}`
    baseImageSrc.value = ''
    frozen.value = false
    sourceKind.value = 'camera'
    redrawInk()
    fit()
    devices.value = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'videoinput'
    )
  } catch (err) {
    sourceKind.value = 'none'
    actualResolution.value = ''
    cameraError.value = `摄像头不可用：${(err as Error).message}`
  }
}

function stopStream(): void {
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

function toggleFreeze(): void {
  const video = videoEl.value
  if (!video || sourceKind.value !== 'camera') return
  frozen.value = !frozen.value
  if (frozen.value) video.pause()
  else void video.play()
  pushActions()
}

// ── 打开图片 / 拍照 / 下载 ──
function onPickImage(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const url = URL.createObjectURL(file)
  imageObjectUrls.add(url)
  const img = new Image()
  img.onload = () => {
    const previous = baseImageSrc.value
    if (previous.startsWith('blob:') && previous !== url && imageObjectUrls.has(previous)) {
      URL.revokeObjectURL(previous)
      imageObjectUrls.delete(previous)
    }
    baseSize.w = img.naturalWidth || 1280
    baseSize.h = img.naturalHeight || 720
    sourceKind.value = 'image'
    baseImageSrc.value = url
    strokes.value = []
    redoStack.value = []
    redrawInk()
    fit()
    pushActions()
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    imageObjectUrls.delete(url)
    cameraError.value = '图片读取失败，请尝试其他图片'
  }
  img.src = url
}

function currentDrawable(): CanvasImageSource | null {
  if (baseImageSrc.value) {
    const img = contentEl.value?.querySelector('img')
    return img ?? null
  }
  return videoEl.value ?? null
}

function compose(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = baseSize.w
  canvas.height = baseSize.h
  const ctx = canvas.getContext('2d')!
  ctx.filter = filterCss.value
  const src = currentDrawable()
  if (src) ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'
  if (inkEl.value) ctx.drawImage(inkEl.value, 0, 0)
  return canvas
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

async function capture(): Promise<void> {
  if (sourceKind.value === 'none' || captureInProgress) return
  captureInProgress = true
  try {
    const wait = delaySec.value
    if (wait > 0) {
      for (let i = wait; i > 0; i--) {
        countdown.value = i
        await sleep(1000)
        if (sourceKind.value === 'none') return
      }
    }
    countdown.value = 0
    const url = compose().toDataURL('image/png')
    captures.value.unshift({ id: Date.now(), url })
    if (captures.value.length > 24) captures.value.pop()
    // 拍完进入照片态：墨迹已经烤进照片，可以继续批注
    baseImageSrc.value = url
    strokes.value = []
    redoStack.value = []
    redrawInk()
    pushActions()
  } finally {
    countdown.value = 0
    captureInProgress = false
  }
}

function resumePreview(): void {
  baseImageSrc.value = ''
  sourceKind.value = stream ? 'camera' : 'none'
  strokes.value = []
  redoStack.value = []
  redrawInk()
  if (sourceKind.value === 'camera' && videoEl.value) {
    frozen.value = false
    void videoEl.value.play()
  } else if (!stream) {
    sourceKind.value = 'none'
  }
  fit()
  pushActions()
}

function openCapture(url: string): void {
  baseImageSrc.value = url
  strokes.value = []
  redoStack.value = []
  redrawInk()
  fit()
  pushActions()
}

function download(): void {
  compose().toBlob((blob) => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const t = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    a.download = `展台-${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }, 'image/png')
}

// ── 墨迹 ──
function inkCtx(): CanvasRenderingContext2D | null {
  return inkEl.value?.getContext('2d') ?? null
}

function strokeStyle(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = s.size * 3
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = s.tool === 'highlighter' ? 0.35 : 1
    ctx.strokeStyle = s.color
    ctx.fillStyle = s.color
    ctx.lineWidth = s.tool === 'highlighter' ? s.size * 2.5 : s.size
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length === 0) return
  strokeStyle(ctx, s)
  if (s.points.length === 1) {
    const p = s.points[0]
    ctx.beginPath()
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.beginPath()
  ctx.moveTo(s.points[0].x, s.points[0].y)
  for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
  ctx.stroke()
}

function redrawInk(): void {
  const ctx = inkCtx()
  const canvas = inkEl.value
  if (!ctx || !canvas) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
  for (const s of strokes.value) drawStroke(ctx, s)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
}

function undo(): void {
  const s = strokes.value.pop()
  if (s) redoStack.value.push(s)
  redrawInk()
  pushActions()
}

// ── 指针交互：拖动 / 双指缩放 / 画墨 ──
interface DragState {
  mode: 'pan' | 'draw' | 'pinch'
  lastX: number
  lastY: number
  stroke: Stroke | null
}
const drag = reactive<DragState>({ mode: 'pan', lastX: 0, lastY: 0, stroke: null })
const pointers = new Map<number, { x: number; y: number }>()

function clientToBase(e: PointerEvent): { x: number; y: number } {
  const wrap = contentEl.value
  if (!wrap) return { x: 0, y: 0 }
  const rect = wrap.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = e.clientX - cx
  const dy = e.clientY - cy
  const r = (-view.rotate * Math.PI) / 180
  let lx = (dx * Math.cos(r) - dy * Math.sin(r)) / view.scale
  const ly = (dx * Math.sin(r) + dy * Math.cos(r)) / view.scale
  if (view.mirror) lx = -lx
  return { x: lx + baseSize.w / 2, y: ly + baseSize.h / 2 }
}

function pinchMetrics(): { distance: number; centerX: number; centerY: number } | null {
  if (pointers.size < 2) return null
  const [a, b] = [...pointers.values()].slice(0, 2)
  const dx = b.x - a.x
  const dy = b.y - a.y
  return {
    distance: Math.hypot(dx, dy),
    centerX: (a.x + b.x) / 2,
    centerY: (a.y + b.y) / 2
  }
}

function zoomAt(clientX: number, clientY: number, factor: number): void {
  const viewport = viewportEl.value
  if (!viewport) return
  const rect = viewport.getBoundingClientRect()
  const ox = rect.left + rect.width / 2
  const oy = rect.top + rect.height / 2
  const dx = clientX - ox - view.x
  const dy = clientY - oy - view.y
  const next = Math.min(20, Math.max(0.1, view.scale * factor))
  const k = next / view.scale
  view.x += dx * (1 - k)
  view.y += dy * (1 - k)
  view.scale = next
}

function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const stage = stageEl.value
  if (!stage) return
  e.preventDefault()
  stage.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size >= 2) {
    // 从批注/单指拖动平滑切换到双指手势，不让第二根手指误画一笔。
    if (drag.stroke) {
      const index = strokes.value.indexOf(drag.stroke)
      if (index >= 0) strokes.value.splice(index, 1)
      drag.stroke = null
      redrawInk()
    }
    drag.mode = 'pinch'
    return
  }

  drag.lastX = e.clientX
  drag.lastY = e.clientY
  if (tool.value === 'pan' || sourceKind.value === 'none') {
    drag.mode = 'pan'
    return
  }
  drag.mode = 'draw'
  const stroke: Stroke = {
    tool: tool.value === 'eraser' ? 'eraser' : 'pen',
    color: brush.color,
    size: brush.size,
    points: [clientToBase(e)]
  }
  drag.stroke = stroke
  strokes.value.push(stroke)
  redoStack.value = []
  const ctx = inkCtx()
  if (ctx) drawStroke(ctx, stroke)
}

function onPointerMove(e: PointerEvent): void {
  if (!pointers.has(e.pointerId)) return
  e.preventDefault()
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size >= 2 || drag.mode === 'pinch') {
    const metrics = pinchMetrics()
    if (!metrics) return
    const viewport = viewportEl.value
    if (!viewport) return
    const previousCenterX = drag.lastX
    const previousCenterY = drag.lastY
    const previousDistance = Math.max(1, drag.lastY === 0 ? metrics.distance : drag.lastY)
    // lastX / lastY 在 pinch 模式下分别存上一次中心 X / 距离。
    const previousPinchCenterX = previousCenterX
    const previousPinchCenterY = drag.lastY === 0 ? metrics.centerY : drag.lastY
    const factor = metrics.distance / previousDistance
    if (drag.mode === 'pinch' && previousDistance > 1) {
      zoomAt(metrics.centerX, metrics.centerY, factor)
      view.x += metrics.centerX - previousPinchCenterX
      view.y += metrics.centerY - previousPinchCenterY
    }
    drag.lastX = metrics.centerX
    drag.lastY = metrics.distance
    ;(drag as DragState & { pinchCenterY?: number }).pinchCenterY = metrics.centerY
    return
  }

  if (drag.mode === 'pan') {
    if (e.pointerId !== [...pointers.keys()][0]) return
    view.x += e.clientX - drag.lastX
    view.y += e.clientY - drag.lastY
    drag.lastX = e.clientX
    drag.lastY = e.clientY
    return
  }
  const stroke = drag.stroke
  if (!stroke) return
  stroke.points.push(clientToBase(e))
  const ctx = inkCtx()
  if (ctx) drawStroke(ctx, stroke)
}

function onPointerUp(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  try {
    stageEl.value?.releasePointerCapture(e.pointerId)
  } catch {
    // pointer capture may already have been released by the browser
  }

  if (pointers.size === 0) {
    drag.stroke = null
    drag.mode = 'pan'
    drag.lastX = 0
    drag.lastY = 0
    pushActions()
    return
  }

  if (pointers.size === 1) {
    const remaining = [...pointers.values()][0]
    drag.mode = 'pan'
    drag.lastX = remaining.x
    drag.lastY = remaining.y
  }
}

function onPointerCancel(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  drag.stroke = null
  drag.mode = pointers.size ? 'pan' : 'pan'
  if (pointers.size === 1) {
    const remaining = [...pointers.values()][0]
    drag.lastX = remaining.x
    drag.lastY = remaining.y
  }
  pushActions()
}

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1)
}

function fit(): void {
  const viewport = viewportEl.value
  if (!viewport) return
  view.scale = Math.min(
    viewport.clientWidth / (baseSize.w || 1),
    viewport.clientHeight / (baseSize.h || 1)
  )
  view.x = 0
  view.y = 0
}

// ── 生命周期 ──
onMounted(() => {
  void startCamera()
  requestAnimationFrame(fit)
})

onBeforeUnmount(() => {
  stopStream()
  for (const url of imageObjectUrls) URL.revokeObjectURL(url)
  imageObjectUrls.clear()
  pointers.clear()
})

watch(deviceId, (id) => {
  if (sourceKind.value === 'camera' || id) void startCamera(id || undefined)
})

watch(resolutionId, () => {
  if (sourceKind.value === 'camera') void startCamera(deviceId.value || undefined)
})

watch([tool, brush], () => {
  document.body.dataset.tool = tool.value
})
</script>

<template>
  <div
    ref="viewportEl"
    class="dc-root"
    :class="tool === 'pan' ? 'dc-tool-pan' : 'dc-tool-draw'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @wheel="onWheel"
  >
    <div ref="stageEl" class="dc-stage">
      <div ref="contentEl" class="dc-content" :style="contentStyle">
        <video
          v-show="!baseImageSrc && sourceKind === 'camera'"
          ref="videoEl"
          class="dc-media"
          muted
          playsinline
        ></video>
        <img v-if="baseImageSrc" class="dc-media" :src="baseImageSrc" alt="" />
        <canvas
          ref="inkEl"
          class="dc-ink"
          :width="baseSize.w"
          :height="baseSize.h"
        ></canvas>
      </div>
    </div>

    <div class="dc-panel" role="toolbar" aria-label="展台画面设置">
      <div class="dc-panel-brand">
        <span class="dc-brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="6" width="18" height="13" rx="3"/>
            <circle cx="12" cy="12.5" r="3.5"/>
            <path d="M8 6l1.2-2h5.6L16 6"/>
          </svg>
        </span>
        <span class="dc-brand-copy"><strong>展台</strong><small>CLASSDESK DOC CAM</small></span>
      </div>

      <span class="dc-sep"></span>

      <div class="dc-control-group">
        <span class="dc-group-label">设备</span>
        <select v-model="deviceId" class="dc-select" title="摄像头">
          <option value="">默认摄像头</option>
          <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
            {{ d.label || '摄像头' }}
          </option>
        </select>
      </div>

      <div class="dc-control-group">
        <span class="dc-group-label">清晰度</span>
        <select v-model="resolutionId" class="dc-select" title="摄像头清晰度">
          <option v-for="item in resolutionOptions" :key="item.id" :value="item.id">
            {{ item.label }}
          </option>
        </select>
        <span v-if="actualResolution" class="dc-resolution" title="摄像头实际输出分辨率">
          {{ actualResolution }}
        </span>
      </div>

      <div class="dc-control-group">
        <span class="dc-group-label">拍摄</span>
        <select v-model="delaySec" class="dc-select" title="延时拍照">
          <option :value="0">立即拍照</option>
          <option :value="3">延时 3 秒</option>
          <option :value="5">延时 5 秒</option>
          <option :value="10">延时 10 秒</option>
        </select>
        <select v-model="filter" class="dc-select" title="画面效果">
          <option value="color">彩色</option>
          <option value="gray">灰度</option>
          <option value="mono">黑白</option>
          <option value="invert">负片</option>
          <option value="warm">暖色</option>
        </select>
      </div>

      <span class="dc-sep"></span>

      <div class="dc-control-group dc-tool-group">
        <span class="dc-group-label">批注</span>
        <span class="dc-swatches">
          <button
            v-for="c in COLORS"
            :key="c"
            class="dc-swatch"
            :class="brush.color === c ? 'is-on' : ''"
            :style="{ background: c }"
            :title="'笔色 ' + c"
            type="button"
            @click="brush.color = c"
          ></button>
        </span>
        <span class="dc-swatches">
          <button
            v-for="s in SIZES"
            :key="s"
            class="dc-size"
            :class="brush.size === s ? 'is-on' : ''"
            :title="'粗细 ' + s"
            type="button"
            @click="brush.size = s"
          >
            <span class="dc-size-dot" :style="{ width: s + 4 + 'px', height: s + 4 + 'px' }"></span>
          </button>
        </span>
      </div>

      <span class="dc-sep"></span>

      <div class="dc-control-group dc-view-group">
        <button
          class="dc-btn"
          :class="view.mirror ? 'is-on' : ''"
          type="button"
          @click="view.mirror = !view.mirror"
        >镜像</button>
        <button
          class="dc-btn"
          :class="frozen ? 'is-on' : ''"
          type="button"
          :disabled="sourceKind !== 'camera' || !!baseImageSrc"
          @click="toggleFreeze"
        >{{ frozen ? '恢复画面' : '冻结画面' }}</button>
        <button v-if="baseImageSrc" class="dc-btn dc-resume-btn" type="button" @click="resumePreview">
          继续预览
        </button>
      </div>
    </div>

    <div v-if="sourceKind === 'none'" class="dc-empty">
      <section class="dc-empty-card">
        <div class="dc-empty-art">
          <span class="dc-art-back"></span>
          <span class="dc-art-front">
            <i></i><i></i><i></i>
            <b></b>
          </span>
          <span class="dc-art-lens"></span>
        </div>
        <span class="dc-empty-kicker"><i></i> CLASSDESK DOCUMENT CAMERA</span>
        <h1 class="dc-empty-title">{{ cameraError ? '设备暂不可用' : '准备好开始展示' }}</h1>
        <p class="dc-empty-sub">
          {{ cameraError || '连接实物展台或摄像头，也可以打开图片进行批注与讲解。' }}
        </p>
        <div class="dc-empty-actions">
          <button class="dc-primary" type="button" @click="startCamera()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="6" width="18" height="13" rx="3"/>
              <circle cx="12" cy="12.5" r="3.5"/>
              <path d="M8 6l1.2-2h5.6L16 6"/>
            </svg>
            打开摄像头
          </button>
          <button class="dc-ghost" type="button" @click="fileInput?.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3.5 7.5h6l2 2h9v9.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/>
              <path d="M12 12v5m-2-2 2 2 2-2"/>
            </svg>
            打开图片
          </button>
        </div>
        <div class="dc-empty-foot"><span>实时画面</span><i></i><span>拍照存档</span><i></i><span>墨迹批注</span></div>
      </section>
    </div>

    <div v-if="countdown > 0" class="dc-count">
      <div class="dc-count-card"><strong>{{ countdown }}</strong><span>即将拍摄</span></div>
    </div>

    <div v-if="captures.length" class="dc-gallery">
      <div class="dc-gallery-head"><strong>最近拍摄</strong><span>{{ captures.length }} 张</span></div>
      <div class="dc-gallery-strip">
        <button
          v-for="c in captures"
          :key="c.id"
          class="dc-thumb"
          type="button"
          title="查看这张"
          @click="openCapture(c.url)"
        >
          <img :src="c.url" alt="" />
        </button>
      </div>
    </div>

    <input ref="fileInput" class="dc-hidden" type="file" accept="image/*" @change="onPickImage" />
  </div>
</template>

<style scoped>
.dc-root { position:absolute; inset:0; overflow:hidden; background:#10141b; user-select:none; touch-action:none; }
.dc-tool-pan { cursor:grab; }.dc-tool-draw { cursor:crosshair; }
.dc-stage { position:absolute; inset:0; overflow:hidden; }
.dc-content { position:absolute; left:50%; top:50%; transform-origin:center center; background:#000; }
.dc-media { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; filter:v-bind(filterCss); }
.dc-ink { position:absolute; inset:0; width:100%; height:100%; }
.dc-hidden { display:none; }

.dc-panel {
  position:absolute; top:14px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:13px;
  max-width:calc(100% - 28px); overflow-x:auto; padding:10px 14px; border:1px solid rgba(211,220,255,.13);
  border-radius:22px; background:rgba(22,27,38,.82) !important; color:#e8ecf3; white-space:nowrap;
  box-shadow:0 14px 40px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.06);
  backdrop-filter:blur(24px) saturate(1.35) !important; -webkit-backdrop-filter:blur(24px) saturate(1.35) !important;
  scrollbar-width:none;
}
.dc-panel::-webkit-scrollbar { display:none; }
.dc-panel-brand { display:flex; flex:0 0 auto; align-items:center; gap:9px; padding-right:2px; }
.dc-brand-icon { display:grid; width:36px; height:36px; place-items:center; border-radius:13px; background:#dce4ff; color:#293b69; }
.dc-brand-icon svg { width:19px; height:19px; }
.dc-brand-copy { display:flex; flex-direction:column; gap:1px; }
.dc-brand-copy strong { color:#f3f4fb; font-size:12px; font-weight:750; }
.dc-brand-copy small { color:rgba(221,228,248,.46); font-size:7px; font-weight:750; letter-spacing:.12em; }
.dc-control-group { display:flex; flex:0 0 auto; align-items:center; gap:6px; }
.dc-group-label { margin-right:2px; color:rgba(210,219,244,.46); font-size:9px; font-weight:700; }
.dc-select {
  height:32px; max-width:150px; padding:0 10px; border:1px solid rgba(255,255,255,.13); border-radius:11px;
  background:rgba(255,255,255,.065); color:#e8ecf3; font-size:11px; outline:none;
  transition:border-color .16s ease,background .16s ease,box-shadow .16s ease;
}
.dc-select:hover { border-color:rgba(177,194,255,.48); background:rgba(255,255,255,.1); }
.dc-select:focus-visible,.dc-btn:focus-visible,.dc-primary:focus-visible,.dc-ghost:focus-visible,.dc-swatch:focus-visible,.dc-size:focus-visible,.dc-thumb:focus-visible { outline:2px solid #afc2ff; outline-offset:2px; }
.dc-select option { color:#222; }
.dc-resolution { min-width:64px; color:rgba(232,236,243,.5); font-size:9px; font-variant-numeric:tabular-nums; text-align:center; }
.dc-sep { width:1px; height:25px; flex:0 0 auto; background:rgba(255,255,255,.14); }
.dc-swatches { display:flex; align-items:center; gap:5px; }
.dc-swatch { width:18px; height:18px; border:2px solid rgba(255,255,255,.24); border-radius:50%; box-shadow:0 2px 5px rgba(0,0,0,.2); transition:transform .16s ease,box-shadow .16s ease; }
.dc-swatch:hover { transform:scale(1.1); }
.dc-swatch.is-on { border-color:#fff; box-shadow:0 0 0 2px rgba(174,193,255,.66),0 0 14px rgba(124,156,255,.2); transform:scale(1.08); }
.dc-size { display:grid; width:25px; height:25px; place-items:center; border-radius:9px; background:rgba(255,255,255,.07); }
.dc-size:hover { background:rgba(255,255,255,.13); }
.dc-size.is-on { background:rgba(174,193,255,.2); box-shadow:inset 0 0 0 1px rgba(174,193,255,.48); }
.dc-size-dot { display:block; border-radius:50%; background:#e8ecf3; }
.dc-btn { height:32px; padding:0 11px; border:1px solid transparent; border-radius:999px; background:rgba(255,255,255,.075); color:#e8ecf3; font-size:10px; font-weight:650; transition:background .16s ease,transform .16s ease,border-color .16s ease; }
.dc-btn:hover:not(:disabled) { transform:translateY(-1px); background:rgba(255,255,255,.14); }
.dc-btn.is-on { border-color:rgba(174,193,255,.42); background:rgba(174,193,255,.18); color:#e7edff; }
.dc-btn:disabled { cursor:default; opacity:.35; }
.dc-resume-btn { background:#dce4ff; color:#24345d; }

.dc-empty {
  position:absolute; inset:0; display:grid; place-items:center; padding:24px;
  background:radial-gradient(ellipse at 50% 38%,rgba(89,111,177,.22),transparent 48%),rgba(12,16,23,.94) !important;
  backdrop-filter:blur(12px);
}
.dc-empty-card {
  display:flex; width:min(500px,100%); box-sizing:border-box; flex-direction:column; align-items:center;
  padding:32px 34px 26px; border:1px solid rgba(213,222,255,.14); border-radius:34px;
  background:linear-gradient(145deg,rgba(39,47,66,.96),rgba(28,34,49,.96));
  box-shadow:0 28px 80px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.055); text-align:center;
}
.dc-empty-art { position:relative; width:114px; height:90px; margin-bottom:18px; }
.dc-art-back { position:absolute; top:10px; left:22px; width:74px; height:60px; transform:rotate(9deg); border:1px solid rgba(255,255,255,.12); border-radius:17px; background:rgba(173,190,243,.13); }
.dc-art-front { position:absolute; top:0; left:10px; display:flex; width:78px; height:62px; flex-direction:column; gap:6px; padding:12px; transform:rotate(-5deg); border:1px solid rgba(255,255,255,.16); border-radius:17px; background:linear-gradient(145deg,#f4f5ff,#dce4fb); box-shadow:0 12px 24px rgba(0,0,0,.25); }
.dc-art-front i { width:72%; height:4px; border-radius:5px; background:#9ba9d0; }.dc-art-front i:nth-child(2){width:88%}.dc-art-front i:nth-child(3){width:54%}
.dc-art-front b { width:18px; height:18px; margin-top:auto; align-self:flex-end; border:4px solid #778ecb; border-radius:50%; }
.dc-art-lens { position:absolute; right:0; bottom:2px; width:30px; height:30px; border:6px solid #a9baff; border-right-color:#e1d6ff; border-radius:50%; box-shadow:0 0 0 7px rgba(169,186,255,.1); }
.dc-empty-kicker { display:flex; align-items:center; gap:7px; color:#b6c4ee; font-size:8px; font-weight:800; letter-spacing:.16em; }
.dc-empty-kicker i { width:6px; height:6px; border-radius:50%; background:#aabdff; box-shadow:0 0 0 4px rgba(170,189,255,.12); }
.dc-empty-title { margin-top:10px; color:#f4f4fb; font-size:23px; font-weight:750; letter-spacing:-.04em; }
.dc-empty-sub { max-width:380px; margin-top:8px; color:rgba(228,232,246,.62) !important; font-size:11px; line-height:1.85; }
.dc-empty-actions { display:flex; flex-wrap:wrap; justify-content:center; gap:9px; margin-top:22px; }
.dc-empty-actions button { display:inline-flex; min-height:42px; align-items:center; justify-content:center; gap:8px; padding:0 17px; border-radius:999px; font-size:11px; font-weight:750; transition:transform .16s ease,background .16s ease,box-shadow .16s ease; }
.dc-empty-actions svg { width:16px; height:16px; }
.dc-empty-actions button:active { transform:scale(.98); }
.dc-primary { background:#dce4ff !important; color:#192541 !important; box-shadow:0 6px 18px rgba(124,156,255,.17); }
.dc-primary:hover { transform:translateY(-1px); background:#edf0ff !important; box-shadow:0 9px 24px rgba(124,156,255,.23); }
.dc-ghost { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.07); color:#eceefa; }
.dc-ghost:hover { transform:translateY(-1px); background:rgba(255,255,255,.13); }
.dc-empty-foot { display:flex; align-items:center; gap:8px; margin-top:20px; color:rgba(222,228,247,.42); font-size:9px; }
.dc-empty-foot i { width:3px; height:3px; border-radius:50%; background:rgba(193,205,240,.36); }

.dc-count { position:absolute; inset:0; display:grid; place-items:center; background:rgba(10,13,20,.38); backdrop-filter:blur(4px); pointer-events:none; }
.dc-count-card { display:flex; width:136px; height:136px; flex-direction:column; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.18); border-radius:42px; background:rgba(31,39,57,.82); box-shadow:0 20px 60px rgba(0,0,0,.32); }
.dc-count-card strong { color:#f5f5ff; font-size:64px; font-weight:750; line-height:1; font-variant-numeric:tabular-nums; }
.dc-count-card span { margin-top:8px; color:rgba(225,231,249,.62); font-size:10px; }

.dc-gallery {
  position:absolute; right:14px; bottom:14px; display:flex; max-width:min(60%,560px); flex-direction:column; gap:8px;
  padding:10px; border:1px solid rgba(255,255,255,.13); border-radius:18px;
  background:rgba(22,27,38,.78) !important; box-shadow:0 12px 36px rgba(0,0,0,.28);
  backdrop-filter:blur(22px) saturate(1.3) !important; -webkit-backdrop-filter:blur(22px) saturate(1.3) !important;
}
.dc-gallery-head { display:flex; align-items:center; justify-content:space-between; padding:0 2px; color:#edf0fa; }
.dc-gallery-head strong { font-size:10px; font-weight:700; }.dc-gallery-head span { color:rgba(222,228,245,.46); font-size:9px; }
.dc-gallery-strip { display:flex; gap:7px; max-width:100%; overflow-x:auto; scrollbar-width:none; }
.dc-gallery-strip::-webkit-scrollbar { display:none; }
.dc-thumb { width:76px; height:52px; flex:none; overflow:hidden; border:1px solid rgba(255,255,255,.18); border-radius:10px; background:#0b0e14; transition:transform .16s ease,border-color .16s ease; }
.dc-thumb img { width:100%; height:100%; object-fit:cover; }.dc-thumb:hover { transform:translateY(-2px); border-color:rgba(174,193,255,.76); }

@media (max-width: 760px) {
  .dc-panel { left:10px !important; right:10px; top:10px !important; transform:none !important; max-width:none; justify-content:flex-start; }
  .dc-gallery { max-width:calc(100% - 40px); right:10px; bottom:10px; }
  .dc-empty-card { padding:25px 20px 20px; }
}
@media (prefers-reduced-motion: reduce) {
  .dc-panel *, .dc-gallery *, .dc-empty-actions button, .dc-thumb { transition:none !important; animation:none !important; }
}
</style>
