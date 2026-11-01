# cdapp 应用开发文档

本文介绍如何为 **QuickClass DE** 开发、调试、打包和分发应用。这里的“应用”指运行在桌面壳层中间区域的独立应用包，不包括由壳层直接实现的设置等内置页面。

> **实现状态说明**
>
> 本文以仓库当前实现为准。应用包、iframe 容器、底栏操作桥和应用设置库已经实现；权限系统目前仍是预留接口，声明权限并不代表权限已被检查或限制。当前也没有正式的应用生命周期钩子、应用 API 版本协商或应用签名验证机制。

## 1. 应用类型与运行模型

QuickClass DE 中有三类页面：

| 类型 | 示例 | 加载方式 | 是否可卸载 |
| --- | --- | --- | --- |
| 壳层内置页面 | 设置 `cn.yizigezi.settings` | 由桌面壳层直接渲染 | 否 |
| 内置应用包 | 演示 `cn.yizigezi.pptx`、展台 `cn.yizigezi.doccam` | 随程序分发，加载应用包 | 否 |
| 用户应用 | 用户安装的本地应用或网页应用 | 从应用仓库扫描并加载 | 是 |

应用包和网页应用都显示在应用列表中，并在中间内容区域通过 iframe 运行。壳层负责窗口、导航、任务栏和底栏；应用负责自己的页面内容。应用可以通过 `postMessage` 桥注册底栏操作和读写自己的持久化设置。

### 1.1 应用仓库位置

- 用户应用：`<应用根目录>/apps/`
- 开发版内置应用：`dist-apps/`
- 打包版内置应用：`resources/apps-system/`

应用根目录的选择规则：

1. 设置了环境变量 `CLASSDESK_APPS_DIR` 时，使用该目录。
2. 打包运行时，默认使用 exe 所在目录。
3. 开发运行时，默认使用项目根目录。
4. 如果默认根目录不可写，用户应用仓库回退到 Electron 的 `userData/apps/`。

应用数据库 `classdesk.db` 也位于应用根目录。启动时壳层会扫描内置应用目录和用户应用目录。用户应用优先于同 ID 的内置应用进行协议资源查找；保留 ID 不允许作为用户应用安装。

## 2. 应用包格式

当前支持两种本地应用包：

- **未打包文件夹**：适合开发和调试。文件夹名必须与 `manifest.json` 中的 `id` 一致。
- **`.cdapp` 文件**：发布格式，本质上是一个 Asar 归档，扩展名仅用于标识 QuickClass DE 应用包。

两种格式内部的文件布局相同：

```text
cn.yizigezi.hello/
├── manifest.json       # 必需：应用元数据
├── index.html          # 默认入口
├── icon.png            # 可选：应用图标
├── assets/
│   ├── index.js
│   └── style.css
└── ...
```

入口文件由 `manifest.entry` 指定，路径相对于应用包根目录。应用资源通过 `classdesk-app://<应用ID>/<相对路径>` 访问，例如：

```text
classdesk-app://cn.yizigezi.hello/index.html
classdesk-app://cn.yizigezi.hello/assets/style.css
```

应用协议同时支持文件夹包和 `.cdapp`，并会拒绝目录穿越路径。应用资源应使用相对路径或上述应用协议，不要假设发布后的文件仍位于开发时的磁盘路径。

## 3. manifest.json

### 3.1 字段说明

| 字段 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 应用唯一 ID，必须符合 ID 格式规则 |
| `name` | string | 是 | 应用显示名称 |
| `version` | string | 否 | 应用版本；未填写时运行时显示为 `0.0.0` |
| `icon` | string | 否 | 内置图标名称，或包内图标文件路径 |
| `entry` | string | 否 | 本地应用入口，默认 `index.html` |
| `description` | string | 否 | 应用简介 |
| `author` | string | 否 | 作者信息 |
| `permissions` | string[] | 否 | 权限声明；当前仅作为元数据传递，尚未执行授权 |
| `type` | `"app" \| "web"` | 否 | 应用类型，默认按本地应用处理 |
| `url` | string | 网页应用必需 | `type: "web"` 时使用的网页地址 |

