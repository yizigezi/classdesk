<script setup lang="ts">
import CardShell from './CardShell.vue'
import SvgIcon from './SvgIcon.vue'
import { useShellStore } from '@/stores/shell'
import { PRESENT_APP_ID, useRegistryStore } from '@/stores/registry'

const shell = useShellStore()
const registry = useRegistryStore()

function startPresent(): void {
  if (registry.byId(PRESENT_APP_ID)) shell.openApp(PRESENT_APP_ID)
  else shell.toggleLaunchpad()
}
</script>

<template>
  <CardShell title="演示" class="bg-surface-green present-card">
    <template #extra>
      <span class="present-badge"><span></span> READY TO PRESENT</span>
    </template>

    <div class="present-content">
      <div class="slide-stage" aria-hidden="true">
        <div class="slide-back"></div>
        <div class="slide-front">
          <div class="slide-copy">
            <span class="slide-kicker">CLASS PRESENTATION</span>
            <span class="slide-heading"></span>
            <span class="slide-line"></span>
            <span class="slide-line medium"></span>
            <span class="slide-line short"></span>
            <div class="slide-chart">
              <i></i><i></i><i></i><i></i><i></i>
            </div>
          </div>
          <div class="slide-orbit"><span></span></div>
        </div>
        <div class="slide-page-count"><b></b><i></i><i></i><i></i></div>
      </div>

      <div class="present-footer">
        <div class="present-copy">
          <strong>让每一页都精彩</strong>
          <span>支持 PowerPoint 动画与切换效果</span>
        </div>
        <button class="present-action no-drag" type="button" @click="startPresent">
          <SvgIcon name="play" class="h-4 w-4" />
          <span>开始演示</span>
          <SvgIcon name="next" class="h-4 w-4" />
        </button>
      </div>
    </div>
  </CardShell>
</template>

<style scoped>
.present-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid rgba(42, 88, 62, .10);
  border-radius: 999px;
  background: rgba(255,255,255,.42);
  color: #557565;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: .1em;
}
.present-badge span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4c9a6b;
  box-shadow: 0 0 0 3px rgba(76,154,107,.12);
}
.present-content { display:flex; min-height:0; flex:1; flex-direction:column; justify-content:space-between; }
.slide-stage { position:relative; min-height:190px; flex:1; margin:2px 0 20px; }
.slide-back {
  position:absolute; top:23px; left:50%; width:76%; height:70%; transform:translateX(-50%) rotate(3deg);
  border:1px solid rgba(49,85,66,.08); border-radius:22px; background:rgba(255,255,255,.4);
}
.slide-front {
  position:absolute; top:6px; left:50%; display:flex; width:76%; height:72%; min-height:145px;
  transform:translateX(-50%) rotate(-2deg); overflow:hidden; border:1px solid rgba(49,85,66,.08);
  border-radius:22px; background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(237,248,239,.9));
  box-shadow:0 12px 28px rgba(36,73,51,.12);
}
.slide-copy { display:flex; width:66%; flex-direction:column; padding:17px 0 14px 18px; }
.slide-kicker { color:#70917b; font-size:7px; font-weight:800; letter-spacing:.12em; }
.slide-heading { width:82%; height:12px; margin-top:15px; border-radius:8px; background:#355d49; opacity:.82; }
.slide-line { width:95%; height:5px; margin-top:10px; border-radius:8px; background:#a9bbae; opacity:.5; }
.slide-line.medium { width:78%; margin-top:6px; }
.slide-line.short { width:55%; margin-top:6px; }
.slide-chart { display:flex; height:36px; align-items:flex-end; gap:5px; margin-top:auto; }
.slide-chart i { width:12px; border-radius:5px 5px 2px 2px; background:linear-gradient(#8dbca0,#4d8969); }
.slide-chart i:nth-child(1){height:45%}.slide-chart i:nth-child(2){height:72%}.slide-chart i:nth-child(3){height:58%}.slide-chart i:nth-child(4){height:92%}.slide-chart i:nth-child(5){height:68%}
.slide-orbit { display:grid; width:34%; place-items:center; }
.slide-orbit span { width:54px; aspect-ratio:1; border:8px solid #8ab49a; border-right-color:#d5e9d9; border-radius:50%; box-shadow:0 0 0 8px rgba(138,180,154,.12); }
.slide-page-count { position:absolute; bottom:2px; left:50%; display:flex; align-items:center; gap:6px; transform:translateX(-50%); }
.slide-page-count b,.slide-page-count i { display:block; width:6px; height:6px; border-radius:99px; background:rgba(39,75,54,.18); }
.slide-page-count b { width:18px; background:#548363; }
.present-footer { display:flex; align-items:center; justify-content:space-between; gap:14px; }
.present-copy { display:flex; min-width:0; flex-direction:column; gap:4px; }
.present-copy strong { color:#234531; font-size:14px; font-weight:700; }
.present-copy span { color:#668171; font-size:11px; }
.present-action {
  display:inline-flex; min-height:44px; flex:0 0 auto; align-items:center; gap:9px; padding:0 16px;
  border-radius:999px; background:#315c43; color:#fff; font-size:12px; font-weight:650;
  box-shadow:0 5px 12px rgba(35,82,54,.16); transition:transform .18s ease, background .18s ease, box-shadow .18s ease;
}
.present-action:hover { transform:translateY(-1px); background:#254b36; box-shadow:0 8px 18px rgba(35,82,54,.2); }
.present-action:active { transform:scale(.98); }
@media (max-width: 1100px) {
  .present-footer { align-items:flex-start; flex-direction:column; }
  .present-action { align-self:flex-start; }
}
</style>
