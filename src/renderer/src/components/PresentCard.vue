<script setup lang="ts">
import CardShell from './CardShell.vue'
import { useModuleStore } from '@/stores/module'

const moduleStore = useModuleStore()
</script>

<template>
  <CardShell title="演示" class="bg-surface-green">
    <template #extra>
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/25"></span>
        <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/15"></span>
        <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/15"></span>
      </div>
    </template>

    <div class="flex min-h-0 flex-1 flex-col items-center justify-between">
      <div class="relative mt-2 h-full w-full">
        <div class="absolute left-1/2 top-3 h-[62%] w-[68%] -translate-x-1/2 rounded-inner bg-white/45"></div>
        <div class="absolute left-1/2 top-0 h-[62%] w-[68%] -translate-x-1/2 rounded-inner bg-white/75 p-5">
          <div class="flex h-full gap-5">
            <div class="flex flex-1 flex-col gap-3">
              <div class="h-3 w-2/3 rounded-tile bg-ink-900/15"></div>
              <div class="h-2 w-full rounded-tile bg-ink-900/8"></div>
              <div class="h-2 w-5/6 rounded-tile bg-ink-900/8"></div>
              <div class="h-2 w-3/5 rounded-tile bg-ink-900/8"></div>
            </div>
            <div class="grid w-20 shrink-0 place-items-center">
              <div class="h-16 w-16 rounded-pill border-2 border-[#7fa98a]/60"></div>
            </div>
          </div>
        </div>
        <div class="absolute bottom-[10%] left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/30"></span>
          <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/15"></span>
          <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/15"></span>
          <span class="h-1.5 w-1.5 rounded-pill bg-ink-900/15"></span>
        </div>
      </div>

      <button
        class="no-drag grid h-[72px] w-[72px] shrink-0 place-items-center rounded-pill bg-ink-900 text-[13px] font-medium text-white transition hover:bg-ink-700"
        @click="moduleStore.openPptist()"
      >
        开始演示
      </button>
    </div>
  </CardShell>
</template>
