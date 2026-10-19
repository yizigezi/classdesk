<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SvgIcon from './SvgIcon.vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { quickItems, activeQuickId, dateLabel } = storeToRefs(store)
</script>

<template>
  <footer class="shrink-0 px-8 py-4 text-white">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          class="grid h-8 w-8 place-items-center rounded-tile transition hover:bg-white/15"
        >
          <SvgIcon name="chevron-left" class="h-4 w-4 drop-shadow-bar" />
        </button>
        <span class="w-28 text-center text-[13px] drop-shadow-bar">{{ dateLabel }}</span>
        <button
          class="grid h-8 w-8 place-items-center rounded-tile transition hover:bg-white/15"
        >
          <SvgIcon name="chevron-right" class="h-4 w-4 drop-shadow-bar" />
        </button>
      </div>

      <nav class="flex items-center gap-3">
        <button
          v-for="item in quickItems"
          :key="item.id"
          class="no-drag flex w-16 flex-col items-center gap-1.5 rounded-inner px-2 py-2 transition"
          :class="activeQuickId === item.id ? 'bg-white/18' : 'hover:bg-white/12'"
          @click="store.setActiveQuick(item.id)"
        >
          <SvgIcon :name="item.icon" class="h-5 w-5 drop-shadow-bar" />
          <span class="text-[10px] drop-shadow-bar">{{ item.label }}</span>
        </button>
      </nav>

      <div class="flex items-center gap-3">
        <button
          class="flex w-16 flex-col items-center gap-1.5 rounded-inner px-2 py-2 transition hover:bg-white/12"
        >
          <SvgIcon name="prev" class="h-5 w-5 drop-shadow-bar" />
          <span class="text-[10px] drop-shadow-bar">上一页</span>
        </button>
        <button
          class="flex w-16 flex-col items-center gap-1.5 rounded-inner px-2 py-2 transition hover:bg-white/12"
        >
          <SvgIcon name="next" class="h-5 w-5 drop-shadow-bar" />
          <span class="text-[10px] drop-shadow-bar">下一页</span>
        </button>
        <button
          class="flex w-16 flex-col items-center gap-1.5 rounded-inner px-2 py-2 transition hover:bg-white/12"
        >
          <SvgIcon name="pen" class="h-5 w-5 drop-shadow-bar" />
          <span class="text-[10px] drop-shadow-bar">画笔</span>
        </button>
      </div>
    </div>
  </footer>
</template>
