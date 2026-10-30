<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSystemSetting, setSystemSetting } from './bridge'

type Section = 'general' | 'developer'
const section = ref<Section>('general')
const developerOptions = ref(false)
const loadUnpackedFolders = ref(false)
const startFullscreen = ref(true)
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
    const savedFullscreen = await getSystemSetting('startFullscreen')
    startFullscreen.value = savedFullscreen === null ? true : savedFullscreen === true
  } finally {
    loading.value = false
  }
}

async function toggleStartFullscreen(value: boolean): Promise<void> {
  saving.value = true
  notice.value = ''
  try {
    const ok = await setSystemSetting('startFullscreen', value)
    if (!ok) throw new Error('设置未能保存，请稍后重试')
    startFullscreen.value = value
    notice.value = value ? '已设置为下次启动时进入全屏' : '已设置为下次启动时使用普通窗口'
  } catch (error) {
    notice.value = (error as Error).message || '设置保存失败'
  } finally {
    saving.value = false
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
    notice.value = value ? '已允许加载未打包的应用文件夹。只加载你信任的代码。' : '已关闭未打包文件夹加载'
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
        <div class="brand-icon" aria-hidden="true">⚙</div>
        <div>
          <div class="brand-title">设置</div>
          <div class="brand-subtitle">CLASSDESK</div>
        </div>
      </div>

      <div class="nav-label">设置</div>
      <nav class="nav-list" aria-label="设置分类">
        <button
          class="nav-item"
          :class="{ active: section === 'general' }"
          type="button"
          @click="section = 'general'"
        >
          <span class="nav-symbol" aria-hidden="true">⌂</span>
          <span>常规</span>
        </button>
        <button
          class="nav-item"
          :class="{ active: section === 'developer' }"
          type="button"
          @click="section = 'developer'"
        >
          <span class="nav-symbol" aria-hidden="true">⌘</span>
          <span>开发者选项</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <span class="footer-dot" aria-hidden="true" />
        ClassDesk · 0.5.0
      </div>
    </aside>

    <main class="content">
      <header class="page-header">
        <div>
          <div class="eyebrow">SYSTEM PREFERENCES</div>
          <h1>{{ sectionTitle }}</h1>
        </div>
        <div v-if="saving" class="saving-indicator" role="status">
          <span class="progress-dot" aria-hidden="true" />正在保存
        </div>
      </header>

      <div v-if="loading" class="loading-card" role="status">
        <span class="loading-shape" aria-hidden="true" />
        <span>正在读取设置…</span>
      </div>

      <template v-else-if="section === 'general'">
        <section class="hero-card">
          <div class="hero-mark" aria-hidden="true">C</div>
          <div class="hero-copy">
            <span class="section-kicker">YOUR CLASSROOM DESKTOP</span>
            <h2>课堂桌面</h2>
            <p>ClassDesk 桌面环境与应用管理</p>
            <span class="version-pill">版本 0.5.0</span>
          </div>
        </section>

        <section class="settings-card">
          <div class="card-heading">
            <span>启动行为</span>
            <span class="heading-mark" aria-hidden="true">✦</span>
          </div>
          <div class="setting-row">
            <div class="setting-copy">
              <div class="row-title">启动时全屏</div>
              <div class="row-description">下次启动 ClassDesk 时进入全屏显示；当前窗口不会立即改变。</div>
            </div>
            <button
              class="switch"
              :class="{ on: startFullscreen }"
              :disabled="saving"
              type="button"
              role="switch"
              :aria-checked="startFullscreen"
              @click="toggleStartFullscreen(!startFullscreen)"
            ><span /></button>
          </div>
        </section>

        <section class="settings-card">
          <div class="card-heading">
            <span>应用与安全</span>
            <span class="heading-mark" aria-hidden="true">⌁</span>
          </div>
          <div class="info-row">
            <div>
              <div class="row-title">应用安装方式</div>
              <div class="row-description">默认仅安装经过打包的 .cdapp 应用文件。</div>
            </div>
            <span class="tonal-pill">安全默认值</span>
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
          <span class="note-icon" aria-hidden="true">i</span>
          <p>当前版本提供应用开发相关设置。更多外观、通知和启动行为选项会在对应功能可配置后加入。</p>
        </section>
      </template>

      <template v-else>
        <section class="warning-card">
          <span class="warning-icon" aria-hidden="true">!</span>
          <div>
            <div class="section-kicker warning-kicker">DEVELOPER FEATURE</div>
            <h2>仅为开发调试启用</h2>
            <p>未打包文件夹中的代码会直接在 ClassDesk 应用沙箱中运行。请只加载你自己编写或完全信任的应用。</p>
          </div>
        </section>

        <section class="settings-card">
          <div class="card-heading">
            <span>开发者功能</span>
            <span class="heading-mark" aria-hidden="true">⚡</span>
          </div>
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

        <div v-if="notice" class="notice" role="status">
          <span class="notice-icon" aria-hidden="true">✓</span>
          {{ notice }}
        </div>
      </template>
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  font-family: Inter, "Segoe UI", "Microsoft YaHei", sans-serif;
  --md-primary: #6750a4;
  --md-on-primary: #fff;
  --md-primary-container: #eadcff;
  --md-on-primary-container: #24123f;
  --md-secondary-container: #e9def8;
  --md-on-secondary-container: #241a2e;
  --md-tertiary: #7d5260;
  --md-surface: #fffbff;
  --md-surface-container: #f3edf7;
  --md-surface-container-high: #ece6f0;
  --md-outline: #79747e;
  --md-outline-variant: #cac4d0;
  --md-on-surface: #1d1b20;
  --md-on-surface-variant: #49454f;
}

* { box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; margin: 0; }
body { color: var(--md-on-surface); background: var(--md-surface); font-size: 14px; }
button { font: inherit; }
button:focus-visible { outline: 3px solid #9b82d0; outline-offset: 2px; }

.settings-root {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 520px;
  overflow: auto;
  background: var(--md-surface);
}

.sidebar {
  display: flex;
  flex: 0 0 248px;
  flex-direction: column;
  padding: 28px 16px 20px;
  background: var(--md-surface-container);
  border-right: 1px solid var(--md-outline-variant);
}

.brand { display: flex; align-items: center; gap: 12px; padding: 0 12px 30px; }
.brand-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 14px;
  color: var(--md-on-primary);
  background: var(--md-primary);
  font-size: 21px;
  box-shadow: 0 3px 8px #6750a433;
}
.brand-title { font-size: 18px; font-weight: 700; letter-spacing: -.01em; }
.brand-subtitle { margin-top: 3px; color: var(--md-on-surface-variant); font-size: 9px; font-weight: 700; letter-spacing: .18em; }
.nav-label { padding: 0 16px 9px; color: var(--md-on-surface-variant); font-size: 11px; font-weight: 700; }
.nav-list { display: grid; gap: 5px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 17px;
  color: var(--md-on-surface-variant);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background .18s ease, transform .18s ease;
}
.nav-item:hover { background: #e9e1ed; }
.nav-item:active { transform: scale(.985); }
.nav-item.active { color: var(--md-on-secondary-container); background: var(--md-secondary-container); font-weight: 700; }
.nav-symbol { display: inline-grid; width: 22px; place-items: center; font-size: 19px; }
.sidebar-footer { display: flex; align-items: center; gap: 8px; margin-top: auto; padding: 18px 12px 0; color: var(--md-on-surface-variant); font-size: 11px; }
.footer-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--md-primary); }

