<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { timeLabel } = storeToRefs(store)

const homeDate = computed(() => {
  // timeLabel 每秒刷新，因此这里会随系统时间自然更新。
  const now = new Date()
  const weekday = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]
  const weekdayCn = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]
  return {
    weekday,
    weekdayCn,
    monthDay: `${now.getMonth() + 1}/${now.getDate()}`
  }
})
</script>

<template>
  <div class="box-border h-full w-full text-white">
    <div class="home-clock absolute left-10 top-9 select-none">
      <div class="home-clock__time tabular-nums">
        {{ timeLabel }}
      </div>
      <div class="home-clock__weekday">
        <span>{{ homeDate.weekday }}</span>
        <small>周{{ homeDate.weekdayCn }}</small>
      </div>
      <div class="home-clock__date tabular-nums">
        {{ homeDate.monthDay }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-clock {
  color: rgba(245, 247, 250, 0.76);
  font-family: 'MiSans', 'Source Han Sans SC', 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.28);
}

.home-clock__time {
  font-size: clamp(54px, 6.5vw, 96px);
  line-height: 0.94;
  font-weight: 300;
  letter-spacing: -0.055em;
}

.home-clock__weekday {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 12px;
  line-height: 0.9;
  font-size: clamp(48px, 5.8vw, 84px);
  font-weight: 300;
  letter-spacing: -0.045em;
}

.home-clock__weekday small {
  font-size: 0.28em;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.62;
}

.home-clock__date {
  margin-top: 14px;
  font-size: clamp(54px, 6.2vw, 92px);
  line-height: 0.9;
  font-weight: 300;
  letter-spacing: -0.055em;
}
</style>
