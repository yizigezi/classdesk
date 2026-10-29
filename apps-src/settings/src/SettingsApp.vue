<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSystemSetting, setSystemSetting } from './bridge'

type Section = 'general' | 'developer'
const section = ref<Section>('general')
const developerOptions = ref(false)
const loadUnpackedFolders = ref(false)
const loading = ref(true)
const saving = ref(false)
const notice = ref('')

const sectionTitle = computed(() => section.value === 'general' ? '常规' : '开发者选项')

async function loadSettings(): Promise<void> {
  loading.value = true
  try {
    developerOptions.value = (await getSystemSetting('developerOptions')) === true
    loadUnpackedFolders.value =
      developerOptions.value && (await getSystemSetting('loadUnpackedFolders')) === true
  } finally {
    loading.value = false
  }
}

async function toggleDeveloperOptions(value: boolean): Promise<void> {
  saving.value = true
  notice.value = ''
  try {
    const ok = await setSystemSetting('developerOptions', value)
    if (!ok) throw new Error('设置未能保存，请稍后重试')
    developerOptions.value = value
    if (!value) loadUnpackedFolders.value = false
    notice.value = value ? '开发者选项已启用' : '开发者选项已关闭，未打包文件夹加载也已关闭'
  } catch (error) {
    notice.value = (error as Error).message || '设置保存失败'
  } finally {
    saving.value = false
  }
}

