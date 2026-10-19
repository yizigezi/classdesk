<script setup lang="ts">
import CardShell from './CardShell.vue'
import SvgIcon from './SvgIcon.vue'

const files = [
  { id: 1, name: '牛顿运动定律·课件', icon: 'slide' as const, when: '09:30' },
  { id: 2, name: '函数练习·作业', icon: 'sheet' as const, when: '昨天' },
  { id: 3, name: '班级评语·模板', icon: 'doc' as const, when: '昨天' },
  { id: 4, name: '期中成绩·分析', icon: 'sheet' as const, when: '10月14日' }
]
</script>

<template>
  <CardShell title="快速打开" class="bg-surface-blue">
    <div
      class="flex h-11 shrink-0 items-center gap-2.5 rounded-inner bg-white/80 px-3.5 shadow-card"
    >
      <SvgIcon name="search" class="h-4 w-4 shrink-0 text-ink-300" />
      <span class="flex-1 text-[13px] text-ink-300">搜索文件</span>
      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-tile text-ink-500">
        <SvgIcon name="clock" class="h-4 w-4" />
      </span>
      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-tile text-ink-500">
        <SvgIcon name="folder" class="h-4 w-4" />
      </span>
    </div>

    <div class="mt-5 shrink-0 text-[11px] text-ink-300">最近文件</div>

    <ul class="mt-1 flex min-h-0 flex-1 flex-col">
      <li
        v-for="file in files"
        :key="file.id"
        class="flex flex-1 items-center gap-3.5 rounded-inner px-2 transition hover:bg-white/50"
      >
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-white/75 text-ink-500">
          <SvgIcon :name="file.icon" class="h-[18px] w-[18px]" />
        </span>
        <span class="truncate text-[13px] text-ink-700">{{ file.name }}</span>
        <span class="ml-auto shrink-0 text-[11px] text-ink-300">{{ file.when }}</span>
      </li>
    </ul>
  </CardShell>
</template>
