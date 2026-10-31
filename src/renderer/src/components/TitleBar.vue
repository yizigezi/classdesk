<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { timeLabel } = storeToRefs(store)
const fullscreen = ref(false)

async function syncFullscreen(): Promise<void> {
  fullscreen.value = await window.desk?.window.isFullscreen() ?? false
}

async function toggleFullscreen(): Promise<void> {
  fullscreen.value = await window.desk?.window.toggleFullscreen() ?? fullscreen.value
}

onMounted(() => {
  void syncFullscreen()
})

onBeforeUnmount(() => {})
</script>

<template>
  <header class="drag bar-glass z-20 flex h-12 shrink-0 items-center border-b border-white/10 px-4">
    <div class="no-drag ml-auto flex items-center gap-2.5 text-white/90">
      <span class="grid h-5 w-5 place-items-center"><SvgIcon name="volume" class="h-[18px] w-[18px]" /></span>
      <span class="grid h-5 w-5 place-items-center"><SvgIcon name="wifi" class="h-[18px] w-[18px]" /></span>
      <span class="relative grid h-5 w-5 place-items-center">
        <SvgIcon name="bell" class="h-[18px] w-[18px]" />
        <span class="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#e2705a] ring-[1.5px] ring-[#12151b]/50"></span>
      </span>
      <span class="mx-1 h-4 w-px bg-white/20"></span>
      <span class="text-[13px] leading-none tabular-nums text-white">{{ timeLabel }}</span>
      <button
        class="no-drag bar-item grid h-8 w-8 place-items-center rounded-tile"
        :title="fullscreen ? '退出全屏' : '进入全屏'"
        type="button"
        @click="toggleFullscreen"
      >
        <SvgIcon name="fullscreen" class="h-[17px] w-[17px]" />
      </button>
    </div>
  </header>
</template>
