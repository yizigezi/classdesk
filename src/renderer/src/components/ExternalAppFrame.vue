<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useShellStore } from '@/stores/shell'
import type { InstalledApp, ShellAction } from '@/platform/contract'

// —— 外部应用容器：应用包（classdesk-app 协议）和网页应用都跑在 iframe 里 ——
// 挂载一次常驻（壳层用 v-show 切换），保留应用内状态。
// 应用与壳层的互操作走 postMessage 桥：
//   应用 → 壳层：{ source:'classdesk-app', type:'actions'|'settings.get'|'settings.set'|'settings.list', ... }
//   壳层 → 应用：{ source:'classdesk-shell', type:'invoke'|'visibility'|'settings.result', ... }
const props = defineProps<{ app: InstalledApp }>()
const shell = useShellStore()
const { activeApp } = storeToRefs(shell)
const frame = ref<HTMLIFrameElement | null>(null)

const src = computed(() =>
  props.app.type === 'web' && props.app.url
    ? props.app.url
    : `classdesk-app://${props.app.id}/${props.app.entry || 'index.html'}`
)

const visible = computed(() => activeApp.value === props.app.id)

function post(msg: Record<string, unknown>): void {
  frame.value?.contentWindow?.postMessage({ source: 'classdesk-shell', ...msg }, '*')
}

interface ActionDTO {
  id?: string
  label?: string
  icon?: ShellAction['icon']
  active?: boolean
  disabled?: boolean
  info?: boolean
}

function toActions(list?: ActionDTO[]): ShellAction[] {
  return (list ?? []).map((a) => ({
    id: String(a.id ?? ''),
    label: String(a.label ?? ''),
    icon: a.icon,
    active: !!a.active,
    disabled: !!a.disabled,
    info: !!a.info,
    onClick: () => post({ type: 'invoke', id: String(a.id ?? '') })
  }))
}

function onMessage(event: MessageEvent): void {
  if (event.source !== frame.value?.contentWindow) return
  const data = event.data as (Record<string, unknown> & { source?: string; type?: string }) | null
  if (!data || data.source !== 'classdesk-app') return

  switch (data.type) {
    case 'actions':
      shell.registerActions(props.app.id, {
        left: toActions(data.left as ActionDTO[]),
        right: toActions(data.right as ActionDTO[])
      })
      break
    case 'settings.get':
      void window.desk?.settings.get(props.app.id, String(data.key ?? '')).then((value) => {
        post({ type: 'settings.result', reqId: data.reqId, value })
      })
      break
    case 'settings.set':
      void window.desk?.settings
        .set(props.app.id, String(data.key ?? ''), data.value as never)
        .then(() => post({ type: 'settings.result', reqId: data.reqId, value: data.value }))
      break
    case 'settings.list':
      void window.desk?.settings.list(props.app.id).then((all) => {
        post({ type: 'settings.result', reqId: data.reqId, value: all })
      })
      break
  }
}

watch(visible, (v) => post({ type: 'visibility', visible: v }))

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  shell.unregisterActions(props.app.id)
})
</script>

<template>
  <div class="absolute inset-0 bg-white">
    <iframe
      ref="frame"
      class="h-full w-full border-0"
      :src="src"
      :title="app.name"
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
      allow="clipboard-read; clipboard-write; camera; microphone"
    />
  </div>
</template>
