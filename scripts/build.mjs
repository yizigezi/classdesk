#!/usr/bin/env node
// classdesk 构建脚本：electron-vite 构建（渲染层暂不压缩）→ 产物逐文件 esbuild 压缩。
//
// 背景：4G 构建机上 Rollup 渲染 + esbuild minify 一起跑必然 OOM（heap 3072 都被杀），
// 拆成两步后各步峰值内存都可控：
//   1) 构建用 --optimize-for-size 等参数压住 Rollup 渲染期内存；
//   2) 压缩按文件粒度执行，峰值 = 最大的那个 chunk，互不影响。
// 需要未压缩产物时：CLASSDESK_SKIP_MINIFY=1 node scripts/build.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// URL.pathname 在 Windows 上会得到 /D:/...，不能直接作为 spawnSync 的 cwd。
// 用 fileURLToPath 保证本地 Windows / CI Windows 都得到合法的盘符路径。
const root = fileURLToPath(new URL('..', import.meta.url))

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts })
  if (r.error) {
    console.error(`[build] failed to start ${cmd}: ${r.error.message}`)
    process.exit(1)
  }
  if (r.status !== 0) {
    console.error(`[build] command exited with status ${r.status ?? 'unknown'}`)
    process.exit(r.status ?? 1)
  }
}

// 1) 构建（renderer 保持未压缩，避开 OOM）
run(
  process.execPath,
  [
    '--optimize-for-size',
    `--max-old-space-size=${process.env.CLASSDESK_HEAP || 2800}`,
    '--max-semi-space-size=8',
    'node_modules/electron-vite/bin/electron-vite.js',
    'build'
  ],
  { env: { ...process.env, CLASSDESK_NO_MINIFY: '1' } }
)

if (process.env.CLASSDESK_SKIP_MINIFY === '1') {
  console.log('[build] skip minify pass (CLASSDESK_SKIP_MINIFY=1)')
  process.exit(0)
}

// 2) 逐文件压缩 out/**/*.{js,css}
// Windows 的 .cmd shim 不是原生可执行文件，直接传给 spawnSync 会得到 EINVAL。
// 通过 cmd.exe /d /s /c 启动 shim，兼容 GitHub Actions windows-latest。
const esbuildShim = join(root, 'node_modules', '.bin', 'esbuild.cmd')
const esbuildCommand = process.platform === 'win32' ? 'cmd.exe' : join(root, 'node_modules', '.bin', 'esbuild')
const targets = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|css)$/.test(name)) targets.push(p)
  }
}

walk(join(root, 'out'))

for (const file of targets) {
  if (process.platform === 'win32') {
    run(esbuildCommand, ['/d', '/s', '/c', esbuildShim, file, '--minify', '--allow-overwrite', `--outfile=${file}`], {
      stdio: ['ignore', 'ignore', 'inherit']
    })
  } else {
    run(esbuildCommand, [file, '--minify', '--allow-overwrite', `--outfile=${file}`], {
      stdio: ['ignore', 'ignore', 'inherit']
    })
  }
}

console.log(`[build] minified ${targets.length} files`)