.content { flex: 1; min-width: 0; max-width: 980px; margin: 0 auto; padding: 38px clamp(22px, 5vw, 62px); }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.eyebrow, .section-kicker { color: var(--md-on-surface-variant); font-size: 9px; font-weight: 800; letter-spacing: .16em; }
h1 { margin: 7px 0 0; color: var(--md-on-surface); font-size: 30px; font-weight: 700; letter-spacing: -.035em; }
h2 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -.015em; }
p { margin: 7px 0 0; color: var(--md-on-surface-variant); line-height: 1.65; }

.saving-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 13px;
  border-radius: 999px;
  color: var(--md-primary);
  background: var(--md-primary-container);
  font-size: 12px;
  font-weight: 650;
}
.progress-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--md-primary); animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { transform: scale(.55); opacity: .45; } }

.hero-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 27px;
  overflow: hidden;
  border-radius: 28px;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}
.hero-card::after {
  content: "";
  position: absolute;
  width: 180px;
  height: 180px;
  right: -58px;
  top: -86px;
  border-radius: 50%;
  background: #fff8;
}
.hero-mark {
  position: relative;
  z-index: 1;
  display: grid;
  width: 66px;
  height: 66px;
  flex: 0 0 66px;
  place-items: center;
  border-radius: 23px;
  color: var(--md-on-primary);
  background: var(--md-primary);
  font-size: 32px;
  font-weight: 800;
  box-shadow: 0 5px 13px #6750a433;
}
.hero-copy { position: relative; z-index: 1; }
.hero-copy .section-kicker { color: #51406f; }
.hero-card p { margin-top: 4px; color: #51465f; }
.version-pill, .tonal-pill {
  display: inline-flex;
  align-items: center;
  margin-top: 12px;
  padding: 6px 11px;
  border-radius: 999px;
  color: var(--md-on-primary-container);
  background: #fff8;
  font-size: 11px;
  font-weight: 650;
}

.settings-card {
  margin-top: 20px;
  padding: 5px 24px;
  border: 1px solid var(--md-outline-variant);
  border-radius: 25px;
  background: var(--md-surface);
}
.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 17px 0 13px;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  font-weight: 750;
}
.heading-mark { color: var(--md-primary); font-size: 17px; }
.info-row, .setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding: 19px 0;
  border-top: 1px solid var(--md-outline-variant);
}
.row-title { color: var(--md-on-surface); font-size: 14px; font-weight: 650; }
.row-description { max-width: 540px; margin-top: 6px; color: var(--md-on-surface-variant); font-size: 12px; line-height: 1.65; }
.tonal-pill { flex-shrink: 0; margin: 0; color: var(--md-on-secondary-container); background: var(--md-secondary-container); }
.text-button {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0 18px;
  border: 1px solid var(--md-outline);
  border-radius: 999px;
  color: var(--md-primary);
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}
.text-button:hover { background: var(--md-primary-container); border-color: var(--md-primary); }

