type SettingsKey = 'developerOptions' | 'loadUnpackedFolders' | 'startFullscreen'

const pending = new Map<number, (value: unknown) => void>()
let requestId = 0

function request(type: string, key: SettingsKey, value?: boolean): Promise<unknown> {
  const reqId = ++requestId
  return new Promise((resolve) => {
    pending.set(reqId, resolve)
    window.parent.postMessage(
      { source: 'classdesk-app', type, key, value, reqId },
      '*'
    )
    window.setTimeout(() => {
      if (pending.delete(reqId)) resolve(null)
    }, 8000)
  })
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window.parent) return
  const data = event.data as { source?: string; type?: string; reqId?: number; value?: unknown } | null
  if (!data || data.source !== 'classdesk-shell' || data.type !== 'settings.result') return
  const resolve = pending.get(Number(data.reqId))
  if (!resolve) return
  pending.delete(Number(data.reqId))
  resolve(data.value)
})

export function getSystemSetting(key: SettingsKey): Promise<unknown> {
  return request('system.settings.get', key)
}

export async function setSystemSetting(key: SettingsKey, value: boolean): Promise<boolean> {
  return (await request('system.settings.set', key, value)) === true
}
