import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { installMockDesk } from './platform/mockDesk'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/button/text-button.js'
import '@material/web/switch/switch.js'
import '@material/web/textfield/outlined-text-field.js'
import 'virtual:uno.css'
import './style.css'

// 浏览器预览（无 Electron）且带 ?mock=1 时启用假数据，Electron 里不生效
installMockDesk()

createApp(App).use(createPinia()).mount('#app')
