<script setup lang="ts">
const version = '0.5.0'
</script>

<template>
  <section class="about-page">
    <div class="about-hero">
      <div class="app-mark" aria-hidden="true">C</div>
      <h1>QuickClass DE</h1>
      <p>QuickClass Desktop Environment</p>
      <span class="version">版本 {{ version }}</span>
    </div>

    <div class="about-card">
      <div class="about-row"><span>软件名称</span><strong>QuickClass DE</strong></div>
      <div class="about-row"><span>软件版本</span><strong>{{ version }}</strong></div>
      <div class="about-row"><span>产品定位</span><strong>课堂桌面环境</strong></div>
      <div class="about-row"><span>作者</span><strong>yizigezi</strong></div>
    </div>

    <p class="copyright">QuickClass DE · Desktop Environment</p>
  </section>
</template>

<style scoped>
.about-page { max-width: 760px; margin: 0 auto; }
.about-hero { display: flex; align-items: center; flex-direction: column; padding: 22px 0 30px; text-align: center; }
.app-mark { display: grid; width: 84px; height: 84px; margin-bottom: 18px; place-items: center; border-radius: 28px; color: #11174b; background: #dfe1ff; box-shadow: 0 8px 28px #555b9120; font-size: 34px; font-weight: 600; }
.about-hero h1 { margin: 0; color: #1b1b21; font-size: 30px; font-weight: 500; letter-spacing: -.035em; }
.about-hero p { margin: 7px 0 12px; color: #474750; font-size: 13px; }
.version { padding: 6px 11px; border-radius: 999px; color: #474750; background: #e9e8ef; font-size: 11px; }
.about-card { overflow: hidden; border-radius: 22px; background: #fff; box-shadow: 0 1px 2px #28283a0a; }
.about-row { display: flex; align-items: center; justify-content: space-between; min-height: 62px; padding: 0 24px; border-bottom: 1px solid #e9e8ef; color: #474750; font-size: 12px; }
.about-row:last-child { border-bottom: 0; }
.about-row strong { color: #1b1b21; font-size: 12px; font-weight: 500; }
.copyright { margin: 22px 0 0; color: #777780; text-align: center; font-size: 11px; }
</style>
