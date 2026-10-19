import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import Icons from 'unplugin-icons/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const pptistSrc = path.resolve(__dirname, 'vendor/pptist/src')
const appSrc = path.resolve(__dirname, 'src/renderer/src')

const RESOLVE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.vue', '.json', '.svg', '.css', '.scss']

function resolveFile(base: string): string | null {
  for (const ext of RESOLVE_EXTS) {
    const file = base + ext
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file
  }
  for (const ext of ['.ts', '.js']) {
    const file = path.join(base, 'index' + ext)
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file
  }
  return null
}

/**
 * PPTist 源码内部用 `@/` 指向它自己的 src，外壳代码用 `@/` 指向 src/renderer/src。
 * 这里按「发起 import 的文件」归属哪一侧来决定解析到哪个目录，
 * 双方源码都不需要改动（薄封装接入的关键）。
 */
function pptistAwareAlias(): Plugin {
  return {
    name: 'classdesk:pptist-aware-alias',
    enforce: 'pre',
    resolveId(source: string, importer?: string) {
      if (!source.startsWith('@/')) return null
      const importerFile = (importer ?? '').split('?')[0]
      const inPptist = importerFile === pptistSrc || importerFile.startsWith(pptistSrc + path.sep)
      return resolveFile(path.resolve(inPptist ? pptistSrc : appSrc, source.slice(2)))
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    // PPTist 的 mock 数据 / 图片等公共资源（./mocks/slides.json 等）
    publicDir: path.resolve(__dirname, 'vendor/pptist/public'),
    resolve: {
      alias: [
        // 外壳接入 PPTist 的桥接入口（见 src/renderer/src/pptist/）
        { find: /^@ppt\//, replacement: pptistSrc + '/' }
      ]
    },
    plugins: [
      vue(),
      pptistAwareAlias(),
      // 以下两个插件与 PPTist 的 vite.config.ts 保持一致（仅修正 custom 图标目录为 vendor 下的实际路径）
      Components({
        dirs: [],
        dts: false,
        resolvers: [
          IconsResolver({
            prefix: 'i',
            customCollections: ['custom']
          })
        ]
      }),
      Icons({
        compiler: 'vue3',
        autoInstall: false,
        customCollections: {
          custom: FileSystemIconLoader(path.resolve(__dirname, 'vendor/pptist/src/assets/icons'))
        },
        scale: 1,
        defaultClass: 'i-icon'
      }),
      UnoCSS()
    ],
    css: {
      preprocessorOptions: {
        scss: {
          // 与 PPTist 的 vite.config.ts 一致：全局注入变量/混入（路径用 @ppt/ 桥接别名）
          additionalData: `
            @import '@ppt/assets/styles/variable.scss';
            @import '@ppt/assets/styles/mixin.scss';
          `
        }
      }
    },
    build: {
      // PPTist（echarts / prosemirror / pptx 解析等）整体走懒加载大 chunk，仅提示阈值上调
      chunkSizeWarningLimit: 6000
    }
  }
})