本地应用示例：

```json
{
  "id": "cn.yizigezi.hello",
  "name": "Hello QuickClass",
  "version": "1.0.0",
  "icon": "icon.png",
  "entry": "index.html",
  "description": "一个简单的示例应用",
  "author": "Your Name",
  "permissions": []
}
```

网页应用示例：

```json
{
  "id": "cn.yizigezi.example-web",
  "name": "示例网页",
  "version": "1.0.0",
  "type": "web",
  "url": "https://example.com",
  "description": "网页应用示例",
  "author": "Your Name",
  "permissions": ["net"]
}
```

网页应用的 `url` 只接受 `http:` 和 `https:`。在应用管理界面使用“添加网页”时，壳层会自动生成网页应用目录和 manifest，并尝试获取网站图标。

### 3.2 ID 规则

应用 ID 使用小写包名风格，推荐使用反向域名：

```text
cn.yizigezi.hello
com.example.notes
org.example.my-tool
```

当前格式规则为：小写字母和数字组成各段，段之间可使用 `.`、`_`、`-` 分隔。文件夹包的目录名或 `.cdapp` 文件名（不含后缀）必须与 manifest 的 `id` 完全一致。

以下 ID 为壳层保留，不能用于用户应用：

- `launcher`
- `system`
- `cn.yizigezi.settings`

建议发布后不要随意更改应用 ID，因为应用设置以 ID 作为隔离范围。

### 3.3 图标

`icon` 支持两种形式：

- 内置图标名称，例如内置应用使用的 `slide`、`camera`。
- 应用包内的图标文件，例如 `icon.png`、`assets/icon.svg`。

使用文件路径时，图标文件必须包含在应用包中。图标路径相对于应用包根目录。

## 4. 创建应用项目

推荐使用现有的 Vue + Vite 应用作为起点。仓库中的示例应用源码位于：

- `apps-src/pptx/`：演示应用，包含底栏操作和设置桥接用法。
- `apps-src/doccam/`：展台应用，包含摄像头相关页面逻辑。
- `examples/cn.yizigezi.hello/`：简单的静态 HTML 示例。

一个独立的 Vue 应用目录可以组织为：

```text
apps-src/hello/
├── manifest.json
├── index.html
├── vite.config.ts
└── src/
    ├── main.ts
    ├── App.vue
    └── bridge.ts
```

Vite 配置需要设置相对资源基路径，并把构建产物输出到对应的临时目录。下面是结构示意，应用 ID 和目录名需要保持一致：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  build: {
    outDir: fileURLToPath(
      new URL('../../.apps-build/cn.yizigezi.hello', import.meta.url)
    ),
    emptyOutDir: true,
    target: 'es2022'
  }
})
```

请确保构建入口最终生成 `index.html`，且 HTML 引用的 JS、CSS、图片等资源均位于构建输出目录中。

## 5. 应用与壳层通信

### 5.1 通信约定

应用和壳层通过 iframe 的 `window.postMessage` 通信。消息使用 `source` 字段区分方向：

- 应用发给壳层：`source: "classdesk-app"`
- 壳层发给应用：`source: "classdesk-shell"`

当前实现的消息如下：

| 方向 | `type` | 主要字段 | 用途 |
| --- | --- | --- | --- |
| 应用 → 壳层 | `actions` | `left`、`right` | 注册或更新底栏操作 |
| 应用 → 壳层 | `settings.get` | `key`、`reqId` | 读取应用设置 |
| 应用 → 壳层 | `settings.set` | `key`、`value`、`reqId` | 写入应用设置 |
| 应用 → 壳层 | `settings.list` | `reqId` | 获取当前应用的全部设置 |
| 壳层 → 应用 | `invoke` | `id` | 用户点击底栏操作 |
| 壳层 → 应用 | `visibility` | `visible` | 应用切换前台或后台 |
| 壳层 → 应用 | `settings.result` | `reqId`、`value` | 返回设置请求结果 |

手动实现协议时，应用发送消息的基本形式如下：

```ts
window.parent.postMessage(
  {
    source: 'classdesk-app',
    type: 'settings.get',
    key: 'theme',
    reqId: 1
  },
  '*'
)
```

接收消息时，应检查 `event.data.source` 和 `event.data.type`。壳层当前还会检查消息是否来自对应 iframe 的 `contentWindow`。请求响应通过 `reqId` 对应；不要在同一个请求序列中重复使用尚未完成的 ID。

### 5.2 使用官方桥接模块

Vue 应用可以直接复制 `apps-src/pptx/src/bridge.ts` 或 `apps-src/doccam/src/bridge.ts`，按项目路径调整后导入。桥接模块提供以下接口：

| API | 返回值 | 说明 |
| --- | --- | --- |
| `setActions({ left, right })` | void | 注册底栏左右两组操作 |
| `onInvoke(handler)` | void | 注册底栏操作回调 |
| `settingsGet(key)` | `Promise<unknown>` | 读取设置 |
| `settingsSet(key, value)` | `Promise<unknown>` | 写入设置 |
| `settingsList()` | `Promise<unknown>` | 列出所有设置 |

设置请求当前有 8 秒超时；超时后 Promise 会以 `null` 完成。调用方应考虑空值情况，并自行检查返回值类型。

示例：

```ts
import * as bridge from './bridge'

