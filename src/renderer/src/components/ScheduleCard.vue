<script setup lang="ts">
import CardShell from './CardShell.vue'
import SvgIcon from './SvgIcon.vue'

const lessons = [
  { time: '08:00', name: '语文', place: '三楼 302' },
  { time: '09:00', name: '数学', place: '三楼 302' },
  { time: '10:10', name: '物理', place: '实验楼 205' },
  { time: '14:00', name: '历史', place: '三楼 302' }
]
</script>

<template>
  <CardShell title="今日课程" class="bg-surface-beige">
    <template #extra>
      <span class="text-[11px] text-ink-300">共 4 节</span>
    </template>

    <ul class="flex min-h-0 flex-1 flex-col justify-between">
      <li
        v-for="(lesson, index) in lessons"
        :key="lesson.time"
        class="flex items-center gap-4 rounded-inner px-2 py-1"
        :class="index === 2 ? 'bg-white/70 shadow-card' : ''"
      >
        <span class="w-12 shrink-0 text-[12px] text-ink-500 tabular-nums">{{ lesson.time }}</span>
        <span
          class="text-[15px] font-medium"
          :class="index === 2 ? 'text-[#3e7d52]' : 'text-ink-900'"
        >
          {{ lesson.name }}
        </span>
        <span class="ml-auto shrink-0 text-[11px] text-ink-300">{{ lesson.place }}</span>
      </li>
    </ul>

    <div
      class="mt-4 flex h-10 shrink-0 items-center justify-center gap-6 rounded-inner bg-white/60"
    >
      <SvgIcon name="chevron-left" class="h-4 w-4 text-ink-500" />
      <SvgIcon name="volume" class="h-4 w-4 text-ink-500" />
      <div class="h-1 w-20 rounded-pill bg-ink-900/10">
        <div class="h-1 w-3/5 rounded-pill bg-ink-900/25"></div>
      </div>
      <SvgIcon name="chevron-right" class="h-4 w-4 text-ink-500" />
    </div>
  </CardShell>
</template>
