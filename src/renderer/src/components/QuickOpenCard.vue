<script setup lang="ts">
import CardShell from './CardShell.vue'
import SvgIcon from './SvgIcon.vue'

const files = [
  { id: 1, name: '牛顿运动定律·课件', kind: 'PPTX', icon: 'slide' as const, when: '09:30', tone: 'purple' },
  { id: 2, name: '函数练习·作业', kind: 'DOCX', icon: 'doc' as const, when: '昨天', tone: 'blue' },
  { id: 3, name: '班级评语·模板', kind: 'DOCX', icon: 'doc' as const, when: '昨天', tone: 'orange' },
  { id: 4, name: '期中成绩·分析', kind: 'XLSX', icon: 'sheet' as const, when: '10月14日', tone: 'green' }
]
</script>

<template>
  <CardShell title="快速打开" class="bg-surface-blue quick-card">
    <template #extra>
      <span class="quick-caption">最近使用</span>
    </template>

    <div class="quick-search">
      <SvgIcon name="search" class="h-[17px] w-[17px]" />
      <span>搜索文件</span>
      <kbd>⌘ K</kbd>
    </div>

    <div class="quick-section-label"><span>最近文件</span><span>全部</span></div>

    <ul class="quick-list">
      <li v-for="file in files" :key="file.id" class="quick-row">
        <span class="file-icon" :class="file.tone">
          <SvgIcon :name="file.icon" class="h-[18px] w-[18px]" />
        </span>
        <span class="file-copy">
          <strong>{{ file.name }}</strong>
          <small>{{ file.kind }} · 最近打开</small>
        </span>
        <span class="file-time">{{ file.when }}</span>
        <SvgIcon name="chevron-right" class="quick-chevron h-4 w-4" />
      </li>
    </ul>
  </CardShell>
</template>

<style scoped>
.quick-caption { color:rgba(44,64,103,.58); font-size:10px; font-weight:650; letter-spacing:.04em; }
.quick-search {
  display:flex; height:46px; flex:0 0 auto; align-items:center; gap:10px; padding:0 13px;
  border:1px solid rgba(54,78,128,.08); border-radius:16px; background:rgba(255,255,255,.62);
  color:#66728b; box-shadow:0 2px 8px rgba(39,57,90,.035);
}
.quick-search span { flex:1; font-size:12px; }
.quick-search kbd { padding:3px 7px; border:1px solid rgba(75,91,124,.12); border-radius:7px; background:rgba(255,255,255,.65); color:#8993a8; font-size:9px; }
.quick-section-label { display:flex; justify-content:space-between; margin:19px 2px 7px; color:#65718a; font-size:10px; font-weight:700; }
.quick-section-label span:last-child { color:#667eb1; }
.quick-list { display:flex; min-height:0; flex:1; flex-direction:column; gap:4px; margin:0; padding:0; list-style:none; }
.quick-row { display:flex; min-height:0; flex:1; align-items:center; gap:10px; padding:5px 7px; border-radius:15px; transition:background .16s ease; }
.quick-row:hover { background:rgba(255,255,255,.56); }
.file-icon { display:grid; width:37px; height:37px; flex:0 0 auto; place-items:center; border-radius:13px; }
.file-icon.purple { background:#eee8ff; color:#7659bb; }
.file-icon.blue { background:#e4edff; color:#4b72bd; }
.file-icon.orange { background:#fff0e4; color:#b8743e; }
.file-icon.green { background:#e2f2e8; color:#49805c; }
.file-copy { display:flex; min-width:0; flex:1; flex-direction:column; gap:3px; }
.file-copy strong { overflow:hidden; color:#283146; font-size:11px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
.file-copy small { color:#8993a8; font-size:9px; }
.file-time { flex:0 0 auto; color:#8590a5; font-size:9px; font-variant-numeric:tabular-nums; }
.quick-chevron { flex:0 0 auto; color:#a0a9bb; }
</style>
