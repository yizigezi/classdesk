<script setup lang="ts">
import CardShell from './CardShell.vue'
import SvgIcon from './SvgIcon.vue'

const lessons = [
  { time: '08:00', name: '语文', place: '三楼 302', color: 'blue' },
  { time: '09:00', name: '数学', place: '三楼 302', color: 'violet' },
  { time: '10:10', name: '物理', place: '实验楼 205', color: 'green' },
  { time: '14:00', name: '历史', place: '三楼 302', color: 'orange' }
]
</script>

<template>
  <CardShell title="今日课程" class="bg-surface-beige schedule-card">
    <template #extra>
      <span class="lesson-count">4 节课程</span>
    </template>

    <div class="schedule-date">
      <div><strong>今天的安排</strong><span>保持节奏，稳步向前</span></div>
      <span class="date-icon"><SvgIcon name="calendar" class="h-4 w-4" /></span>
    </div>

    <ul class="lesson-list">
      <li
        v-for="(lesson, index) in lessons"
        :key="lesson.time"
        class="lesson-row"
        :class="[{ current: index === 2 }, lesson.color]"
      >
        <span class="lesson-time">{{ lesson.time }}</span>
        <span class="lesson-marker"><i></i></span>
        <span class="lesson-copy"><strong>{{ lesson.name }}</strong><small>{{ lesson.place }}</small></span>
        <span v-if="index === 2" class="now-chip">当前</span>
      </li>
    </ul>

    <div class="schedule-footer">
      <span><i></i> 课程安排</span>
      <span class="footer-progress"><b></b></span>
      <strong>2 / 4</strong>
    </div>
  </CardShell>
</template>

<style scoped>
.lesson-count { padding:5px 10px; border-radius:999px; background:rgba(255,255,255,.55); color:#8b775c; font-size:10px; font-weight:650; }
.schedule-date { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.schedule-date div { display:flex; flex-direction:column; gap:3px; }
.schedule-date strong { color:#50412d; font-size:12px; font-weight:700; }
.schedule-date span { color:#9b8b76; font-size:10px; }
.date-icon { display:grid; width:34px; height:34px; place-items:center; border-radius:12px; background:rgba(255,255,255,.6); color:#8b775c; }
.lesson-list { display:flex; min-height:0; flex:1; flex-direction:column; justify-content:space-between; margin:0; padding:0; list-style:none; }
.lesson-row { display:flex; min-height:43px; align-items:center; gap:10px; padding:6px 9px; border:1px solid transparent; border-radius:15px; }
.lesson-row.current { border-color:rgba(75,126,88,.13); background:rgba(255,255,255,.7); box-shadow:0 4px 14px rgba(80,76,56,.06); }
.lesson-time { width:39px; flex:0 0 auto; color:#9a8c79; font-size:10px; font-variant-numeric:tabular-nums; }
.lesson-marker { display:grid; width:22px; height:22px; flex:0 0 auto; place-items:center; border-radius:8px; background:rgba(255,255,255,.56); }
.lesson-marker i { width:6px; height:6px; border-radius:50%; background:#8ea4c4; }
.lesson-row.violet .lesson-marker i { background:#9a88be; }
.lesson-row.green .lesson-marker i { background:#5d9c70; }
.lesson-row.orange .lesson-marker i { background:#d79b5b; }
.lesson-copy { display:flex; min-width:0; flex:1; flex-direction:column; gap:2px; }
.lesson-copy strong { color:#4e4438; font-size:12px; font-weight:700; }
.lesson-copy small { color:#a29481; font-size:9px; }
.now-chip { padding:4px 7px; border-radius:999px; background:#e0f0e3; color:#4c8058; font-size:9px; font-weight:700; }
.schedule-footer { display:flex; align-items:center; gap:9px; margin-top:13px; padding:10px 11px; border-radius:14px; background:rgba(255,255,255,.48); color:#8e806c; font-size:9px; }
.schedule-footer > span:first-child { display:flex; align-items:center; gap:6px; white-space:nowrap; }
.schedule-footer i { display:block; width:6px; height:6px; border-radius:50%; background:#79a984; }
.footer-progress { height:5px; flex:1; overflow:hidden; border-radius:999px; background:rgba(88,77,58,.1); }
.footer-progress b { display:block; width:50%; height:100%; border-radius:inherit; background:#83a88a; }
.schedule-footer strong { color:#5a775f; font-size:9px; }
</style>
