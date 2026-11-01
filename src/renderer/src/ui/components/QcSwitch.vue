<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ modelValue?: boolean; disabled?: boolean }>(), {
  modelValue: false,
  disabled: false
})
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const checked = computed(() => props.modelValue)
function toggle(): void {
  if (!props.disabled) emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button class="qc-switch" :class="{ checked, disabled }" type="button" role="switch" :aria-checked="checked" :disabled="disabled" @click="toggle">
    <span class="thumb" />
  </button>
</template>

<style scoped>
.qc-switch {
  position: relative;
  flex: 0 0 auto;
  width: 52px;
  height: 32px;
  padding: 3px;
  border: 2px solid var(--qc-outline, #c8c6d0);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: background 180ms var(--qc-ease, cubic-bezier(.2,.8,.2,1)), border-color 180ms ease;
}
.thumb {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--qc-on-surface-variant, #48474f);
  box-shadow: 0 1px 3px rgb(0 0 0 / 18%);
  transition: transform 220ms var(--qc-ease, cubic-bezier(.2,.8,.2,1)), background 180ms ease, width 180ms ease, height 180ms ease;
}
.checked { border-color: var(--qc-primary, #59609a); background: var(--qc-primary, #59609a); }
.checked .thumb { transform: translateX(20px); background: var(--qc-on-primary, #fff); }
.qc-switch:not(:disabled):active .thumb { width: 25px; }
.qc-switch:disabled { opacity: .45; cursor: default; }
</style>
