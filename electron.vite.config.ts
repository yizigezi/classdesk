import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import path from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: [{ find: /^@\//, replacement: path.resolve(__dirname, 'src/renderer/src') + '/' }]
    },
    plugins: [vue(), UnoCSS()],
    build: {
      // 大 chunk 的常规压缩在 scripts/build.mjs 的后置步骤逐文件完成；
      // CLASSDESK_NO_MINIFY=1（构建脚本传入）时本阶段不压缩，避开 4G 机器上的 OOM
      minify: process.env.CLASSDESK_NO_MINIFY ? false : 'esbuild',
      chunkSizeWarningLimit: 6000
    }
  }
})
