# 应用包与应用仓库

classdesk 的应用分两种：

- **内置应用**（如「演示」）：随程序编译，不可卸载，走壳层平台 API（底栏操作等）。
- **外部应用**：装在应用仓库里的独立应用包，iframe 跑在 `classdesk-app` 协议下，可安装 / 卸载。

## 应用存储位置

`应用根目录/apps/`（打包版 = exe 所在目录；开发版 = 项目根目录；根目录不可写时退回用户数据目录）。
启动时扫描 `apps/<id>/`，装了就出现在应用列表里；也可以用 `CLASSDESK_APPS_DIR` 环境变量改位置。

## 应用包结构

```
my-app/                      # 文件夹名 = manifest.id
├── manifest.json   # 必需
├── index.html      # 入口页面（manifest.entry 可改）
├── icon.png        # 可选，图标（也可以在 manifest.icon 里写内置图标名）
└── …               # 任意前端资源
```

`manifest.json`：

```json
{
  "id": "cn.yizigezi.my-app",
  "name": "我的应用",
  "version": "0.1.0",
  "icon": "icon.png",
  "entry": "index.html",
  "description": "一句话说明",
  "author": "yizigezi",
  "permissions": ["fs.read"]
}
```

- `id`：**小写包名风格**（反向域名，如 `cn.yizigezi.my-app`），字母/数字/`.`/`-`/`_` 分段；文件夹名必须与 id 一致；`launcher`、`pptx` 为系统保留。
- `icon`：内置图标名（见 `src/renderer/src/icons.ts`），或应用包内的图片文件名。
- `permissions`：权限声明（见下）。

## 安装 / 卸载

- 应用列表（底栏九宫格按钮）→ 「管理」→ 「安装应用」：选一个应用包文件夹，拷进 `apps/`。
- 管理模式里点应用右上角的删除按钮卸载：应用目录整体移入**回收站**（可恢复）。
- 卸载会自动关闭正在运行的该应用。

## 资源加载协议

应用包内的资源通过 `classdesk-app://<appId>/<相对路径>` 访问（主进程注册的文件协议，
带目录穿越防护）。应用之间、应用与壳层之间默认互相隔离。

## 权限系统（预留）

`manifest.permissions` 里声明需要的权限点：

| id | 含义 |
|---|---|
| `fs.read` | 读应用包之外的文件 |
| `fs.write` | 写文件 |
| `device.removable` | 访问可移动存储 |
| `net` | 联网 |
| `shell.open` | 调用系统程序打开 |

目前**权限系统未启用，一律放行**。接口已留好（`src/renderer/src/platform/permissions.ts` 的
`checkPermission` / `requestPermission`），接入时只需替换这两个函数的实现，调用方不用改。

## 壳层 ↔ 应用互操作（规划中）

外部应用暂不支持注册底栏操作；后续走 `postMessage` 桥（同 permissions 接口一起接入）。
