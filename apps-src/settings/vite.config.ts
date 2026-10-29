import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(new URL('../../.apps-build/cn.yizigezi.settings', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022'
  }
})
