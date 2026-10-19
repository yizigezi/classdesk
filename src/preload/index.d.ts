import type { WindowApi } from './index'

declare global {
  interface Window {
    desk: WindowApi
  }
}

export {}
