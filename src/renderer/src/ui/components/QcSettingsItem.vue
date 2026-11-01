<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; disabled?: boolean }>(), { disabled: false })
</script>

<template>
  <div class="qc-settings-item" :class="{ disabled }">
    <div class="copy"><h3>{{ title }}</h3><p v-if="description">{{ description }}</p></div>
    <div class="control"><slot /></div>
  </div>
</template>

<style scoped>
.qc-settings-item { display: flex; align-items: center; gap: 24px; min-height: 76px; padding: 16px 20px; }
.copy { min-width: 0; flex: 1; }
h3 { margin: 0 0 4px; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
p { margin: 0; color: var(--qc-on-surface-variant, #48474f); font-size: 13px; line-height: 1.5; }
.control { flex: 0 0 auto; }
.disabled { opacity: .45; }
</style>
