<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
}>(), {
  modelValue: false,
  label: '',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="qc-checkbox" :class="{ disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="box" aria-hidden="true">
      <svg viewBox="0 0 18 18"><path d="m3.5 9 3.5 3.5 7.5-7.5" /></svg>
    </span>
    <span v-if="label || $slots.default" class="label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.qc-checkbox { display: inline-flex; align-items: center; gap: 10px; min-height: 36px; color: var(--qc-on-surface, #1b1b21); cursor: pointer; user-select: none; }
input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.box { display: grid; place-items: center; width: 20px; height: 20px; flex: 0 0 auto; border: 2px solid var(--qc-outline, #c8c6d0); border-radius: 6px; background: transparent; transition: background 150ms ease, border-color 150ms ease, transform 150ms ease; }
svg { width: 15px; height: 15px; fill: none; stroke: var(--qc-on-primary, #fff); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transform: scale(.7); transition: opacity 130ms ease, transform 150ms ease; }
input:checked + .box { border-color: var(--qc-primary, #59609a); background: var(--qc-primary, #59609a); }
input:checked + .box svg { opacity: 1; transform: scale(1); }
input:focus-visible + .box { outline: 3px solid color-mix(in srgb, var(--qc-primary, #59609a) 25%, transparent); outline-offset: 2px; }
.label { font-size: 14px; line-height: 1.4; }
.disabled { opacity: .45; cursor: not-allowed; }
</style>
