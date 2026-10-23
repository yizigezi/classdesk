<script setup lang="ts">
defineProps<{
  label?: string
}>()
</script>

<template>
  <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#22262e] text-white">
    <span class="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white"></span>
    <div class="text-[13px] text-white/70">{{ label ?? '正在加载应用…' }}</div>
  </div>
</template>
