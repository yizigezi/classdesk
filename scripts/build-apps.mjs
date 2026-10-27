#!/usr/bin/env node
// 应用包构建：vite 打包 apps-src/<app> → 拷 manifest.json → asar 打成 dist-apps/<id>.cdapp
// .cdapp 就是 asar 归档，只是应用包的后缀约定（见 docs/apps.md）。
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

const APPS = [
  { id: 'cn.yizigezi.pptx', dir: 'pptx' },
  { id: 'cn.yizigezi.doccam', dir: 'doccam' }
]

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const asar = await import('@electron/asar')

mkdirSync(join(root, 'dist-apps'), { recursive: true })

for (const app of APPS) {
  const buildDir = join(root, '.apps-build', app.id)
  rmSync(buildDir, { recursive: true, force: true })

  run(process.execPath, [
    `--max-old-space-size=${process.env.CLASSDESK_HEAP || 2750}`,
    join(root, 'node_modules/vite/bin/vite.js'),
    'build',
    '--config',
    join(root, 'apps-src', app.dir, 'vite.config.ts')
  ])

  cpSync(join(root, 'apps-src', app.dir, 'manifest.json'), join(buildDir, 'manifest.json'))

  const out = join(root, 'dist-apps', `${app.id}.cdapp`)
  rmSync(out, { force: true })
  await asar.createPackage(buildDir, out)
  console.log(`[apps] packed ${out}`)
}
