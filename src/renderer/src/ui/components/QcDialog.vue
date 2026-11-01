<script setup lang="ts">
import { watch } from 'vue'

const props = withDefaults(defineProps<{ open?: boolean; title?: string; persistent?: boolean }>(), {
  open: false,
  title: '',
  persistent: false
})
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

function close(): void {
  if (!props.persistent) emit('update:open', false)
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}
watch(() => props.open, (open) => {
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="qc-dialog">
      <div v-if="open" class="backdrop" @click.self="close">
        <section class="dialog" role="dialog" aria-modal="true" :aria-label="title || undefined">
          <header v-if="title" class="header"><h2>{{ title }}</h2></header>
          <div class="content"><slot /></div>
          <footer v-if="$slots.actions" class="actions"><slot name="actions" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px; background: rgb(0 0 0 / 32%); backdrop-filter: blur(4px); }
.dialog { width: min(520px, 100%); overflow: hidden; border-radius: var(--qc-radius-lg, 24px); background: var(--qc-surface, #f8f7fc); color: var(--qc-on-surface, #1b1b21); box-shadow: 0 18px 60px rgb(0 0 0 / 22%); }
.header { padding: 24px 24px 8px; }
h2 { margin: 0; font-size: 21px; font-weight: 650; letter-spacing: -.02em; }
.content { padding: 16px 24px 24px; font-size: 14px; line-height: 1.6; }
.actions { display: flex; justify-content: flex-end; gap: 8px; padding: 8px 16px 16px; }
.qc-dialog-enter-active, .qc-dialog-leave-active { transition: opacity 160ms ease; }
.qc-dialog-enter-active .dialog, .qc-dialog-leave-active .dialog { transition: transform 180ms var(--qc-ease, cubic-bezier(.2,.8,.2,1)); }
.qc-dialog-enter-from, .qc-dialog-leave-to { opacity: 0; }
.qc-dialog-enter-from .dialog, .qc-dialog-leave-to .dialog { transform: translateY(8px) scale(.97); }
</style>
