<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SvgIcon from './SvgIcon.vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { timeLabel } = storeToRefs(store)
</script>

<template>
  <header class="drag bar-glass z-20 flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-4">
    <div class="flex items-center gap-2.5">
      <span
        class="h-5 w-5 rounded-full border border-white/45 bg-gradient-to-br from-white/50 to-white/10"
      ></span>
      <span class="text-[13px] leading-none font-medium text-white">课堂桌面</span>
    </div>

    <!-- 右上状态区：图标同尺寸盒、同一基线、等距排布 -->
    <div class="flex items-center gap-2.5 text-white/90">
      <span class="grid h-5 w-5 place-items-center">
        <SvgIcon name="volume" class="h-[18px] w-[18px]" />
      </span>
      <span class="grid h-5 w-5 place-items-center">
        <SvgIcon name="wifi" class="h-[18px] w-[18px]" />
      </span>
      <span class="relative grid h-5 w-5 place-items-center">
        <SvgIcon name="bell" class="h-[18px] w-[18px]" />
        <span
          class="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#e2705a] ring-[1.5px] ring-[#12151b]/50"
        ></span>
      </span>
      <span class="mx-1 h-4 w-px bg-white/20"></span>
      <span class="text-[13px] leading-none tabular-nums text-white">{{ timeLabel }}</span>
    </div>
  </header>
</template>
