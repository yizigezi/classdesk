// —— 应用包读取：文件夹包 / .cdapp（asar 归档包）统一入口 ——
// .cdapp 就是 asar 归档，仅作应用包后缀约定；这里自带一个只读解析器
// （头格式：8 字节尺寸头 + pickled JSON 索引 + 文件区），不额外带运行时依赖。
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import type { AppManifest } from '../shared/types'

/** id 约定：小写字母/数字/分段（包名风格，如 cn.yizigezi.hello） */
export const APP_ID_RE = /^[a-z0-9]+([._-][a-z0-9]+)*$/

/** 保留 id：壳层自己用，应用不得占用。 */
export const RESERVED_APP_IDS = new Set(['launcher', 'system'])

export function assertSafeAppId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !APP_ID_RE.test(id) || RESERVED_APP_IDS.has(id)) {
    throw new Error(`非法应用 id：${String(id)}（用小写包名风格，如 cn.yizigezi.hello）`)
  }
}

// ─────────────────────────── asar 只读 ───────────────────────────

interface AsarFileEntry {
  offset: string
  size: string
  unpacked?: boolean
}

type AsarNode = Partial<AsarFileEntry> & { files?: Record<string, AsarNode> }

interface LoadedAsar {
  buf: Buffer
  dataStart: number
  root: AsarNode
}

const asarCache = new Map<string, LoadedAsar>()

export function loadAsar(archivePath: string): LoadedAsar {
  const cached = asarCache.get(archivePath)
  if (cached) return cached

  const buf = readFileSync(archivePath)
  // [uint32: 4][uint32: headerSize][uint32: headerObjectSize][uint32: stringSize][json]
  const headerSize = buf.readUInt32LE(4)
  const stringSize = buf.readUInt32LE(12)
  const json = buf.subarray(16, 16 + stringSize).toString('utf8')
  const root = JSON.parse(json) as AsarNode
  const loaded: LoadedAsar = { buf, dataStart: 8 + headerSize, root }
  asarCache.set(archivePath, loaded)
  return loaded
}

function walkAsarNode(root: AsarNode, rel: string): AsarNode | null {
  let node: AsarNode | undefined = root
  for (const part of rel.split('/').filter(Boolean)) {
    node = node.files?.[part]
    if (!node) return null
  }
  return node
}

export function readAsarEntry(archivePath: string, rel: string): Buffer | null {
  const loaded = loadAsar(archivePath)
  const node = walkAsarNode(loaded.root, rel)
  if (!node || node.offset === undefined || node.size === undefined) return null
  const start = loaded.dataStart + Number(node.offset)
  return loaded.buf.subarray(start, start + Number(node.size))
}

export function asarHasEntry(archivePath: string, rel: string): boolean {
  return readAsarEntry(archivePath, rel) !== null
}

// ─────────────────────────── 应用包统一读取 ───────────────────────────

export interface AppPackageReader {
  kind: 'dir' | 'cdapp'
  /** 文件夹目录，或 .cdapp 文件 */
  path: string
  manifest: AppManifest
  has(rel: string): boolean
  read(rel: string): Buffer | null
}

export function readManifestFromPackage(pkgPath: string): AppManifest | null {
  return openAppPackage(pkgPath)?.manifest ?? null
}

export function openAppPackage(pkgPath: string): AppPackageReader | null {
  try {
    if (pkgPath.endsWith('.cdapp')) {
      if (!existsSync(pkgPath) || !statSync(pkgPath).isFile()) return null
      const raw = readAsarEntry(pkgPath, 'manifest.json')
      if (!raw) return null
      const manifest = JSON.parse(raw.toString('utf8')) as AppManifest
      if (!manifest || typeof manifest.id !== 'string' || typeof manifest.name !== 'string') return null
      return {
        kind: 'cdapp',
        path: pkgPath,
        manifest,
        has: (rel) => asarHasEntry(pkgPath, rel),
        read: (rel) => readAsarEntry(pkgPath, rel)
      }
    }

    if (!existsSync(pkgPath) || !statSync(pkgPath).isDirectory()) return null
    const manifestPath = join(pkgPath, 'manifest.json')
    if (!existsSync(manifestPath)) return null
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AppManifest
    if (!manifest || typeof manifest.id !== 'string' || typeof manifest.name !== 'string') return null

    const base = resolve(pkgPath)
    const safeResolve = (rel: string): string | null => {
      const file = resolve(base, rel)
      return file === base || file.startsWith(base + sep) ? file : null
    }
    return {
      kind: 'dir',
      path: pkgPath,
      manifest,
      has: (rel) => {
        const file = safeResolve(rel)
        return !!file && existsSync(file) && statSync(file).isFile()
      },
      read: (rel) => {
        const file = safeResolve(rel)
        return file && existsSync(file) && statSync(file).isFile() ? readFileSync(file) : null
      }
    }
  } catch {
    return null
  }
}
