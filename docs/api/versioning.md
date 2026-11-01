# API 版本与兼容性策略

本文定义 QuickClass DE 后续 cdapp API 的版本化方向。**这是设计提案，不是当前已实现的运行时行为。** 当前宿主不会读取 API 版本字段，也不会进行握手、能力协商或兼容性拒绝。

## 1. 先区分三种版本

不要把应用自身版本、宿主产品版本和宿主 API 协议版本混为一谈：

| 版本 | 示例 | 用途 |
| --- | --- | --- |
| 应用版本 | `manifest.version: "2.3.1"` | 应用自身发布、升级和设置迁移 |
| API 主版本 | `manifest.apiVersion: 1` | 应用依赖的桥接协议主版本 |
| 宿主产品版本 | QuickClass DE 的发布版本 | 产品发布信息，不直接决定 API 是否兼容 |

应用版本升级不意味着 API 版本升级。宿主产品版本升级也不应自动导致应用失效。

## 2. 建议的 manifest 字段

建议未来增加以下字段：

```json
{
  "id": "cn.example.notes",
  "name": "Notes",
  "version": "2.3.1",
  "apiVersion": 1,
  "requiredCapabilities": [
    "settings",
    "actions"
  ],
  "optionalCapabilities": [
    "visibility"
  ]
}
```

字段语义：

- `apiVersion`：必填的整数主版本，表示应用使用的协议主版本。它不是应用版本，也不使用模糊的版本范围。
- `requiredCapabilities`：应用启动所必需的能力；宿主缺少任意一项时，应明确拒绝启动并给出原因。
- `optionalCapabilities`：应用可以增强使用、但缺失时仍可运行的能力；应用必须提供降级路径。
- 不建议初期加入 `minHostVersion` / `maxHostVersion`。产品版本与 API 能力并非一一对应，能力清单比产品版本区间更可靠。

在正式启用前，旧 manifest 没有 `apiVersion` 的应用应按现有协议视为 legacy v1。迁移期内，宿主应继续兼容它们，避免一次升级让现有应用全部失效。

## 3. 握手流程

建议在 iframe 加载完成后，由宿主发起握手。握手完成前，不向应用开放需要版本化的桥接能力。

### 3.1 宿主发送 runtime.hello

```ts
interface RuntimeHello {
  source: 'classdesk-shell'
  type: 'runtime.hello'
  apiVersion: number
  hostVersion: string
  capabilities: string[]
}
```

示例：

```ts
{
  source: 'classdesk-shell',
  type: 'runtime.hello',
  apiVersion: 1,
  hostVersion: '1.4.0',
  capabilities: ['settings', 'actions', 'visibility']
}
```

### 3.2 应用回复 runtime.ready

```ts
interface RuntimeReady {
  source: 'classdesk-app'
  type: 'runtime.ready'
  apiVersion: number
  requiredCapabilities: string[]
  optionalCapabilities?: string[]
}
```

宿主校验规则：

1. 应用协议主版本必须与宿主支持的主版本匹配。
2. 应用声明的每一项必需能力都必须存在于宿主能力清单中。
3. 可选能力缺失不阻止启动，但应用不得调用未协商的能力。
4. 校验通过后才将应用标记为 ready；失败时显示可读错误，不应静默忽略。
5. 握手消息仍须验证 `event.source`、消息 `source` 和字段类型，不能仅凭消息体中的标识信任发送方。

宿主向应用公布的是“本次运行可用的能力”，而不是简单地把所有内部 API 名称暴露出去。

## 4. 版本演进规则

建议采用“主版本 + 能力清单”，避免为每个小功能都增加协议版本：

- **同一主版本内**：允许新增可选字段、可选消息和新能力；旧应用不应因这些新增内容而失效。
- **破坏性变更**：例如删除消息、改变必需字段含义、改变请求响应语义，必须提升 API 主版本。
- **新能力**：新增能力使用稳定、唯一的字符串 ID，并通过 capability 清单协商；不要仅通过猜测宿主版本判断能力是否存在。
- **弃用**：先标记 deprecated，提供替代 API，并经过至少一个明确的迁移周期，再考虑在新主版本中移除。
- **未知字段**：接收方应忽略不认识的非必需字段；未知的必需能力必须导致启动失败。
- **未知消息**：忽略并记录诊断信息，不应让整个宿主崩溃。

不要在同一主版本中改变既有字段类型或悄悄重解释字段含义。

## 5. 运行时与开发者体验

建议握手成功后向应用提供只读运行时信息，例如：

```ts
interface RuntimeInfo {
  apiVersion: number
  hostVersion: string
  capabilities: ReadonlySet<string>
}
```

应用侧桥接模块可以提供：

```ts
runtime.getInfo()
runtime.hasCapability('visibility')
```

上述接口为建议设计，当前仓库尚未提供。业务代码应通过桥接模块检查能力，不要自行读取宿主内部状态或访问主进程对象。

兼容性失败信息应至少包含：

- 应用要求的 API 主版本；
- 宿主支持的 API 主版本；
- 缺失的必需能力；
- 建议升级应用或宿主的方向。

## 6. 落地顺序

推荐分阶段实现，避免一次性改变现有消息协议：

1. **阶段 A：协议常量与类型** — 在共享类型中定义 API 主版本、能力 ID 和握手消息类型；不改变现有行为。
2. **阶段 B：握手与诊断** — iframe 加载后发送 hello，校验 ready；旧 manifest 暂按 v1 兼容。
3. **阶段 C：能力门控** — 将 settings、actions、visibility 等桥接功能纳入能力清单；未协商能力调用时返回明确错误。
4. **阶段 D：开发者工具** — 在应用详情或开发者控制台显示 API 版本、协商能力和兼容性错误。
5. **阶段 E：弃用旧模式** — 只有在迁移窗口结束并发布明确公告后，才考虑要求 manifest 显式声明 `apiVersion`。

每个阶段都应增加旧应用兼容测试、版本不匹配测试、缺少必需能力测试和未知可选能力测试。

## 7. 当前状态

截至当前实现：

- `manifest.json` 只定义应用元数据，没有 `apiVersion` 或 capability 字段。
- `ExternalAppFrame.vue` 处理现有 `actions`、`settings.*`、`invoke` 和 `visibility` 消息。
- iframe 加载后没有 runtime handshake。
- 宿主不会根据 API 版本或能力清单拒绝应用。

因此，在运行时真正实现上述机制之前，第三方应用仍应遵循 [应用与壳层通信 API](bridge.md) 中列出的现有协议。不要仅在 manifest 中自行添加这些规划字段并假设宿主会执行检查。