.switch {
  position: relative;
  flex: 0 0 52px;
  width: 52px;
  height: 32px;
  padding: 3px;
  border: 2px solid var(--md-outline);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  transition: background .2s ease, border-color .2s ease;
}
.switch span {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--md-outline);
  box-shadow: 0 1px 2px #0002;
  transition: transform .2s cubic-bezier(.2,.8,.2,1), width .2s ease, height .2s ease;
}
.switch:hover span { transform: scale(1.08); }
.switch.on { border-color: var(--md-primary); background: var(--md-primary); }
.switch.on span { transform: translateX(20px); background: var(--md-on-primary); }
.switch.on:hover span { transform: translateX(20px) scale(1.08); }
.switch:disabled { opacity: .45; cursor: not-allowed; }

.note-card {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-top: 18px;
  padding: 16px 18px;
  border-radius: 19px;
  background: var(--md-surface-container);
}
.note-icon, .notice-icon {
  display: grid;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  color: var(--md-primary);
  background: var(--md-primary-container);
  font-size: 12px;
  font-weight: 800;
}
.note-card p { margin: 0; font-size: 12px; }

.warning-card {
  display: flex;
  gap: 14px;
  padding: 21px;
  border-radius: 25px;
  color: #5c3a43;
  background: #f7dfe4;
}
.warning-icon {
  display: grid;
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 11px;
  color: #fff;
  background: var(--md-tertiary);
  font-weight: 800;
}
.warning-kicker { color: #76505a; margin-bottom: 5px; }
.warning-card h2 { color: #583740; font-size: 15px; }
.warning-card p { color: #76535c; font-size: 12px; }
.warning-card + .settings-card { margin-top: 18px; }
.setting-row { min-height: 92px; }
.setting-copy { flex: 1; min-width: 0; }
.security-hint { margin-top: 8px; color: #8a5c38; font-size: 11px; }
.disabled .setting-copy { opacity: .5; }

.notice {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 13px 16px;
  border-radius: 17px;
  color: var(--md-on-primary-container);
  background: var(--md-primary-container);
  font-size: 12px;
}
.loading-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 90px;
  padding: 0 22px;
  border-radius: 23px;
  color: var(--md-on-surface-variant);
  background: var(--md-surface-container);
}
.loading-shape { width: 22px; height: 22px; border: 3px solid var(--md-outline-variant); border-top-color: var(--md-primary); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .sidebar { flex-basis: 190px; }
  .content { padding: 28px 20px; }
  .settings-card { padding-inline: 18px; }
}
</style>
