import { ipcMain, shell } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { DriveInfo } from '../shared/types'

const execFileAsync = promisify(execFile)

/** 开发/截图用假磁盘：CLASSDESK_FAKE_DRIVES="U盘|/media/fake-usb;SD卡|/media/fake-sd" */
function fakeDrives(): DriveInfo[] {
  const raw = process.env.CLASSDESK_FAKE_DRIVES
  if (!raw) return []
  return raw
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [label, path] = item.split('|').map((s) => s.trim())
      return { id: path || label, label: label || path, path: path || label }
    })
    .filter((d) => d.label)
}

async function windowsDrives(): Promise<DriveInfo[]> {
  // 卷标可能是中文：卷标一律 Base64 回传，绕开 PowerShell 控制台编码坑；
  // 可移动磁盘（DriveType=2）和 USB 接口磁盘（U 盘/移动硬盘）都算
  const script = [
    '$map = @{}',
    'Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | ForEach-Object { $map[[string]$_.DeviceID] = [string]$_.VolumeName }',
    'Get-Disk | Where-Object { $_.BusType -eq "USB" } | ForEach-Object { Get-Partition -DiskNumber $_.Number } | Where-Object { $_.DriveLetter } | ForEach-Object {',
    '  $id = [string]$_.DriveLetter + ":"',
    '  if (-not $map.ContainsKey($id)) {',
    '    $label = ""',
    '    try { $label = [string](Get-Volume -DriveLetter $_.DriveLetter).VolumeLabel } catch {}',
    '    $map[$id] = $label',
    '  }',
    '}',
    '$map.GetEnumerator() | ForEach-Object { $_.Key + "|" + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($_.Value)) }'
  ].join('\n')

  const { stdout } = await execFileAsync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 }
  )

  const out: DriveInfo[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const [root, b64] = line.trim().split('|')
    if (!root || !/^[A-Za-z]:$/.test(root)) continue
    let label = ''
    try {
      label = Buffer.from(b64 ?? '', 'base64').toString('utf8').trim()
    } catch {
      label = ''
    }
    out.push({ id: root, label: label || root, path: root.endsWith('\\') ? root : `${root}\\` })
  }
  return out
}

async function linuxDrives(): Promise<DriveInfo[]> {
  const { stdout } = await execFileAsync('lsblk', ['-J', '-o', 'NAME,LABEL,MOUNTPOINT,RM,TYPE'])
  interface LsblkNode {
    name?: string
    label?: string
    mountpoint?: string | null
    rm?: string | number
    type?: string
    children?: LsblkNode[]
  }
  const data = JSON.parse(stdout) as { blockdevices?: LsblkNode[] }
  const out: DriveInfo[] = []
  const walk = (nodes: LsblkNode[]): void => {
    for (const n of nodes) {
      if (n.children) walk(n.children)
      const removable = n.rm === 1 || n.rm === '1'
      if (!removable || !n.mountpoint) continue
      out.push({ id: n.mountpoint, label: n.label || n.name || n.mountpoint, path: n.mountpoint })
    }
  }
  walk(data.blockdevices ?? [])
  return out
}

async function listRemovableDrives(): Promise<DriveInfo[]> {
  const fake = fakeDrives()
  if (fake.length) return fake
  try {
    if (process.platform === 'win32') return await windowsDrives()
    if (process.platform === 'linux') return await linuxDrives()
  } catch (err) {
    // 枚举失败按无设备处理，不打断界面（方便排查：留一条日志）
    console.warn('[drives] enumerate failed:', (err as Error).message)
  }
  return []
}

export function registerDriveIpc(): void {
  ipcMain.handle('drives:list', () => listRemovableDrives())
  ipcMain.handle('drives:open', async (_e, path: string) => {
    if (typeof path !== 'string' || !path) return '路径为空'
    return shell.openPath(path) // 返回错误信息，空串 = 成功
  })
}