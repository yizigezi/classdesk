import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IconName } from '../icons'

export interface QuickItem {
  id: string
  label: string
  icon: IconName
}

function formatDate(): string {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日 周${'日一二三四五六'[now.getDay()]}`
}

function formatTime(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export const useAppStore = defineStore('app', () => {
  const theme = ref<'light' | 'dark'>('light')

  const quickItems = ref<QuickItem[]>([
    { id: 'present', label: '演示', icon: 'slide' },
    { id: 'doc', label: '文稿', icon: 'doc' },
    { id: 'sheet', label: '表格', icon: 'sheet' },
    { id: 'annotate', label: '批注', icon: 'pen' },
    { id: 'setting', label: '设置', icon: 'setting' }
  ])

  const activeQuickId = ref<string>('present')

  const pageIndex = ref(0)

  const dateLabel = ref(formatDate())
  const timeLabel = ref(formatTime())
  const timer = window.setInterval(() => {
    dateLabel.value = formatDate()
    timeLabel.value = formatTime()
  }, 1000)
  void timer

  function setActiveQuick(id: string): void {
    activeQuickId.value = id
  }

  function setTheme(next: 'light' | 'dark'): void {
    theme.value = next
  }

  function setPage(index: number): void {
    pageIndex.value = Math.max(0, Math.min(1, index))
  }

  return {
    theme,
    quickItems,
    activeQuickId,
    pageIndex,
    dateLabel,
    timeLabel,
    setActiveQuick,
    setPage,
    setTheme
  }
})
