<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { MdSwitch } from '@material/web/switch/switch.js'
import type { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field.js'

type Section = 'general' | 'developer'
type SettingKey = 'startFullscreen' | 'developerOptions' | 'loadUnpackedFolders'

const section = ref<Section>('general')
const startFullscreen = ref(true)
const developerOptions = ref(false)
const loadUnpackedFolders = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const searchQuery = ref('')

const sectionTitle = computed(() => section.value === 'general' ? '常规' : '开发者选项')
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return []
  return [
    { title: '启动时全屏', description: '下次启动时进入全屏显示', section: 'general' as const },
    { title: '应用安装方式', description: '默认仅安装打包后的 .cdapp 应用', section: 'general' as const },
    { title: '开发者选项', description: '启用本地开发功能', section: 'developer' as const },
    { title: '加载未打包的文件夹', description: '安装时允许选择开发文件夹', section: 'developer' as const }
  ].filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase().includes(query))
})

function updateSearch(event: Event): void {
  searchQuery.value = (event.currentTarget as MdOutlinedTextField).value
}

function updateSetting(key: SettingKey, event: Event): void {
  void saveSetting(key, (event.currentTarget as MdSwitch).selected)
}

async function loadSettings(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    if (!window.desk) throw new Error('系统设置服务不可用')
    const [fullscreen, developer, unpacked] = await Promise.all([
      window.desk.settings.get('system', 'startFullscreen'),
      window.desk.settings.get('system', 'developerOptions'),
      window.desk.settings.get('system', 'loadUnpackedFolders')
    ])
    startFullscreen.value = fullscreen !== false
    developerOptions.value = developer === true
    loadUnpackedFolders.value = developerOptions.value && unpacked === true
  } catch (err) {
    error.value = `设置读取失败：${(err as Error).message}`
  } finally {
    loading.value = false
  }
}

async function saveSetting(key: SettingKey, value: boolean): Promise<void> {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (!window.desk) throw new Error('系统设置服务不可用')
    if (key === 'loadUnpackedFolders' && value && !developerOptions.value) {
      throw new Error('请先启用开发者选项')
    }

    const saved = await window.desk.settings.set('system', key, value)
    if (!saved) throw new Error('设置未能保存，请稍后重试')

    if (key === 'startFullscreen') startFullscreen.value = value
    if (key === 'developerOptions') {
      developerOptions.value = value
      if (!value) {
        await window.desk.settings.set('system', 'loadUnpackedFolders', false)
        loadUnpackedFolders.value = false
      }
    }
    if (key === 'loadUnpackedFolders') loadUnpackedFolders.value = value

  } catch (err) {
    error.value = `保存失败：${(err as Error).message}`
  } finally {
    saving.value = false
  }
}

onMounted(() => void loadSettings())
</script>

