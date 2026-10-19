<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SvgIcon from './SvgIcon.vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { timeLabel } = storeToRefs(store)
</script>

<template>
  <header class="drag shrink-0 px-7 pt-2">
    <div class="flex h-9 items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="h-6 w-6 rounded-pill border border-white/60 bg-white/25"></span>
        <span class="text-[13px] font-medium text-white drop-shadow-bar">课堂桌面</span>
      </div>

      <div class="flex items-center gap-4 text-white">
        <SvgIcon name="volume" class="h-4 w-4 drop-shadow-bar" />
        <SvgIcon name="wifi" class="h-4 w-4 drop-shadow-bar" />
        <span class="relative">
          <SvgIcon name="bell" class="h-4 w-4 drop-shadow-bar" />
          <span class="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-pill bg-[#e2705a]"></span>
        </span>
        <span class="text-[13px] tabular-nums drop-shadow-bar">{{ timeLabel }}</span>
      </div>
    </div>
  </header>
</template>
