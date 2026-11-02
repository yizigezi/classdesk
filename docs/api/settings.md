# 应用设置 API

QuickClass DE 为外部应用提供按应用 ID 隔离的持久化设置。应用通过桥接模块访问设置，不直接连接 SQLite 数据库。

## 1. 存储模型

宿主使用 Node 内置 `node:sqlite`，数据库文件为 `classdesk.db`，配置表按 `scope` 隔离：

- 系统设置使用 `system` scope。
- 应用设置使用应用自身的 ID 作为 scope。

应用桥接 API 不接受 scope 参数。宿主会根据当前 iframe 对应的应用 ID 确定 scope，因此应用不能通过此接口读写其他应用的设置。

## 2. API

建议从仓库示例中复用桥接模块：

- `apps-src/pptx/src/bridge.ts`
- `apps-src/doccam/src/bridge.ts`

### settingsGet(key)

读取指定键的值。

```ts
const value = await bridge.settingsGet('theme')
```

返回值类型为 `Promise<unknown>`。键不存在、桥接超时等情况可能得到 `null`，调用方应自行进行类型检查。

### settingsSet(key, value)

写入指定键的值。

```ts
await bridge.settingsSet('theme', 'dark')
await bridge.settingsSet('recentFiles', ['lesson-a.pptx', 'lesson-b.pptx'])
```

值通过 JSON 序列化保存。应使用可 JSON 序列化的数据：字符串、数字、布尔值、数组、普通对象或 `null`。不要传入函数、DOM 节点、BigInt 或循环引用对象。

### settingsList()

列出当前应用的全部设置。

```ts
const settings = await bridge.settingsList()
```

返回值类型为 `Promise<unknown>`，使用前应检查其实际结构。

## 3. 超时与错误处理

当前示例桥接模块的设置请求超时时间为 8 秒。超时后 Promise 会以 `null` 完成，因此：

- 不要把 `null` 一律解释为“设置值就是 null”。
- 对读取结果做类型检查，并提供合理默认值。
- 写入后如需确认结果，可再次读取并验证。
- 不要让设置服务暂时不可用导致整个应用无法启动。

例如：

```ts
const stored = await bridge.settingsGet('pageSize')
const pageSize = typeof stored === 'number' ? stored : 16
```

## 4. 数据迁移与卸载

应用 ID 是设置隔离范围的一部分。发布后尽量保持 ID 稳定；如果更改 ID，宿主会将其视为另一个应用设置空间。

应用升级时如需调整设置结构，可自行保存数据版本：

```ts
const version = await bridge.settingsGet('dataVersion')

if (version !== 2) {
  // 在这里执行应用自己的设置迁移
  await bridge.settingsSet('dataVersion', 2)
}
```

应用卸载与设置数据清理不是同一操作。不要假设卸载应用会自动删除其设置；如需清理数据，应在应用管理功能明确支持后再依赖该行为。

## 5. 与系统设置的区别

系统内部可通过 `window.desk.settings.get/set/delete/list('system', key)` 访问系统 scope；这是壳层内部接口，不属于 cdapp 外部应用 API。第三方应用应使用桥接模块提供的 `settingsGet`、`settingsSet` 和 `settingsList`。
