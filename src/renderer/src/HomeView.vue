<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SvgIcon from './components/SvgIcon.vue'
import { useAppStore } from '@/stores/app'
import { useModuleStore } from '@/stores/module'

const store = useAppStore()
const { timeLabel, dateLabel } = storeToRefs(store)
const moduleStore = useModuleStore()

const nextLesson = {
  tag: '下一节',
  name: '数学',
  time: '09:00',
  place: '三楼 302'
}
</script>

<template>
  <div class="box-border flex h-full w-full flex-col items-center justify-center pb-6 text-white">
    <div class="text-[104px] leading-[1.05] font-bold tabular-nums drop-shadow-bar">
      {{ timeLabel }}
    </div>
    <div class="mt-2 text-[20px] drop-shadow-bar">{{ dateLabel }}</div>

    <div
      class="mt-12 flex w-[600px] items-center gap-5 rounded-card bg-white/80 px-7 py-5 shadow-card"
    >
      <span class="rounded-tile bg-ink-900/8 px-2.5 py-1 text-[12px] text-ink-500">
        {{ nextLesson.tag }}
      </span>
      <span class="text-[22px] font-medium text-ink-900">{{ nextLesson.name }}</span>
      <span class="text-[13px] text-ink-500 tabular-nums">{{ nextLesson.time }}</span>
      <span class="ml-auto text-[13px] text-ink-500">{{ nextLesson.place }}</span>
    </div>

    <div class="mt-5 flex h-14 w-[600px] items-center gap-3.5 rounded-card bg-white/80 px-6 shadow-card">
      <SvgIcon name="search" class="h-5 w-5 shrink-0 text-ink-300" />
      <span class="text-[15px] text-ink-500">打开文件</span>
    </div>

    <button
      class="no-drag mt-10 flex h-16 w-[280px] items-center justify-center gap-2.5 rounded-pill bg-white/95 text-[18px] font-medium text-ink-900 shadow-card transition hover:bg-white"
      @click="moduleStore.openPptx()"
    >
      <SvgIcon name="slide" class="h-5 w-5" />
      开始演示
    </button>
  </div>
</template>
