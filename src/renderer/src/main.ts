import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { translationsEn, toVueI18nSyntax } from 'pptx-vue-viewer/i18n'
import { translationsZhCN } from 'pptx-vue-viewer/i18n/zh-CN'
import App from './App.vue'
import { installMockDesk } from './platform/mockDesk'
import 'virtual:uno.css'
import './style.css'

// 浏览器预览（无 Electron）且带 ?mock=1 时启用假数据，Electron 里不生效
installMockDesk()

// pptx-vue-viewer 的界面文案走 vue-i18n（peer 依赖）。
// 中文词典沿用共享词典的 {{var}} 插值约定，交给组件导出的转换器转成 vue-i18n 的单花括号语法。
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: {
    en: translationsEn,
    'zh-CN': toVueI18nSyntax(translationsZhCN)
  }
})

createApp(App).use(createPinia()).use(i18n).mount('#app')