async function toggleUnpackedFolders(value: boolean): Promise<void> {
  saving.value = true
  notice.value = ''
  try {
    const ok = await setSystemSetting('loadUnpackedFolders', value)
    if (!ok) throw new Error('请先启用开发者选项，或检查设置是否保存成功')
    loadUnpackedFolders.value = value
    notice.value = value
      ? '已允许加载未打包的应用文件夹。只加载你信任的代码。'
      : '已关闭未打包文件夹加载'
  } catch (error) {
    notice.value = (error as Error).message || '设置保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(() => void loadSettings())
</script>

<template>
  <div class="settings-root">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">⚙</div>
        <div>
          <div class="brand-title">设置</div>
          <div class="brand-subtitle">CLASSDESK</div>
        </div>
      </div>

      <button
        class="nav-item"
        :class="{ active: section === 'general' }"
        type="button"
        @click="section = 'general'"
      >
        <span class="nav-symbol">◈</span>
        常规
      </button>
      <button
        class="nav-item"
        :class="{ active: section === 'developer' }"
        type="button"
        @click="section = 'developer'"
      >
        <span class="nav-symbol">⌘</span>
        开发者选项
      </button>

      <div class="sidebar-footer">ClassDesk · 0.5.0</div>
    </aside>

    <main class="content">
      <header class="page-header">
        <div>
          <div class="eyebrow">SYSTEM PREFERENCES</div>
          <h1>{{ sectionTitle }}</h1>
        </div>
        <span v-if="saving" class="status">正在保存…</span>
      </header>

      <div v-if="loading" class="loading">正在读取设置…</div>

      <template v-else-if="section === 'general'">
        <section class="hero-card">
          <div class="hero-mark">C</div>
          <div>
            <h2>课堂桌面</h2>
            <p>ClassDesk 桌面环境与应用管理</p>
            <span class="version-pill">版本 0.5.0</span>
          </div>
        </section>

        <section class="settings-card">
          <div class="card-heading">应用与安全</div>
          <div class="info-row">
            <div>
              <div class="row-title">应用安装方式</div>
              <div class="row-description">默认仅安装经过打包的 .cdapp 应用文件。</div>
            </div>
            <span class="value-pill">安全默认值</span>
          </div>
          <div class="info-row">
            <div>
              <div class="row-title">开发者选项</div>
              <div class="row-description">用于本地应用开发与调试，可随时关闭。</div>
            </div>
            <button class="text-button" type="button" @click="section = 'developer'">管理</button>
          </div>
        </section>

        <section class="note-card">
          <span class="note-icon">i</span>
          <p>当前版本提供应用开发相关设置。更多外观、通知和启动行为选项会在对应功能可配置后加入。</p>
        </section>
      </template>

      <template v-else>
        <section class="warning-card">
          <span class="warning-icon">!</span>
          <div>
            <h2>仅为开发调试启用</h2>
            <p>未打包文件夹中的代码会直接在 ClassDesk 应用沙箱中运行。请只加载你自己编写或完全信任的应用。</p>
          </div>
        </section>

        <section class="settings-card">
          <div class="card-heading">开发者功能</div>
          <div class="setting-row">
            <div class="setting-copy">
              <div class="row-title">开发者选项</div>
              <div class="row-description">启用本地开发功能。关闭后会自动禁用未打包文件夹加载。</div>
            </div>
            <button
              class="switch"
              :class="{ on: developerOptions }"
              :disabled="saving"
              type="button"
              role="switch"
              :aria-checked="developerOptions"
              @click="toggleDeveloperOptions(!developerOptions)"
            ><span /></button>
          </div>

          <div class="setting-row" :class="{ disabled: !developerOptions }">
            <div class="setting-copy">
              <div class="row-title">加载未打包的文件夹</div>
              <div class="row-description">在安装应用时允许选择包含 manifest.json 的开发文件夹，而不只是 .cdapp 文件。</div>
              <div class="security-hint">关闭时，安装器只接受 .cdapp 文件。</div>
            </div>
            <button
              class="switch"
              :class="{ on: loadUnpackedFolders }"
              :disabled="saving || !developerOptions"
              type="button"
              role="switch"
              :aria-checked="loadUnpackedFolders"
              @click="toggleUnpackedFolders(!loadUnpackedFolders)"
            ><span /></button>
          </div>
        </section>

        <div v-if="notice" class="notice" role="status">{{ notice }}</div>
      </template>
    </main>
  </div>
</template>

<style>
:root { color-scheme: light; font-family: Inter, "Segoe UI", "Microsoft YaHei", sans-serif; }
* { box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; margin: 0; }
body { color: #202735; background: #f5f7fb; font-size: 14px; }
button { font: inherit; }
.settings-root { display: flex; width: 100%; height: 100%; min-height: 520px; overflow: auto; background: #f5f7fb; }
.sidebar { display: flex; flex: 0 0 220px; flex-direction: column; padding: 28px 14px 18px; background: #fff; border-right: 1px solid #e7eaf0; }
.brand { display: flex; align-items: center; gap: 11px; padding: 0 12px 30px; }
.brand-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; color: #fff; background: linear-gradient(145deg,#6d86e8,#8c70d7); font-size: 22px; }
.brand-title { font-size: 16px; font-weight: 700; letter-spacing: .02em; }
.brand-subtitle { margin-top: 4px; color: #9aa3b4; font-size: 9px; font-weight: 700; letter-spacing: .16em; }
.nav-item { display: flex; align-items: center; gap: 12px; width: 100%; height: 43px; margin: 3px 0; padding: 0 13px; border: 0; border-radius: 10px; color: #687386; background: transparent; text-align: left; cursor: pointer; }
.nav-item:hover { background: #f4f5fb; }
.nav-item.active { color: #5267c9; background: #edf0ff; font-weight: 600; }
.nav-symbol { display: inline-grid; width: 20px; place-items: center; font-size: 17px; }
.sidebar-footer { margin-top: auto; padding: 15px 12px 0; color: #a1a8b6; font-size: 11px; }
.content { flex: 1; min-width: 0; max-width: 960px; margin: 0 auto; padding: 34px clamp(22px, 5vw, 58px); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 27px; }
.eyebrow { color: #939caf; font-size: 9px; font-weight: 700; letter-spacing: .17em; }
h1 { margin: 7px 0 0; color: #202735; font-size: 27px; font-weight: 700; letter-spacing: -.03em; }
h2 { margin: 0; font-size: 17px; font-weight: 700; }
p { margin: 7px 0 0; color: #7e8798; line-height: 1.65; }
.hero-card { display: flex; align-items: center; gap: 18px; padding: 24px; border: 1px solid #e9ebf4; border-radius: 17px; background: linear-gradient(115deg,#fff,#f0f2ff); box-shadow: 0 5px 20px #2b365b08; }
.hero-mark { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 18px; color: #fff; background: linear-gradient(145deg,#7189eb,#9279d8); font-size: 30px; font-weight: 800; }
.hero-card p { margin-top: 5px; }
.version-pill, .value-pill { display: inline-flex; align-items: center; margin-top: 10px; padding: 4px 9px; border-radius: 999px; color: #6474c7; background: #e9edff; font-size: 11px; }
.settings-card { margin-top: 20px; padding: 5px 22px; border: 1px solid #e9ebf0; border-radius: 15px; background: #fff; box-shadow: 0 4px 18px #26324b05; }
.card-heading { padding: 17px 0 13px; color: #9aa2b1; font-size: 11px; font-weight: 700; letter-spacing: .06em; }
.info-row, .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 18px 0; border-top: 1px solid #eef0f4; }
.row-title { color: #2c3443; font-size: 13px; font-weight: 650; }
.row-description { max-width: 510px; margin-top: 6px; color: #858e9e; font-size: 12px; line-height: 1.65; }
.value-pill { flex-shrink: 0; margin: 0; color: #758198; background: #f0f2f6; }
.text-button { flex-shrink: 0; padding: 7px 12px; border: 1px solid #e2e6f0; border-radius: 8px; color: #5869c6; background: #fff; cursor: pointer; }
.text-button:hover { background: #f5f6ff; }
.note-card { display: flex; align-items: flex-start; gap: 10px; margin-top: 18px; padding: 15px 17px; border: 1px solid #e5eaf6; border-radius: 12px; background: #eef2fb; }
.note-icon { display: grid; flex: 0 0 19px; width: 19px; height: 19px; place-items: center; border-radius: 50%; color: #6377c7; background: #dce4ff; font-size: 12px; font-weight: 700; }
.note-card p { margin: 0; font-size: 12px; }
.warning-card { display: flex; gap: 13px; padding: 19px; border: 1px solid #f4dfb5; border-radius: 14px; background: #fff9eb; }
.warning-icon { display: grid; flex: 0 0 25px; width: 25px; height: 25px; place-items: center; border-radius: 50%; color: #9c6819; background: #fbe9bd; font-weight: 800; }
.warning-card h2 { color: #75501c; font-size: 14px; }
.warning-card p { color: #92794f; font-size: 12px; }
.warning-card + .settings-card { margin-top: 18px; }
.setting-row { min-height: 90px; }
.setting-copy { flex: 1; min-width: 0; }
.security-hint { margin-top: 8px; color: #b17a31; font-size: 11px; }
.disabled .setting-copy { opacity: .48; }
.switch { position: relative; flex: 0 0 42px; width: 42px; height: 24px; padding: 3px; border: 0; border-radius: 99px; background: #d7dce6; cursor: pointer; transition: background .18s ease; }
.switch span { display: block; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #1720332b; transition: transform .18s ease; }
.switch.on { background: #6679db; }
.switch.on span { transform: translateX(18px); }
.switch:disabled { cursor: not-allowed; opacity: .45; }
.notice { margin-top: 16px; padding: 12px 14px; border: 1px solid #e2e7f2; border-radius: 10px; color: #5869b7; background: #fff; font-size: 12px; }
.loading { padding: 28px 0; color: #858e9e; }
.status { color: #8a93a5; font-size: 11px; }
@media (max-width: 680px) {
  .sidebar { flex-basis: 160px; padding-right: 9px; padding-left: 9px; }
  .content { padding: 25px 18px; }
  .hero-card { padding: 17px; }
  .info-row, .setting-row { gap: 12px; }
}
</style>
