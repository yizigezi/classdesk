import {
  defineConfig,
  presetAttributify,
  presetWind,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'

export default defineConfig({
  // 只扫描外壳源码
  content: {
    filesystem: ['src/renderer/index.html', 'src/renderer/src/**/*.{html,js,ts,jsx,tsx,vue}']
  },
  presets: [presetWind(), presetAttributify()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  // 懒加载的演示引擎自带同名工具类（.h-16 等，定义还不同），样式随 chunk 后注入会盖掉壳层；
  // 这里给壳层工具类抬一级优先级（:not(#_) 的选择器特异性），互不打架
  postprocess: (util) => {
    if (util.selector) util.selector = util.selector.split(',').map((s) => `${s}:not(#_)`).join(',')
  },
  theme: {
    colors: {
      ink: {
        900: '#222222',
        700: '#333333',
        500: '#666666',
        300: '#999999',
        200: '#c5c5c5'
      },
      surface: {
        green: '#eaf1e8',
        blue: '#e8f0fe',
        beige: '#f7f4ec',
        bar: '#2b2d31'
      }
    },
    borderRadius: {
      card: '20px',
      inner: '12px',
      tile: '8px',
      pill: '999px'
    },
    boxShadow: {
      card: '0 2px 8px rgba(0, 0, 0, 0.05)'
    },
    dropShadow: {
      bar: '0 1px 3px rgba(0, 0, 0, 0.38)'
    }
  }
})
