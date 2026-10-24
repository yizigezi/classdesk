import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  const pageIndex = ref(0)

  const dateLabel = ref(formatDate())
  const timeLabel = ref(formatTime())
  const timer = window.setInterval(() => {
    dateLabel.value = formatDate()
    timeLabel.value = formatTime()
  }, 1000)
  void timer

  function setTheme(next: 'light' | 'dark'): void {
    theme.value = next
  }

  function setPage(index: number): void {
    pageIndex.value = Math.max(0, Math.min(1, index))
  }

  return {
    theme,
    pageIndex,
    dateLabel,
    timeLabel,
    setPage,
    setTheme
  }
})
