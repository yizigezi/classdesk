<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="flex min-h-0 flex-col rounded-card p-6 shadow-card">
    <header v-if="title" class="flex shrink-0 items-center justify-between">
      <h2 class="text-[17px] font-medium text-ink-900">{{ title }}</h2>
      <slot name="extra" />
    </header>
    <div class="mt-4 flex min-h-0 flex-1 flex-col">
      <slot />
    </div>
  </section>
</template>
