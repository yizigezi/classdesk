<script setup lang="ts">
defineProps<{
  error?: Error
  retry?: () => void
}>()
</script>

<template>
  <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#22262e] text-white">
    <div class="text-[15px]">应用加载失败</div>
    <div class="max-w-[480px] px-6 text-center text-[12px] text-white/55">
      {{ error?.message || '模块没有加载成功，可能是磁盘繁忙或资源损坏' }}
    </div>
    <button
      class="no-drag rounded-pill bg-white px-6 py-2 text-[13px] font-medium text-ink-900 transition hover:bg-white/90"
      type="button"
      @click="retry?.()"
    >
      重试
    </button>
  </div>
</template>
