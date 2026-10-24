export const ICON_NAMES = [
  'wifi',
  'volume',
  'bell',
  'search',
  'clock',
  'folder',
  'slide',
  'doc',
  'sheet',
  'pen',
  'setting',
  'chevron-left',
  'chevron-right',
  'prev',
  'next',
  'home',
  'back',
  'play',
  'exit',
  'apps',
  'usb',
  'plus',
  'close',
  'trash'
] as const

export type IconName = (typeof ICON_NAMES)[number]

export function isIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value)
}