<template>
  <div class="settings-page">
    <aside class="settings-sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 3.2 14 4l.5 2a6.4 6.4 0 0 1 1.4.8l1.9-.6 1.4 2.4-1.4 1.5a6.9 6.9 0 0 1 0 1.7l1.4 1.5-1.4 2.4-1.9-.6a6.4 6.4 0 0 1-1.4.8l-.5 2-2 .8-2-.8-.5-2a6.4 6.4 0 0 1-1.4-.8l-1.9.6-1.4-2.4 1.4-1.5a6.9 6.9 0 0 1 0-1.7L4.8 8.6l1.4-2.4 1.9.6a6.4 6.4 0 0 1 1.4-.8l.5-2 2-.8Z" />
            <circle cx="12" cy="11.1" r="2.5" />
          </svg>
        </div>
        <strong>设置</strong>
      </div>

      <md-outlined-text-field
        class="settings-search"
        type="search"
        placeholder="搜索设置"
        aria-label="搜索设置"
        :value.prop="searchQuery"
        @input="updateSearch"
      >
        <svg slot="leading-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m15.5 15.5 4.2 4.2" />
        </svg>
        <md-icon-button
          v-if="searchQuery"
          slot="trailing-icon"
          aria-label="清除搜索"
          @click="searchQuery = ''"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </md-icon-button>
      </md-outlined-text-field>

      <nav class="section-nav" aria-label="设置分类">
        <div class="sidebar-label">系统偏好设置</div>
        <button
          class="nav-button"
          :class="{ selected: section === 'general' && !searchQuery }"
          type="button"
          @click="section = 'general'; searchQuery = ''"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3.2 2" /></svg>
          <span>常规</span>
        </button>
        <button
          class="nav-button"
          :class="{ selected: section === 'developer' && !searchQuery }"
          type="button"
          @click="section = 'developer'; searchQuery = ''"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-4 5 4 5M16 7l4 5-4 5M14 5l-4 14" /></svg>
          <span>开发者选项</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="footer-avatar">C</div>
        <div class="footer-copy"><strong>ClassDesk</strong><span>课堂桌面</span></div>
        <span class="version">0.5.0</span>
      </div>
    </aside>

    <main class="settings-content">
      <div class="content-topline">
        <div class="breadcrumbs">
          <span>设置</span><span class="breadcrumb-divider">›</span>
          <strong>{{ searchQuery ? '搜索结果' : sectionTitle }}</strong>
        </div>
        <div v-if="saving" class="save-state" role="status"><span class="save-spinner" />正在保存</div>
      </div>

      <div v-if="loading" class="loading-panel" role="status">
        <span class="loading-spinner" /><span>正在读取设置</span>
      </div>
      <div v-else-if="error && !developerOptions && section === 'general' && !searchQuery" class="error-panel" role="alert">
        {{ error }}<md-text-button @click="loadSettings">重试</md-text-button>
      </div>

      <section v-else-if="searchQuery" class="content-section">
        <div class="page-heading">
          <h1>搜索设置</h1>
          <p>与“{{ searchQuery }}”相关的设置</p>
        </div>
        <div v-if="searchResults.length" class="settings-card search-results">
          <button
            v-for="result in searchResults"
            :key="result.title"
            class="search-result"
            type="button"
            @click="section = result.section; searchQuery = ''"
          >
            <span class="result-icon">
              <svg v-if="result.section === 'general'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3.2 2" /></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-4 5 4 5M16 7l4 5-4 5M14 5l-4 14" /></svg>
            </span>
            <span class="result-copy"><strong>{{ result.title }}</strong><small>{{ result.description }}</small></span>
            <span class="result-category">{{ result.section === 'general' ? '常规' : '开发者选项' }}</span>
            <span class="result-arrow">›</span>
          </button>
        </div>
        <div v-else class="empty-results">没有找到相关设置</div>
      </section>

      <section v-else-if="section === 'general'" class="content-section">
        <div class="page-heading">
          <h1>常规</h1>
          <p>管理 ClassDesk 的启动方式与应用行为。</p>
        </div>

        <section class="settings-section">
          <div class="section-heading"><h2>启动行为</h2></div>
          <div class="settings-card">
            <div class="setting-row">
              <span class="setting-symbol" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4.5 8V4.5H8M16 4.5h3.5V8M19.5 16v3.5H16M8 19.5H4.5V16" /></svg>
              </span>
              <div class="setting-copy">
                <h3>启动时全屏</h3>
                <p>下次启动 ClassDesk 时进入全屏显示，不影响当前窗口。</p>
              </div>
              <md-switch
                class="toggle"
                :selected.prop="startFullscreen"
                :disabled.prop="saving"
                aria-label="启动时全屏"
                @change="updateSetting('startFullscreen', $event)"
              />
            </div>
          </div>
        </section>

        <section class="settings-section">
          <div class="section-heading"><h2>应用与安全</h2></div>
          <div class="settings-card info-card">
            <span class="setting-symbol security-symbol" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3.5 19 6v5.3c0 4.4-2.8 7.6-7 9.2-4.2-1.6-7-4.8-7-9.2V6l7-2.5Z" /><path d="m9 12 2 2 4-4" /></svg>
            </span>
            <div class="setting-copy">
              <h3>默认安装方式</h3>
              <p>默认仅接受打包后的 .cdapp 应用。未打包文件夹需要手动启用开发者选项。</p>
            </div>
            <span class="safe-badge">安全默认值</span>
            <span class="row-arrow">›</span>
          </div>
        </section>
      </section>

      <section v-else class="content-section">
        <div class="page-heading">
          <h1>开发者选项</h1>
          <p>用于本地应用开发与调试。</p>
        </div>
        <div class="developer-notice">
          <span class="notice-symbol">!</span>
          <p>开发功能会允许加载本地应用代码。请只运行自己编写或完全信任的应用。</p>
        </div>
        <section class="settings-section developer-section">
          <div class="section-heading"><h2>开发者功能</h2></div>
          <div class="settings-card">
            <div class="setting-row">
              <span class="setting-symbol developer-symbol" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m8 7-4 5 4 5M16 7l4 5-4 5M14 5l-4 14" /></svg>
              </span>
              <div class="setting-copy">
                <h3>开发者选项</h3>
                <p>启用本地开发功能。关闭后会自动关闭未打包文件夹加载。</p>
              </div>
              <md-switch
                class="toggle"
                :selected.prop="developerOptions"
                :disabled.prop="saving"
                aria-label="开发者选项"
                @change="updateSetting('developerOptions', $event)"
              />
            </div>
            <div class="setting-row nested-row" :class="{ disabled: !developerOptions }">
              <span class="setting-symbol folder-symbol" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></svg>
              </span>
              <div class="setting-copy">
                <h3>加载未打包的文件夹</h3>
                <p>安装时允许选择包含 manifest.json 的开发文件夹，而不只是 .cdapp 文件。</p>
                <span class="security-note">未打包代码会直接运行，只加载你信任的项目。</span>
              </div>
              <md-switch
                class="toggle"
                :selected.prop="loadUnpackedFolders"
                :disabled.prop="saving || !developerOptions"
                aria-label="加载未打包的文件夹"
                @change="updateSetting('loadUnpackedFolders', $event)"
              />
            </div>
          </div>
        </section>
      </section>

      <div v-if="error && (section === 'developer' || searchQuery)" class="inline-error" role="alert">{{ error }}</div>
    </main>
  </div>