bridge.setActions({
  left: [
    { id: 'previous', label: '上一页' },
    { id: 'next', label: '下一页' }
  ],
  right: [
    { id: 'toggle-help', label: '帮助' }
  ]
})

bridge.onInvoke((id) => {
  switch (id) {
    case 'previous':
      console.log('上一页')
      break
    case 'next':
      console.log('下一页')
      break
    case 'toggle-help':
      console.log('切换帮助面板')
      break
  }
})

const savedTheme = await bridge.settingsGet('theme')
await bridge.settingsSet('theme', 'dark')
const allSettings = await bridge.settingsList()
```

### 5.3 底栏操作项

每个操作项使用以下结构：

```ts
interface ActionDTO {
  id: string
  label: string
  icon?: string
  active?: boolean
  disabled?: boolean
  info?: boolean
}

interface ActionsPayload {
  left: ActionDTO[]
  right: ActionDTO[]
}
```

- `id`：应用内唯一的操作标识，点击后通过 `invoke` 消息返回。
- `label`：显示文本。
- `icon`：可选的壳层内置图标名称；应使用项目图标注册表中存在的名称。
- `active`：是否显示为激活状态。
- `disabled`：是否禁用操作。
- `info`：信息展示项，不作为可点击操作，适合页码或状态文字。

`left` 区域位于系统导航操作之后；`right` 区域位于任务栏 / 实时操作区域外侧。每次调用 `setActions` 都会更新该应用注册的操作集合。

### 5.4 可见性通知

壳层切换应用前后台时发送：

```ts
{
  source: 'classdesk-shell',
  type: 'visibility',
  visible: true
}
```

桥接模块会将状态写入：

```js
document.body.dataset.visible
```

值为 `"1"` 表示当前可见，`"0"` 表示当前不可见。应用可以监听属性变化，暂停不必要的动画、计时器或媒体任务。

当前应用容器使用常驻 iframe 并通过显示状态切换应用，因此切换到后台不等于销毁页面。

## 6. 应用设置存储

QuickClass DE 提供基于 Node 内置 `node:sqlite` 的 SQLite 设置库，数据库文件为 `classdesk.db`，配置表按 `scope` 隔离。

- 系统设置使用 `system` scope。
- 外部应用的 scope 由壳层固定为当前应用 ID，应用不能通过桥接接口指定其他应用的 scope。

应用通过桥接 API 访问：

```ts
await bridge.settingsSet('recentFile', 'lesson.pptx')

