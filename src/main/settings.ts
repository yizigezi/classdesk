// —— 设置库（sqlite，Node 内置 node:sqlite，无原生依赖）——
// classdesk.db 放应用根目录（便携版跟着走）；
// config 表按 scope 隔离：'system' = 系统设置，应用 id = 该应用的配置。
// 渲染层走 IPC（preload 的 window.desk.settings.*）；外部应用经 postMessage 桥转发，scope 锁自己的 id。
import './window-controls'
import { DatabaseSync } from 'node:sqlite'

export type SettingValue = string | number | boolean | null

let db: DatabaseSync | null = null

export function openSettings(dbPath: string): void {
  if (db) return
  db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      updated_at INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (scope, key)
    )
  `)
}

function mustOpen(): DatabaseSync {
  if (!db) throw new Error('设置库未打开')
  return db
}

export function settingsGet(scope: string, key: string): SettingValue {
  const row = mustOpen()
    .prepare('SELECT value FROM config WHERE scope = ? AND key = ?')
    .get(scope, key) as { value?: string | null } | undefined
  if (!row || row.value == null) return null
  try {
    return JSON.parse(row.value) as SettingValue
  } catch {
    return row.value
  }
}

export function settingsSet(scope: string, key: string, value: SettingValue): void {
  const text = JSON.stringify(value ?? null)
  mustOpen()
    .prepare(
      `INSERT INTO config (scope, key, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (scope, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(scope, key, text, Date.now())
}

export function settingsDelete(scope: string, key: string): void {
  mustOpen().prepare('DELETE FROM config WHERE scope = ? AND key = ?').run(scope, key)
}

export function settingsList(scope: string): Record<string, SettingValue> {
  const rows = mustOpen()
    .prepare('SELECT key, value FROM config WHERE scope = ?')
    .all(scope) as Array<{ key: string; value: string | null }>
  const out: Record<string, SettingValue> = {}
  for (const row of rows) {
    try {
      out[row.key] = row.value == null ? null : (JSON.parse(row.value) as SettingValue)
    } catch {
      out[row.key] = row.value
    }
  }
  return out
}
