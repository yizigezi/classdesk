<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

defineProps<{
  open: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('cancel')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="material-dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-6 backdrop-blur-md"
        role="presentation"
        @click.self="emit('cancel')"
      >
        <div
          class="w-full max-w-[420px] overflow-hidden rounded-[30px] border border-white/12 bg-[#20242d]/95 p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,.35)]"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="text-[22px] font-semibold tracking-[-0.02em]">{{ title }}</div>
          <div v-if="message" class="mt-3 text-[14px] leading-6 text-white/65">{{ message }}</div>

          <div class="mt-7 flex justify-end gap-2">
            <button
              class="min-w-[72px] rounded-full px-4 py-2.5 text-[13px] font-medium text-white/75 transition hover:bg-white/8 hover:text-white active:scale-[.98]"
              type="button"
              @click="emit('cancel')"
            >
              {{ cancelText || '取消' }}
            </button>
            <button
              class="min-w-[72px] rounded-full px-5 py-2.5 text-[13px] font-semibold transition active:scale-[.98]"
              :class="destructive
                ? 'bg-[#ffb4ab] text-[#690005] hover:bg-[#ffc2ba]'
                : 'bg-[#d9e2ff] text-[#0b1a33] hover:bg-[#e7ebff]'"
              type="button"
              @click="emit('confirm')"
            >
              {{ confirmText || '确定' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.material-dialog-enter-active,
.material-dialog-leave-active {
  transition: opacity .18s ease;
}
.material-dialog-enter-active > div > div,
.material-dialog-leave-active > div > div {
  transition: transform .18s cubic-bezier(.2, .8, .2, 1), opacity .18s ease;
}
.material-dialog-enter-from,
.material-dialog-leave-to {
  opacity: 0;
}
.material-dialog-enter-from > div > div,
.material-dialog-leave-to > div > div {
  opacity: 0;
  transform: scale(.96) translateY(8px);
}
</style>
