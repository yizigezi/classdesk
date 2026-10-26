import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// 独立应用包的构建：产物 → .apps-build/<id>/，再由 scripts/build-apps.mjs 打成 .cdapp
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('../../.apps-build/cn.yizigezi.pptx', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022'
  }
})
