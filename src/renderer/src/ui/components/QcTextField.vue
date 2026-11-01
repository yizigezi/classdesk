<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  type?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  type: 'text',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="qc-field" :class="{ disabled }">
    <span v-if="label" class="label">{{ label }}</span>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<style scoped>
.qc-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; color: var(--qc-on-surface, #1b1b21); }
.label { padding-inline: 3px; color: var(--qc-on-surface-variant, #48474f); font-size: 12px; font-weight: 600; }
input { box-sizing: border-box; width: 100%; min-height: 48px; padding: 0 16px; border: 1px solid var(--qc-outline, #c8c6d0); border-radius: var(--qc-radius-md, 18px); outline: none; background: var(--qc-surface-container-low, #f3f2f8); color: inherit; font: inherit; font-size: 14px; transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease; }
input::placeholder { color: var(--qc-on-surface-variant, #48474f); opacity: .7; }
input:hover:not(:disabled) { background: var(--qc-surface-container, #efeff5); }
input:focus { border-color: var(--qc-primary, #59609a); box-shadow: 0 0 0 3px color-mix(in srgb, var(--qc-primary, #59609a) 16%, transparent); }
input:disabled { opacity: .5; cursor: not-allowed; }
</style>