const recentFile = await bridge.settingsGet('recentFile')
const settings = await bridge.settingsList()
```

设置值通过 JSON 序列化保存。建议只保存可 JSON 序列化的数据，例如字符串、数字、布尔值、数组和普通对象；不要保存函数、DOM 节点或循环引用对象。

应用卸载与设置数据清理不是同一操作；不要假设卸载应用会自动清除其设置。应用升级时如果需要迁移数据，可以在自己的设置中保存数据版本号并自行执行迁移。

## 7. UI 与壳层集成约定

应用页面运行在壳层中间区域的 iframe 内。壳层保留自己的导航、任务栏和底栏，应用不应尝试替换或覆盖整个桌面窗口。

开发 UI 时建议遵守以下约定：

- 页面尺寸由中间内容区域决定，使用响应式布局，不要假设固定窗口宽高。
- 需要系统级底栏按钮时使用 `setActions`，不要在页面中伪造壳层底栏。
- 对于长时间运行的动画、视频或高频任务，监听可见性状态，在后台时适当暂停。
- 通过相对资源路径或 `classdesk-app://` 加载本地资源。
- 网页应用受目标网站的 iframe 嵌入策略限制；若网站通过 `X-Frame-Options` 或 CSP `frame-ancestors` 禁止嵌入，页面可能无法正常显示。

## 8. 开发与调试

### 8.1 启用未打包文件夹加载

默认情况下，用户安装入口只接受 `.cdapp`。开发调试时：

1. 打开 QuickClass DE 的「设置」。
2. 进入「开发者选项」并启用开发者选项。
3. 单独启用「加载未打包的文件夹」。
4. 打开应用列表 →「管理」→「安装应用」，选择未打包应用文件夹。

关闭文件夹加载后，用户应用目录中的未打包文件夹不会出现在应用列表中，也不能通过应用协议加载。关闭开发者选项会同时关闭文件夹加载。主进程会再次检查这两个开关，不只依赖界面状态。

未打包文件夹中的代码会直接运行，只应加载自己编写或完全信任的应用。

### 8.2 调试建议

- 先在普通浏览器中检查 Vite 页面是否能独立运行。
- 再将应用文件夹加载到 QuickClass DE 中，检查 iframe 环境下的布局和资源路径。
- 使用开发者工具检查 Console、Network 和 iframe 消息。
- 检查底栏操作是否正确注册，点击后是否收到对应的 `invoke`。
- 切换应用前后台，确认 `visibility` 通知能正确暂停和恢复页面任务。
- 检查设置读写是否成功，并处理超时返回的 `null`。
- 打包后再测试一次，避免只在 Vite 开发服务器下正常、在应用协议下资源路径失效。

## 9. 构建与发布

### 9.1 当前内置应用构建配置

应用构建脚本为 `scripts/build-apps.mjs`。当前脚本中的应用列表是显式维护的：

```js
const APPS = [
  { id: 'cn.yizigezi.pptx', dir: 'pptx' },
  { id: 'cn.yizigezi.doccam', dir: 'doccam' }
]
```

新增需要随程序分发的内置应用时，除了创建源码目录、manifest 和 Vite 配置，还需要将应用加入该列表。仅把源码放进 `apps-src/` 并不会自动被构建。

### 9.2 构建命令

在项目根目录执行：

```bash
# 只构建内置应用包
npm run build:apps

# 等价命令
node scripts/build-apps.mjs

# 构建桌面壳层
npm run build:shell

# 执行项目完整构建（包含应用包构建和 Windows x64 打包）
npm run build
```

应用构建流程：

1. 对脚本列表中的每个应用运行对应的 Vite 配置。
2. Vite 产物输出到 `.apps-build/<应用ID>/`。
3. 将源码目录中的 `manifest.json` 复制到构建产物根目录。
4. 使用 `@electron/asar` 将构建目录归档为 `dist-apps/<应用ID>.cdapp`。

打包桌面程序时，`package.json` 的 electron-builder 配置会把 `dist-apps/` 中的 `.cdapp` 文件复制到程序资源目录 `apps-system/`。

### 9.3 发布前检查