</template>

<style scoped>
.settings-page {
  --md-sys-color-primary: #555b91;
  --md-sys-color-on-primary: #fff;
  --md-sys-color-primary-container: #dfe1ff;
  --md-sys-color-on-primary-container: #11174b;
  --md-sys-color-secondary-container: #e2e1f9;
  --md-sys-color-on-secondary-container: #191a2c;
  --md-sys-color-surface: #f8f7fc;
  --md-sys-color-surface-container: #f0eff5;
  --md-sys-color-surface-container-high: #e9e8ef;
  --md-sys-color-on-surface: #1b1b21;
  --md-sys-color-on-surface-variant: #474750;
  --md-sys-color-outline: #777780;
  --md-sys-color-outline-variant: #c7c6d0;
  --md-sys-color-error: #ba1a1a;
  --md-primary: #555b91;
  --md-on-primary: #fff;
  --md-primary-container: #dfe1ff;
  --md-on-primary-container: #11174b;
  --md-secondary-container: #e2e1f9;
  --md-on-secondary-container: #191a2c;
  --md-tertiary-container: #f5ddeb;
  --md-on-tertiary-container: #30172a;
  --md-surface: #f8f7fc;
  --md-surface-container: #f0eff5;
  --md-surface-container-high: #e9e8ef;
  --md-surface-container-lowest: #fff;
  --md-outline: #777780;
  --md-outline-variant: #c7c6d0;
  --md-on-surface: #1b1b21;
  --md-on-surface-variant: #474750;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--md-on-surface);
  background: var(--md-surface);
  font-family: "Google Sans", "Segoe UI", "Microsoft YaHei", sans-serif;
}

