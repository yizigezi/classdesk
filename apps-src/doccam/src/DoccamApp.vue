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
interface InkPoint {
  x: number
  y: number
  width: number
}
interface Stroke {
  tool: 'pen' | 'highlighter' | 'eraser'
  color: string
  size: number
  points: InkPoint[]
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

function redrawInk(): void {
  const ctx = inkCtx()
  const canvas = inkEl.value
  if (!ctx || !canvas) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
  for (const s of strokes.value) drawVariableStroke(ctx, s)
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
  lastTime: number
  lastBaseX: number
  lastBaseY: number
  lastWidth: number
}
interface PinchState {
  active: boolean
  distance: number
  centerX: number
  centerY: number
}

const drag = reactive<DragState>({
  mode: 'pan',
  lastX: 0,
  lastY: 0,
  stroke: null,
  lastTime: 0,
  lastBaseX: 0,
  lastBaseY: 0,
  lastWidth: brush.size
})
const pinch = reactive<PinchState>({
  active: false,
  distance: 0,
  centerX: 0,
  centerY: 0
})
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
  if (!viewport || !Number.isFinite(factor) || factor <= 0) return
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

function beginPinch(): void {
  const metrics = pinchMetrics()
  if (!metrics) return
  pinch.active = true
  pinch.distance = Math.max(1, metrics.distance)
  pinch.centerX = metrics.centerX
  pinch.centerY = metrics.centerY
  drag.mode = 'pinch'
  drag.stroke = null
}

function removeInterruptedStroke(): void {
  if (!drag.stroke) return
  const index = strokes.value.indexOf(drag.stroke)
  if (index >= 0) strokes.value.splice(index, 1)
  drag.stroke = null
  redrawInk()
}

function pressureWidth(
  previousX: number,
  previousY: number,
  currentX: number,
  currentY: number,
  elapsedMs: number,
  baseWidth: number
): number {
  const distance = Math.hypot(currentX - previousX, currentY - previousY)
  const elapsed = Math.max(8, elapsedMs)
  const speed = distance / elapsed
  // 模拟压感：慢写更粗，快写更细，并做范围限制。
  const pressure = Math.max(0.55, Math.min(1.65, 1.65 - speed * 0.9))
  const target = baseWidth * pressure
  const previous = drag.lastWidth || baseWidth
  return previous + (target - previous) * 0.35
}

function drawVariableStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  if (s.points.length === 0) return
  strokeStyle(ctx, s)

  if (s.points.length === 1) {
    const p = s.points[0]
    const width = p.width ?? s.size
    ctx.beginPath()
    ctx.arc(p.x, p.y, width / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  for (let i = 1; i < s.points.length; i++) {
    const a = s.points[i - 1]
    const b = s.points[i]
    const width = ((a.width ?? s.size) + (b.width ?? s.size)) / 2
    ctx.lineWidth =
      s.tool === 'eraser'
        ? width * 3
        : s.tool === 'highlighter'
          ? width * 2.5
          : width
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const stage = stageEl.value
  if (!stage) return
  e.preventDefault()
  stage.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size >= 2) {
    // 第二根手指出现时立即切换到独立 pinch 状态，绝不复用拖动坐标。
    removeInterruptedStroke()
    beginPinch()
    return
  }

  pinch.active = false
  drag.lastX = e.clientX
  drag.lastY = e.clientY
  drag.lastTime = performance.now()

  if (tool.value === 'pan' || sourceKind.value === 'none') {
    drag.mode = 'pan'
    return
  }

  drag.mode = 'draw'
  const point = clientToBase(e)
  drag.lastBaseX = point.x
  drag.lastBaseY = point.y
  drag.lastWidth = brush.size

  const stroke: Stroke = {
    tool: tool.value === 'eraser' ? 'eraser' : 'pen',
    color: brush.color,
    size: brush.size,
    points: [{ ...point, width: brush.size }]
  }
  drag.stroke = stroke
  strokes.value.push(stroke)
  redoStack.value = []
  const ctx = inkCtx()
  if (ctx) drawVariableStroke(ctx, stroke)
}

function onPointerMove(e: PointerEvent): void {
  if (!pointers.has(e.pointerId)) return
  e.preventDefault()
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size >= 2) {
    if (!pinch.active) beginPinch()
    const metrics = pinchMetrics()
    if (!metrics) return

    const previousDistance = Math.max(1, pinch.distance)
    const factor = metrics.distance / previousDistance

    if (Number.isFinite(factor) && factor > 0) {
      zoomAt(metrics.centerX, metrics.centerY, factor)
    }
    view.x += metrics.centerX - pinch.centerX
    view.y += metrics.centerY - pinch.centerY

    pinch.distance = Math.max(1, metrics.distance)
    pinch.centerX = metrics.centerX
    pinch.centerY = metrics.centerY
    return
  }

  if (drag.mode === 'pinch') {
    pinch.active = false
    const remaining = [...pointers.values()][0]
    if (remaining) {
      drag.mode = 'pan'
      drag.lastX = remaining.x
      drag.lastY = remaining.y
    }
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

  const point = clientToBase(e)
  const now = performance.now()
  const width = pressureWidth(
    drag.lastBaseX,
    drag.lastBaseY,
    point.x,
    point.y,
    now - drag.lastTime,
    brush.size
  )

  stroke.points.push({ ...point, width })
  drag.lastBaseX = point.x
  drag.lastBaseY = point.y
  drag.lastTime = now
  drag.lastWidth = width

  const ctx = inkCtx()
  if (ctx) drawVariableStroke(ctx, stroke)
}

function onPointerUp(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  try {
    stageEl.value?.releasePointerCapture(e.pointerId)
  } catch {
    // pointer capture may already have been released by the browser
  }

  if (pointers.size === 0) {
    pinch.active = false
    drag.stroke = null
    drag.mode = 'pan'
    drag.lastX = 0
    drag.lastY = 0
    drag.lastTime = 0
    pushActions()
    return
  }

  if (pointers.size === 1) {
    const remaining = [...pointers.values()][0]
    pinch.active = false
    drag.mode = 'pan'
    drag.lastX = remaining.x
    drag.lastY = remaining.y
  }
}

function onPointerCancel(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  removeInterruptedStroke()
  pinch.active = false
  drag.mode = 'pan'
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

