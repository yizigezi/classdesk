<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="showcase-card">
    <header v-if="title" class="showcase-card-header">
      <h2>{{ title }}</h2>
      <slot name="extra" />
    </header>
    <div class="showcase-card-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.showcase-card {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;
  border: 1px solid rgba(48, 54, 70, 0.07);
  border-radius: 30px;
  box-shadow:
    0 1px 2px rgba(25, 31, 45, 0.04),
    0 12px 32px rgba(25, 31, 45, 0.07);
  isolation: isolate;
}
.showcase-card::before {
  position: absolute;
  z-index: -1;
  top: -90px;
  right: -90px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.42), transparent 68%);
  content: "";
  pointer-events: none;
}
.showcase-card-header {
  display: flex;
  min-height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.showcase-card-header h2 {
  margin: 0;
  color: #202535;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.035em;
}
.showcase-card-body {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  margin-top: 18px;
}
</style>
