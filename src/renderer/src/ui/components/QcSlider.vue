<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: number
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
  showValue?: boolean
}>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  label: '',
  disabled: false,
  showValue: false
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const progress = computed(() => {
  if (props.max <= props.min) return 0
  return Math.min(100, Math.max(0, ((props.modelValue - props.min) / (props.max - props.min)) * 100))
})
</script>

<template>
  <label class="qc-slider" :class="{ disabled }">
    <span v-if="label || showValue" class="heading">
      <span v-if="label" class="label">{{ label }}</span>
      <output v-if="showValue">{{ modelValue }}</output>
    </span>
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :style="{ '--qc-progress': progress + '%' }"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
  </label>
</template>

<style scoped>
.qc-slider { display: flex; flex-direction: column; gap: 12px; min-width: 140px; color: var(--qc-on-surface, #1b1b21); }
.heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.label { color: var(--qc-on-surface-variant, #48474f); font-size: 13px; font-weight: 600; }
output { font-size: 13px; font-variant-numeric: tabular-nums; }
input { width: 100%; height: 6px; margin: 7px 0; appearance: none; border-radius: 999px; outline: none; background: linear-gradient(to right, var(--qc-primary, #59609a) var(--qc-progress), var(--qc-outline, #c8c6d0) var(--qc-progress)); cursor: pointer; }
input::-webkit-slider-thumb { width: 20px; height: 20px; appearance: none; border: 0; border-radius: 50%; background: var(--qc-primary, #59609a); box-shadow: 0 1px 4px rgb(0 0 0 / 20%); transition: transform 140ms ease; }
input:active::-webkit-slider-thumb { transform: scale(1.12); }
input::-moz-range-thumb { width: 20px; height: 20px; border: 0; border-radius: 50%; background: var(--qc-primary, #59609a); box-shadow: 0 1px 4px rgb(0 0 0 / 20%); }
input:focus-visible { outline: 3px solid color-mix(in srgb, var(--qc-primary, #59609a) 25%, transparent); outline-offset: 5px; }
.disabled { opacity: .45; }
.disabled input { cursor: not-allowed; }
</style>
