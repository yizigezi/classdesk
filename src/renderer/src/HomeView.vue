<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { timeLabel, dateLabel } = storeToRefs(store)
</script>

<template>
  <div class="box-border h-full w-full text-white">
    <div class="absolute left-8 top-8 select-none drop-shadow-bar">
      <div class="text-[56px] leading-none font-bold tabular-nums">
        {{ timeLabel }}
      </div>
      <div class="mt-2 text-[18px] font-medium">
        {{ dateLabel }}
      </div>
    </div>
  </div>
</template>
