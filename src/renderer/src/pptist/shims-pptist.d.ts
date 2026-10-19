/**
 * PPTist 类型豁免：
 * vendor/pptist 整体不参与 classdesk 的 TypeScript 检查（tsconfig.web.json 的 include
 * 只覆盖 src/renderer/src + preload），PPTist 侧由它自己的 tsconfig/vue-tsc 约束。
 * 外壳只桥接它的入口模块，这里给出宽松声明即可。
 */
declare module '@ppt/App.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '@ppt/directive' {
  import type { Plugin } from 'vue'
  const directivePlugin: Plugin
  export default directivePlugin
}
