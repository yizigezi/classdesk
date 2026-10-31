# 应用包与应用仓库

classdesk 的应用分为壳层内置页面和**应用包**：

- **壳层内置页面**：「设置」`cn.yizigezi.settings` 由桌面壳层直接渲染，不作为应用包加载。
- **内置应用包**（如「演示」`cn.yizigezi.pptx`）：随程序分发，打包版在 `resources/apps-system/`，开发版在 `dist-apps/`，不可卸载。
- **用户应用**：装在应用仓库 `apps/` 里，可安装 / 卸载（卸载进回收站）。

启动时两个位置一起扫描加载。应用根目录 = 打包版 exe 所在目录、开发版项目根目录（根目录不可写时退回用户数据目录），也可用 `CLASSDESK_APPS_DIR` 改。

`apps-system/` 是程序构建时放置随程序分发应用的目录，不是应用包签名或来源验证机制。应用代码会在 iframe 中运行，但当前权限系统尚未启用；只应把受信任的代码放入该目录。壳层内置页面不经过应用包扫描与 iframe 桥接。

## 包形态：文件夹 / .cdapp

- **文件夹包**：开发用，一个文件夹就是一个应用包。
- **.cdapp**：发布用，就是 **asar 归档**，只是应用包的后缀约定；装 / 卸 = 拷 / 删一个文件。安装时两种都认。

## 应用包结构

```
cn.yizigezi.my-app/          # 文件夹包的目录名 = manifest.id
├── manifest.json            # 必需
├── index.html               # 入口页面（manifest.entry 可改）
├── icon.png                 # 可选图标（也可以用内置图标名）
└── …                        # 任意前端资源
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

- `id`：**小写包名风格**（反向域名，如 `cn.yizigezi.my-app`），字母/数字/`.`/`-`/`_` 分段；`launcher`、`system` 和内置设置应用 id `cn.yizigezi.settings` 保留。
- `type: "web"` 时是**网页应用**：不写 entry，写 `"url": "https://…"`（应用列表 → 管理 → 添加网页会自动生成）。
- `permissions`：权限声明（见下）。

## 安装 / 卸载 / 添加网页

- 应用列表（底栏九宫格按钮）→「管理」：
  - **安装应用**：先选择安装 `.cdapp` 文件；未打包文件夹仅在「设置 → 开发者选项 → 加载未打包的文件夹」开启后显示。文件和文件夹使用独立选择器，拷进 `apps/`；
  - **添加网页**：填名称和网址，自动生成网页应用包（图标自动抓 favicon / apple-touch-icon，抓不到用默认图标）；
  - 点应用右上角删除按钮卸载（内置应用只显示「内置」标）。

## 运行方式与互操作

应用跑在中间区域的 **iframe** 里（崩了也碰不到壳层）：

- 应用包资源走 `classdesk-app://<id>/<相对路径>`（主进程文件协议，带目录穿越防护）；
- 网页应用直接嵌 `<url>`（注意：发 `X-Frame-Options` 拒绝嵌入的网站显示不出来，只能转系统浏览器）。

应用 ↔ 壳层走 **postMessage 桥**（应用包里引 `bridge.ts` 或照协议自己实现）：

```
应用 → 壳层：{ source:'classdesk-app', type:'actions', left:[…], right:[…] }   // 注册底栏操作
           { source:'classdesk-app', type:'settings.get'|'settings.set'|'settings.list', key, value, reqId }
壳层 → 应用：{ source:'classdesk-shell', type:'invoke', id }                    // 点了某个操作
           { source:'classdesk-shell', type:'visibility', visible }            // 应用被切到后台/前台
           { source:'classdesk-shell', type:'settings.result', reqId, value }
```

操作项格式：`{ id, label, icon?, active?, disabled?, info? }`（icon 用内置图标名，info = 纯展示如页码）。

## 设置库（sqlite）

`classdesk.db`（应用根目录，Node 内置 `node:sqlite`，无原生依赖）的 `config` 表按 **scope** 隔离：

- 壳层：`window.desk.settings.get/set/delete/list('system', key)`
- 应用：桥里的 `settingsGet/Set/List(key)`，scope 自动锁本应用 id

值走 JSON，随意存。

## 权限系统（预留）

`manifest.permissions` 里声明权限点：

| id | 含义 |
|---|---|
| `fs.read` | 读应用包之外的文件 |
| `fs.write` | 写文件 |
| `device.removable` | 访问可移动存储 |
| `net` | 联网 |
| `shell.open` | 调用系统程序打开 |

目前**权限系统未启用，一律放行**。接口已留好（`src/renderer/src/platform/permissions.ts` 的
`checkPermission` / `requestPermission`），接入时只需替换这两个函数的实现，调用方不用改。

## 开发者选项与未打包文件夹

壳层「设置」页面提供「启动时全屏」选项（默认开启），更改后下次启动生效。安装方面默认只允许 `.cdapp`；如需开发调试，可进入「设置 → 开发者选项」启用开发者选项，再单独开启「加载未打包的文件夹」。关闭该选项后，用户安装的未打包目录不会出现在应用列表，也不能通过应用协议加载；关闭开发者选项会同时关闭文件夹加载。主进程会再次校验开关，不能仅靠界面绕过。未打包文件夹中的代码会直接运行，只应加载自己编写或完全信任的应用。\n\n## 自己打应用包

```bash
node scripts/build-apps.mjs   # vite 打包 apps-src/<app> → asar → dist-apps/<id>.cdapp
```

`apps-src/pptx` 是「演示」应用包的完整源码（含 bridge 用法），可以直接当模板抄。
