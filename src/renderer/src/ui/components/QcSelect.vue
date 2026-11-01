<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string
  options: { label: string; value: string }[]
  label?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  label: '',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="qc-select" :class="{ disabled }">
    <span v-if="label" class="label">{{ label }}</span>
    <span class="control">
      <select
        :value="modelValue"
        :disabled="disabled"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </span>
  </label>
</template>

<style scoped>
.qc-select { display: flex; flex-direction: column; gap: 7px; min-width: 0; color: var(--qc-on-surface, #1b1b21); }
.label { padding-inline: 3px; color: var(--qc-on-surface-variant, #48474f); font-size: 12px; font-weight: 600; }
.control { position: relative; display: flex; align-items: center; }
select { box-sizing: border-box; width: 100%; min-height: 48px; padding: 0 44px 0 16px; appearance: none; border: 1px solid var(--qc-outline, #c8c6d0); border-radius: var(--qc-radius-md, 18px); outline: none; background: var(--qc-surface-container-low, #f3f2f8); color: inherit; font: inherit; font-size: 14px; cursor: pointer; transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease; }
select:hover:not(:disabled) { background: var(--qc-surface-container, #efeff5); }
select:focus { border-color: var(--qc-primary, #59609a); box-shadow: 0 0 0 3px color-mix(in srgb, var(--qc-primary, #59609a) 16%, transparent); }
select:disabled { opacity: .5; cursor: not-allowed; }
svg { position: absolute; right: 14px; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
</style>