.settings-sidebar {
  display: flex;
  flex: 0 0 270px;
  flex-direction: column;
  padding: 30px 16px 16px;
  background: var(--md-surface-container);
}
.sidebar-brand { display: flex; align-items: center; gap: 13px; padding: 0 12px 28px; color: var(--md-on-surface); font-size: 21px; font-weight: 500; letter-spacing: -.035em; }
.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; border-radius: 13px; color: var(--md-on-primary-container); background: var(--md-primary-container); }
.brand-mark svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.settings-search { display: flex; width: 100%; margin: 0 0 29px; --md-outlined-text-field-container-shape: 17px; --md-outlined-text-field-container-color: var(--md-surface-container-high); --md-outlined-text-field-outline-color: transparent; --md-outlined-text-field-hover-outline-color: var(--md-outline-variant); --md-outlined-text-field-focus-outline-color: var(--md-primary); --md-outlined-text-field-input-text-size: 13px; --md-outlined-text-field-input-text-color: var(--md-on-surface); --md-outlined-text-field-input-text-placeholder-color: var(--md-on-surface-variant); --md-outlined-text-field-leading-icon-color: var(--md-on-surface-variant); --md-outlined-text-field-trailing-icon-color: var(--md-on-surface-variant); }
.settings-search [slot="leading-icon"] { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.settings-search md-icon-button { --md-icon-button-icon-color: var(--md-on-surface-variant); }
.settings-search md-icon-button svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.section-nav { display: grid; align-content: start; gap: 3px; }
.sidebar-label { padding: 0 12px 10px; color: var(--md-on-surface-variant); font-size: 11px; font-weight: 600; }
.nav-button { display: flex; align-items: center; gap: 16px; width: 100%; min-height: 48px; padding: 0 17px; border: 0; border-radius: 999px; color: var(--md-on-surface-variant); background: transparent; text-align: left; font-size: 13px; cursor: pointer; transition: background .15s ease, color .15s ease; }
.nav-button:hover { background: #e7e6ed; }
.nav-button.selected { color: var(--md-on-secondary-container); background: var(--md-secondary-container); font-weight: 600; }
.nav-icon { width: 20px; height: 20px; flex: 0 0 20px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.sidebar-footer { display: flex; align-items: center; gap: 10px; margin-top: auto; padding: 16px 10px 3px; border-top: 1px solid var(--md-outline-variant); }
.footer-avatar { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 50%; color: var(--md-on-primary); background: var(--md-primary); font-size: 14px; font-weight: 600; }
.footer-copy { display: grid; gap: 2px; min-width: 0; }
.footer-copy strong { color: var(--md-on-surface); font-size: 11px; font-weight: 600; }
.footer-copy span { color: var(--md-on-surface-variant); font-size: 10px; }
.version { margin-left: auto; color: var(--md-on-surface-variant); font-size: 10px; font-variant-numeric: tabular-nums; }

.settings-content { flex: 1; min-width: 0; overflow: auto; padding: 0 clamp(30px, 6vw, 88px) 48px; }
.content-topline { position: sticky; z-index: 2; top: 0; display: flex; align-items: center; justify-content: space-between; min-height: 60px; margin: 0 calc(clamp(30px, 6vw, 88px) * -1) 28px; padding: 0 clamp(30px, 6vw, 88px); border-bottom: 1px solid #e6e5ec; background: #f8f7fced; backdrop-filter: blur(12px); }
.breadcrumbs { display: flex; align-items: center; gap: 12px; color: var(--md-on-surface-variant); font-size: 12px; }
.breadcrumbs strong { color: var(--md-on-surface); font-weight: 600; }
.breadcrumb-divider { color: #85858e; font-size: 18px; }
.save-state { display: flex; align-items: center; gap: 8px; color: var(--md-on-surface-variant); font-size: 11px; }
.save-spinner, .loading-spinner { width: 14px; height: 14px; border: 2px solid var(--md-outline-variant); border-top-color: var(--md-primary); border-radius: 50%; animation: spin .75s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.content-section { max-width: 900px; margin: 0 auto; }
.page-heading { margin: 0 0 30px; }
.page-heading h1 { margin: 0 0 8px; color: var(--md-on-surface); font-size: 32px; font-weight: 400; letter-spacing: -.035em; }
.page-heading p { margin: 0; color: var(--md-on-surface-variant); font-size: 13px; line-height: 1.6; }
.settings-section { margin: 0 0 30px; }
.section-heading { margin: 0 0 12px; padding: 0 4px; }
.section-heading h2 { margin: 0; color: var(--md-on-surface); font-size: 15px; font-weight: 500; }
.settings-card { overflow: hidden; border: 1px solid transparent; border-radius: 22px; background: var(--md-surface-container-lowest); box-shadow: 0 1px 2px #28283a0a; }
.setting-row, .info-card { display: flex; align-items: center; gap: 18px; min-height: 88px; padding: 0 24px; }
.setting-row + .setting-row { border-top: 1px solid #e9e8ef; }
.setting-symbol { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 15px; color: var(--md-on-primary-container); background: var(--md-primary-container); }
.setting-symbol svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.security-symbol { color: var(--md-on-tertiary-container); background: var(--md-tertiary-container); }
.developer-symbol { color: var(--md-on-secondary-container); background: var(--md-secondary-container); }
.folder-symbol { color: #4a6346; background: #e2edda; }
.setting-copy { flex: 1; min-width: 0; padding: 17px 0; }
.setting-copy h3 { margin: 0; color: var(--md-on-surface); font-size: 14px; font-weight: 500; }
.setting-copy p { margin: 5px 0 0; color: var(--md-on-surface-variant); font-size: 12px; line-height: 1.55; }
.toggle { flex: 0 0 auto; --md-switch-selected-track-color: var(--md-primary); --md-switch-selected-hover-track-color: var(--md-primary); --md-switch-selected-focus-track-color: var(--md-primary); --md-switch-selected-pressed-track-color: var(--md-primary); --md-switch-track-color: var(--md-surface-container-high); --md-switch-track-outline-color: var(--md-outline); --md-switch-handle-color: var(--md-outline); --md-switch-selected-handle-color: var(--md-on-primary); --md-switch-selected-hover-handle-color: var(--md-on-primary); --md-switch-selected-focus-handle-color: var(--md-on-primary); --md-switch-selected-pressed-handle-color: var(--md-on-primary); }
.error-panel md-text-button { --md-text-button-label-text-color: var(--md-primary); }
.safe-badge { flex: 0 0 auto; padding: 7px 12px; border-radius: 999px; color: #385b3d; background: #e3efdf; font-size: 11px; font-weight: 500; }
.row-arrow { color: var(--md-on-surface-variant); font-size: 22px; }
.developer-notice { display: flex; align-items: flex-start; gap: 14px; margin: 0 0 24px; padding: 17px 20px; border: 1px solid transparent; border-radius: 18px; background: #f7edda; }
.notice-symbol { display: grid; width: 22px; height: 22px; flex: 0 0 22px; place-items: center; border-radius: 50%; color: #60491f; background: #ecd39e; font-size: 13px; font-weight: 700; }
.developer-notice p { margin: 1px 0 0; color: #51452f; font-size: 12px; line-height: 1.6; }
.nested-row { transition: opacity .15s ease; }
.nested-row.disabled { opacity: .48; }
.security-note { display: inline-block; margin-top: 7px; color: #705c38; font-size: 11px; }
.search-results { padding: 0 18px; }
.search-result { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 76px; padding: 0; border-bottom: 1px solid #e9e8ef; color: inherit; background: transparent; text-align: left; cursor: pointer; }
.search-result:last-child { border-bottom: 0; }
.search-result:hover .result-copy strong { color: var(--md-primary); }
.result-icon { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 14px; color: var(--md-on-primary-container); background: var(--md-primary-container); }
.result-icon svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.result-copy { display: grid; gap: 4px; flex: 1; min-width: 0; }
.result-copy strong { color: var(--md-on-surface); font-size: 13px; font-weight: 500; }
.result-copy small { color: var(--md-on-surface-variant); font-size: 11px; }
.result-category { color: var(--md-on-surface-variant); font-size: 11px; }
.result-arrow { color: var(--md-on-surface-variant); font-size: 21px; }
.empty-results { padding: 48px 18px; border-radius: 20px; color: var(--md-on-surface-variant); background: var(--md-surface-container); text-align: center; font-size: 13px; }
.loading-panel { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 220px; color: var(--md-on-surface-variant); font-size: 13px; }
.error-panel { display: flex; align-items: center; justify-content: space-between; gap: 14px; max-width: 840px; margin: 0 auto; padding: 16px 20px; border: 1px solid transparent; border-radius: 16px; color: #791d1d; background: #f9dedc; font-size: 12px; }
.error-panel button { border: 0; color: var(--md-primary); background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; }
.inline-error { max-width: 840px; margin: 12px auto 0; color: #791d1d; font-size: 12px; }

@media (max-width: 760px) {
  .settings-sidebar { flex-basis: 220px; padding-right: 10px; padding-left: 10px; }
  .settings-content { padding-right: 24px; padding-left: 24px; }
  .content-topline { margin-right: -24px; margin-left: -24px; padding-right: 24px; padding-left: 24px; }
  .setting-row, .info-card { gap: 13px; padding-right: 18px; padding-left: 18px; }
  .safe-badge { display: none; }
}
@media (max-width: 560px) {
  .settings-sidebar { flex-basis: 58px; align-items: center; padding: 18px 5px 12px; }
  .sidebar-brand { padding: 0 0 24px; }
  .sidebar-brand strong, .settings-search, .sidebar-label, .nav-button > span, .sidebar-footer { display: none; }
  .section-nav { width: 100%; }
  .nav-button { justify-content: center; padding: 0; border-radius: 20px; }
  .settings-content { padding-right: 16px; padding-left: 16px; }
  .content-topline { margin-right: -16px; margin-left: -16px; padding-right: 16px; padding-left: 16px; }
  .page-heading h1 { font-size: 21px; }
  .setting-row, .info-card { gap: 10px; padding-right: 12px; padding-left: 12px; }
  .result-category { display: none; }
  .setting-symbol { width: 36px; height: 36px; flex-basis: 36px; border-radius: 13px; }
}
</style>
