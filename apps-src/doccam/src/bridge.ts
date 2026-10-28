// —— 应用侧 postMessage 桥客户端（壳层实现见 ExternalAppFrame.vue）——
//   应用 → 壳层：{ source:'classdesk-app', type:'actions'|'settings.get'|'settings.set'|'settings.list', ... }
//   壳层 → 应用：{ source:'classdesk-shell', type:'invoke'|'visibility'|'settings.result', ... }

export interface ActionDTO {
  id: string
  label: string
  icon?: string
  active?: boolean
  disabled?: boolean
  info?: boolean
}

export interface ActionsPayload {
  left: ActionDTO[]
  right: ActionDTO[]
}

type InvokeHandler = (id: string) => void

let invokeHandler: InvokeHandler | null = null
const pending = new Map<number, (value: unknown) => void>()
let reqSeq = 0

function post(msg: Record<string, unknown>): void {
  window.parent.postMessage({ source: 'classdesk-app', ...msg }, '*')
}

function request(payload: Record<string, unknown>): Promise<unknown> {
  const reqId = ++reqSeq
  return new Promise((resolve) => {
    pending.set(reqId, resolve)
    post({ ...payload, reqId })
    window.setTimeout(() => {
      if (pending.delete(reqId)) resolve(null)
    }, 8000)
  })
}

/** 注册 / 更新底栏操作（壳层渲染，点谁回调 onInvoke(id)）。 */
export function setActions(actions: ActionsPayload): void {
  post({ type: 'actions', left: actions.left, right: actions.right })
}

export function onInvoke(fn: InvokeHandler): void {
  invokeHandler = fn
}

/** 应用配置（sqlite 设置库，scope 锁本应用 id）。 */
export function settingsGet(key: string): Promise<unknown> {
  return request({ type: 'settings.get', key })
}

export function settingsSet(key: string, value: unknown): Promise<unknown> {
  return request({ type: 'settings.set', key, value })
}

export function settingsList(): Promise<unknown> {
  return request({ type: 'settings.list' })
}

// 应用页面通常会在根节点监听 pointerdown 来处理拖动画面。
// 控件（按钮、下拉框、输入框等）必须保留自己的 pointer 事件，避免被根节点抢走 pointer capture。
window.addEventListener(
  'pointerdown',
  (event: PointerEvent) => {
    const target = event.target
    if (target instanceof Element && target.closest('button,select,input,textarea,a')) {
      event.stopPropagation()
    }
  },
  true
)

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as (Record<string, unknown> & { source?: string; type?: string }) | null
  if (!data || data.source !== 'classdesk-shell') return

  if (data.type === 'invoke') {
    invokeHandler?.(String(data.id ?? ''))
    return
  }
  if (data.type === 'settings.result') {
    const resolve = pending.get(Number(data.reqId))
    if (resolve) {
      pending.delete(Number(data.reqId))
      resolve(data.value)
    }
    return
  }
  if (data.type === 'visibility') {
    document.body.dataset.visible = data.visible ? '1' : '0'
  }
})
