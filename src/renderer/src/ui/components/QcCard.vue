<template>
  <section class="qc-card"><slot /></section>
</template>

<style scoped>
.qc-card {
  background: var(--qc-surface-container, #efeff5);
  border-radius: var(--qc-radius-lg, 24px);
  overflow: hidden;
  transition: transform 180ms var(--qc-ease, cubic-bezier(.2,.8,.2,1)), background 180ms ease;
}
.qc-card:hover { background: var(--qc-surface-container-high, #e9e8ef); }
</style>
