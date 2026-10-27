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
    stream = await navigator.mediaDevices.getUserMedia({
      video: id ? { deviceId: { exact: id } } : true
    })
    const video = videoEl.value
    if (!video) return
    video.srcObject = stream
    await video.play()
    baseSize.w = video.videoWidth || 1280
    baseSize.h = video.videoHeight || 720
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
  const img = new Image()
  img.onload = () => {
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
  if (sourceKind.value === 'none') return
  const wait = delaySec.value
  if (wait > 0) {
    for (let i = wait; i > 0; i--) {
      countdown.value = i
      await sleep(1000)
    }
    countdown.value = 0
  }
  const url = compose().toDataURL('image/png')
  captures.value.unshift({ id: Date.now(), url })
  if (captures.value.length > 24) captures.value.pop()
  // 拍完进入照片态：墨迹已经烤进照片，可以继续批注
  baseImageSrc.value = url
  strokes.value = []
  redoStack.value = []
  redrawInk()
  pushActions()
}

function resumePreview(): void {
  baseImageSrc.value = ''
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

// ── 指针交互：拖动 / 画墨 ──
interface DragState {
  mode: 'pan' | 'draw'
  lastX: number
  lastY: number
  stroke: Stroke | null
}
const drag = reactive<DragState>({ mode: 'pan', lastX: 0, lastY: 0, stroke: null })

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

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  const stage = stageEl.value
  if (!stage) return
  stage.setPointerCapture(e.pointerId)
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
  if (drag.mode === 'pan') {
    if (!(e.buttons & 1)) return
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

function onPointerUp(): void {
  drag.stroke = null
  pushActions()
}

function onWheel(e: WheelEvent): void {
  e.preventDefault()
  const viewport = viewportEl.value
  if (!viewport) return
  const rect = viewport.getBoundingClientRect()
  const ox = rect.left + rect.width / 2
  const oy = rect.top + rect.height / 2
  const dx = e.clientX - ox - view.x
  const dy = e.clientY - oy - view.y
  const next = Math.min(20, Math.max(0.1, view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
  const k = next / view.scale
  view.x += dx * (1 - k)
  view.y += dy * (1 - k)
  view.scale = next
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
})

watch(deviceId, (id) => {
  if (id && sourceKind.value === 'camera') void startCamera(id)
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
    @pointercancel="onPointerUp"
    @wheel="onWheel"
  >
    <!-- 画面 + 墨迹（同一坐标系，一起缩放 / 拖动 / 旋转） -->
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

    <!-- 设置条：设备 / 延时 / 滤镜 / 笔 / 镜像 / 冻结 -->
    <div class="dc-panel">
      <select v-model="deviceId" class="dc-select" title="摄像头">
        <option value="">默认摄像头</option>
        <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
          {{ d.label || '摄像头' }}
        </option>
      </select>
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

      <span class="dc-sep"></span>

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

      <span class="dc-sep"></span>

      <button
        class="dc-btn"
        :class="view.mirror ? 'is-on' : ''"
        type="button"
        @click="view.mirror = !view.mirror"
      >
        镜像
      </button>
      <button
        class="dc-btn"
        :class="frozen ? 'is-on' : ''"
        type="button"
        :disabled="sourceKind !== 'camera' || !!baseImageSrc"
        @click="toggleFreeze"
      >
        冻结
      </button>
      <button v-if="baseImageSrc" class="dc-btn" type="button" @click="resumePreview">
        继续预览
      </button>
    </div>

    <!-- 无画面：开摄像头 / 打开图片 -->
    <div v-if="sourceKind === 'none'" class="dc-empty">
      <div class="dc-empty-title">{{ cameraError || '没有画面' }}</div>
      <div class="dc-empty-sub">可以接上展台 / 摄像头，或者打开一张图片来批注</div>
      <div class="dc-empty-actions">
        <button class="dc-primary" type="button" @click="startCamera()">打开摄像头</button>
        <button class="dc-ghost" type="button" @click="fileInput?.click()">打开图片</button>
      </div>
    </div>

    <!-- 延时拍照倒计时 -->
    <div v-if="countdown > 0" class="dc-count">{{ countdown }}</div>

    <!-- 相册 -->
    <div v-if="captures.length" class="dc-gallery">
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

    <input ref="fileInput" class="dc-hidden" type="file" accept="image/*" @change="onPickImage" />
  </div>
</template>

<style scoped>
.dc-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #10141b;
  user-select: none;
  touch-action: none;
}

.dc-tool-pan {
  cursor: grab;
}

.dc-tool-draw {
  cursor: crosshair;
}

.dc-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.dc-content {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  background: #000;
}

.dc-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  filter: v-bind(filterCss);
}

.dc-ink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.dc-hidden {
  display: none;
}

/* 设置条 */
.dc-panel {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(18, 21, 27, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #e8ecf3;
  font-size: 12px;
  white-space: nowrap;
}

.dc-select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #e8ecf3;
  font-size: 12px;
  outline: none;
}

.dc-select option {
  color: #222;
}

.dc-sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.18);
}

.dc-swatches {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dc-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
}

.dc-swatch.is-on {
  border-color: #fff;
  transform: scale(1.12);
}

.dc-size {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
}

.dc-size.is-on {
  background: rgba(255, 255, 255, 0.28);
}

.dc-size-dot {
  border-radius: 50%;
  background: #e8ecf3;
}

.dc-btn {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
}

.dc-btn.is-on {
  background: rgba(255, 255, 255, 0.3);
}

/* 空态 */
.dc-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(16, 20, 27, 0.92);
}

.dc-empty-title {
  font-size: 18px;
  font-weight: 500;
}

.dc-empty-sub {
  font-size: 13px;
  color: rgba(232, 236, 243, 0.6);
}

.dc-empty-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.dc-primary {
  height: 42px;
  padding: 0 28px;
  border-radius: 999px;
  background: #fff;
  color: #1b2029;
  font-size: 14px;
  font-weight: 500;
}

.dc-ghost {
  height: 42px;
  padding: 0 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 14px;
}

/* 倒计时 */
.dc-count {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 120px;
  font-weight: 600;
  color: #fff;
  background: rgba(16, 20, 27, 0.45);
  pointer-events: none;
}

/* 相册 */
.dc-gallery {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 8px;
  padding: 8px;
  max-width: 60%;
  overflow-x: auto;
  border-radius: 12px;
  background: rgba(18, 21, 27, 0.66);
}

.dc-thumb {
  width: 72px;
  height: 48px;
  flex: none;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dc-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
