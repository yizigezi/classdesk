<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'filled' | 'tonal' | 'text'; disabled?: boolean }>(), { variant: 'filled', disabled: false })
</script>

<template><button class="qc-button" :class="`variant-${variant}`" :disabled="disabled"><slot /></button></template>

<style scoped>
.qc-button { min-height: 42px; padding: 0 20px; border: 0; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 140ms var(--qc-ease, cubic-bezier(.2,.8,.2,1)), filter 140ms ease, background 140ms ease; }
.qc-button:active:not(:disabled) { transform: scale(.97); }
.variant-filled { color: var(--qc-on-primary, #fff); background: var(--qc-primary, #59609a); }
.variant-tonal { color: var(--qc-primary, #59609a); background: var(--qc-primary-container, #e0e2ff); }
.variant-text { color: var(--qc-primary, #59609a); background: transparent; }
.qc-button:hover:not(:disabled) { filter: brightness(.97); }
.qc-button:disabled { opacity: .45; cursor: default; }
</style>