- [ ] `manifest.json` 的 ID 合法，且与应用目录 / 包文件名一致。
- [ ] 入口文件确实存在，且所有静态资源均进入构建产物。
- [ ] 图标路径正确，或使用有效的内置图标名。
- [ ] 不依赖开发机的绝对路径、Vite 开发服务器或本地临时文件。
- [ ] 设置读写、底栏操作和可见性通知均已测试。
- [ ] 已在实际打包产物中验证应用能够启动。
- [ ] 已检查应用声明的权限与实际功能是否一致，并理解当前权限系统尚未启用。

## 10. 安全模型与当前限制

### 10.1 当前已有的保护

- 应用页面在 iframe 中运行，不直接作为壳层 Vue 页面挂载。
- iframe 使用 sandbox 属性，并显式开放脚本、同源、表单、弹窗、下载和模态窗口等能力。
- 壳层处理桥接消息时会检查消息来源是否为当前应用 iframe，并检查消息标识。
- 应用协议限制应用 ID 和相对资源路径，并对文件夹包执行根目录路径检查。
- 应用 ID 有格式校验和保留名称检查。

### 10.2 尚未实现的安全能力

**当前权限系统未启用。** `src/renderer/src/platform/permissions.ts` 中的 `checkPermission` 和 `requestPermission` 目前始终返回允许。manifest 中的 `permissions` 只是声明，不构成访问控制。

代码中预留的权限标识包括：

| 权限 ID | 规划用途 |
| --- | --- |
| `fs.read` | 读取应用包之外的文件 |
| `fs.write` | 写入文件 |
| `device.removable` | 访问可移动存储 |
| `net` | 联网 |
| `shell.open` | 调用系统程序打开文件或目录 |

当前示例展台应用声明了 `camera`，但这也不代表存在完整的应用级摄像头授权流程。主进程目前对本地应用协议、file 页面和本机开发地址的部分媒体 / 剪贴板权限请求做统一处理，并非基于 manifest 的逐应用权限决策。

此外，当前没有：

- 应用包签名、发布者身份验证或完整性校验。
- 正式的应用生命周期回调（例如 `onInit`、`onDestroy`）。
- 应用 API 版本协商、最低宿主版本字段或自动兼容性检查。
- 面向第三方应用的完整文件系统、系统服务或原生模块 API。

因此，`.cdapp` 只是归档格式，不是可信来源证明。不要安装来源不明的应用包，也不要把未打包文件夹加载开关当作安全沙箱。

## 11. 兼容性与开发约定

目前 manifest 没有 `minHostVersion`、`apiVersion` 等字段，宿主也不会根据应用版本自动阻止加载。开发者应：

1. 使用文档中已实现的桥接消息和 API，不依赖未公开的主进程内部实现。
2. 对设置返回值进行类型检查，并兼容 `null`。
3. 不假设页面在切换后台时会被销毁。
4. 避免依赖未承诺的系统图标名称或内部 CSS 类名。
5. 当桥接协议发生不兼容变化时，同步更新应用和宿主，并在发布说明中注明适用版本。

## 12. 参考源码

以下源码是理解当前行为的主要依据：

| 文件 | 内容 |
| --- | --- |
| `src/shared/types.ts` | `AppManifest`、`InstalledApp` 等类型 |
| `src/main/appkg.ts` | 文件夹包 / Asar 包读取、ID 规则、路径处理 |
| `src/main/index.ts` | 应用扫描、安装卸载、应用协议、网页应用创建 |
| `src/renderer/src/components/ExternalAppFrame.vue` | iframe 容器、桥接消息处理、底栏操作和可见性通知 |
| `src/renderer/src/platform/contract.ts` | 壳层操作项类型 |
| `src/renderer/src/platform/permissions.ts` | 预留权限接口 |
| `apps-src/pptx/src/bridge.ts` | 应用侧桥接模块示例 |
| `scripts/build-apps.mjs` | 内置应用构建与 `.cdapp` 打包 |
| `apps-src/pptx/` | Vue 应用开发参考 |
| `apps-src/doccam/` | 摄像头类应用开发参考 |
| `examples/cn.yizigezi.hello/` | 静态 HTML 示例 |
