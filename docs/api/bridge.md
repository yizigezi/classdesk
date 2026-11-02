# 应用与壳层通信 API

本页说明 cdapp iframe 应用与 QuickClass DE 桌面壳层之间的通信协议。应用包结构和开发流程见[应用开发文档](../apps.md)。

## 1. 通信机制

应用运行在壳层创建的 iframe 中，通过 `window.postMessage` 与父级壳层通信。

消息方向由 `source` 字段标识：

| 方向 | source |
| --- | --- |
| 应用 → 壳层 | `classdesk-app` |
| 壳层 → 应用 | `classdesk-shell` |

应用发送消息的基本形式：

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

接收方应验证消息的 `source`、`type` 和字段类型。宿主当前会检查消息是否来自对应应用 iframe。示例中的 `'*'` 是 postMessage 的 targetOrigin 参数；如果应用已知宿主 origin，应优先使用明确的 origin。

## 2. 消息目录

| 方向 | type | 字段 | 用途 |
| --- | --- | --- | --- |
| 应用 → 壳层 | `actions` | `left`、`right` | 注册或更新底栏操作 |
| 应用 → 壳层 | `settings.get` | `key`、`reqId` | 读取应用设置 |
| 应用 → 壳层 | `settings.set` | `key`、`value`、`reqId` | 写入应用设置 |
| 应用 → 壳层 | `settings.list` | `reqId` | 列出当前应用的全部设置 |
| 壳层 → 应用 | `invoke` | `id` | 用户点击底栏操作 |
| 壳层 → 应用 | `visibility` | `visible` | 应用可见性变化 |
| 壳层 → 应用 | `settings.result` | `reqId`、`value` | 返回设置请求结果 |

## 3. 底栏操作

应用发送 `actions` 消息注册底栏操作。结构如下：

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
  left?: ActionDTO[]
  right?: ActionDTO[]
}
```

字段说明：

- `id`：应用内操作标识。用户点击后，宿主通过 `invoke` 消息将该 ID 发送回应用。
- `label`：显示文本。
- `icon`：可选的宿主内置图标名称，必须是图标注册表支持的名称。
- `active`：是否显示为激活状态。
- `disabled`：是否禁用操作。
- `info`：信息展示项，不可点击，适合页码或状态文字。

`left` 位于系统导航操作之后；`right` 位于任务栏 / 实时操作区域外侧。再次发送 `actions` 会更新当前应用的操作集合。

宿主发回的消息示例：

```ts
{
  source: 'classdesk-shell',
  type: 'invoke',
  id: 'next'
}
```

应用可以按 ID 分发操作：

```ts
window.addEventListener('message', (event) => {
  const data = event.data
  if (data?.source !== 'classdesk-shell') return

  if (data.type === 'invoke') {
    switch (data.id) {
      case 'next':
        // 执行下一页操作
        break
    }
  }
})
```

## 4. 可见性通知

宿主切换应用前后台时发送：

```ts
{
  source: 'classdesk-shell',
  type: 'visibility',
  visible: true
}
```

`visible` 为布尔值。当前应用容器使用常驻 iframe，通过显示状态切换应用；切换到后台不代表页面被销毁。

桥接模块会把状态同步到：

```js
document.body.dataset.visible
```

值为 `"1"` 表示可见，`"0"` 表示不可见。应用可据此暂停动画、媒体或不必要的后台任务。

## 5. 官方桥接模块

仓库示例桥接模块位于：

- `apps-src/pptx/src/bridge.ts`
- `apps-src/doccam/src/bridge.ts`

可将其复制到自己的应用中，并按项目路径调整。当前封装的接口：

| API | 返回值 | 说明 |
| --- | --- | --- |
| `setActions({ left, right })` | `void` | 注册底栏操作 |
| `onInvoke(handler)` | `void` | 注册底栏点击回调 |
| `settingsGet(key)` | `Promise<unknown>` | 读取设置 |
| `settingsSet(key, value)` | `Promise<unknown>` | 写入设置 |
| `settingsList()` | `Promise<unknown>` | 列举设置 |

示例：

```ts
import * as bridge from './bridge'

bridge.setActions({
  left: [{ id: 'previous', label: '上一页' }],
  right: [{ id: 'next', label: '下一页' }]
})

bridge.onInvoke((id) => {
  if (id === 'previous') {
    // 上一页
  } else if (id === 'next') {
    // 下一页
  }
})
```

设置 API 的具体行为、数据约束和超时规则见[应用设置 API](settings.md)。

## 6. 当前限制

- 当前没有正式的应用生命周期钩子，例如 `onInit`、`onDestroy`。
- 当前没有 API 版本协商、能力协商或最低宿主版本检查。现有消息没有版本字段，宿主也不会因未知消息或不兼容 API 主版本而拒绝应用。
- 底栏操作的图标名称依赖宿主图标注册表，不保证任意字符串都能显示。
- 消息桥不是通用 Node.js API，也不会向应用暴露主进程对象。

后续协议版本与兼容性设计见 [API 版本与兼容性策略](versioning.md)。该方案尚未落地，应用目前应继续使用本文列出的现有消息格式。
