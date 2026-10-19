<script setup lang="ts">
import PresentCard from './components/PresentCard.vue'
import QuickOpenCard from './components/QuickOpenCard.vue'
import ScheduleCard from './components/ScheduleCard.vue'
</script>

<template>
  <main class="box-border grid h-full w-full grid-cols-3 gap-7 px-8 pb-8 pt-3">
    <PresentCard />
    <QuickOpenCard />
    <ScheduleCard />
  </main>
</template>
