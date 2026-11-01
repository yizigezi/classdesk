<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string | number
  value: string | number
  label?: string
  name?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  label: '',
  name: '',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <label class="qc-radio" :class="{ disabled }">
    <input
      type="radio"
      :name="name || undefined"
      :value="value"
      :checked="modelValue === value"
      :disabled="disabled"
      @change="emit('update:modelValue', value)"
    />
    <span class="circle" aria-hidden="true"><span /></span>
    <span v-if="label || $slots.default" class="label"><slot>{{ label }}</slot></span>
  </label>
</template>

<style scoped>
.qc-radio { display: inline-flex; align-items: center; gap: 10px; min-height: 36px; color: var(--qc-on-surface, #1b1b21); cursor: pointer; user-select: none; }
input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.circle { display: grid; place-items: center; width: 20px; height: 20px; flex: 0 0 auto; border: 2px solid var(--qc-outline, #c8c6d0); border-radius: 50%; transition: border-color 150ms ease; }
.circle span { width: 10px; height: 10px; border-radius: 50%; background: var(--qc-primary, #59609a); transform: scale(0); transition: transform 150ms cubic-bezier(.2,.8,.2,1); }
input:checked + .circle { border-color: var(--qc-primary, #59609a); }
input:checked + .circle span { transform: scale(1); }
input:focus-visible + .circle { outline: 3px solid color-mix(in srgb, var(--qc-primary, #59609a) 25%, transparent); outline-offset: 2px; }
.label { font-size: 14px; line-height: 1.4; }
.disabled { opacity: .45; cursor: not-allowed; }
</style>
