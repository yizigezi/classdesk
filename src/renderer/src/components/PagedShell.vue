<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Component } from 'vue'
import { storeToRefs } from 'pinia'
import HomeView from '@/HomeView.vue'
import DeskTopView from '@/DeskTopView.vue'
import { useAppStore } from '@/stores/app'
import { useModuleStore } from '@/stores/module'

interface Page {
  key: string
  comp: Component
}

const pages: Page[] = [
  { key: 'home', comp: HomeView },
  { key: 'desktop', comp: DeskTopView }
]

const store = useAppStore()
const { pageIndex } = storeToRefs(store)
const moduleStore = useModuleStore()

function inShell(): boolean {
  return moduleStore.activeModule === 'shell'
}

const initialPage = new URLSearchParams(window.location.search).get('page')
if (initialPage === 'desktop') store.setPage(1)
else if (initialPage === 'home') store.setPage(0)

const viewport = ref<HTMLElement | null>(null)
const dragging = ref(false)
const dragFraction = ref(0)

let startX = 0
let startY = 0
let lastX = 0
let lastT = 0
let velocity = 0
let axis: 'x' | 'y' | null = null
let suppressClick = false
let wheelAcc = 0
let wheelLockUntil = 0

const position = computed(() => pageIndex.value - dragFraction.value)

function pageStyle(index: number): Record<string, string> {
  const offset = index - position.value
  return {
    transform: `translate3d(${offset * 100}%, 0, 0)`,
    opacity: String(1 - Math.min(1, Math.abs(offset)) * 0.4),
    transition: dragging.value
      ? 'none'
      : 'transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 300ms ease'
  }
}

function clampPage(index: number): number {
  return Math.max(0, Math.min(pages.length - 1, index))
}

function goRelative(delta: number): void {
  store.setPage(clampPage(pageIndex.value + delta))
}

function onPointerDown(e: PointerEvent): void {
  if (!inShell()) return
  if (e.button !== 0) return
  startX = lastX = e.clientX
  startY = e.clientY
  lastT = performance.now()
  velocity = 0
  axis = null
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent): void {
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (axis !== 'x') {
      removePointerListeners()
      return
    }
    dragging.value = true
  }
  const now = performance.now()
  if (now > lastT) velocity = (e.clientX - lastX) / (now - lastT)
  lastX = e.clientX
  lastT = now

  const width = viewport.value?.clientWidth || 1
  const maxLeft = pageIndex.value
  const maxRight = pages.length - 1 - pageIndex.value
  dragFraction.value = Math.max(-maxRight, Math.min(maxLeft, dx / width))
}

function onPointerUp(): void {
  if (dragging.value) {
    const f = dragFraction.value
    if (f < -0.18 || velocity < -0.5) goRelative(1)
    else if (f > 0.18 || velocity > 0.5) goRelative(-1)
    suppressClick = true
    window.setTimeout(() => {
      suppressClick = false
    }, 300)
  }
  dragging.value = false
  dragFraction.value = 0
  axis = null
  removePointerListeners()
}

function removePointerListeners(): void {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onClickCapture(e: MouseEvent): void {
  if (suppressClick) {
    suppressClick = false
    e.preventDefault()
    e.stopPropagation()
  }
}

function onWheel(e: WheelEvent): void {
  if (!inShell()) return
  const now = performance.now()
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 4) return
  if (now < wheelLockUntil) return
  wheelAcc += e.deltaX
  if (Math.abs(wheelAcc) > 90) {
    const dir = wheelAcc > 0 ? 1 : -1
    wheelAcc = 0
    wheelLockUntil = now + 420
    goRelative(dir)
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (!inShell()) return
  const target = e.target as HTMLElement | null
  if (target && /^(input|textarea|select)$/i.test(target.tagName)) return
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    goRelative(-1)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    goRelative(1)
  }
}

onMounted(() => {
  window.addEventListener('click', onClickCapture, true)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onClickCapture, true)
  window.removeEventListener('keydown', onKeydown)
  removePointerListeners()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      ref="viewport"
      class="relative min-h-0 flex-1 overflow-hidden"
      @pointerdown="onPointerDown"
      @wheel.prevent="onWheel"
    >
      <div
        v-for="(page, index) in pages"
        :key="page.key"
        class="absolute inset-0 will-change-transform"
        :style="pageStyle(index)"
      >
        <component :is="page.comp" />
      </div>
    </div>

    <div class="flex h-7 shrink-0 items-center justify-center gap-2">
      <button
        v-for="(page, index) in pages"
        :key="page.key"
        class="no-drag grid h-5 w-8 place-items-center rounded-pill"
        @click="store.setPage(index)"
      >
        <span
          class="rounded-pill transition-all duration-300"
          :class="
            pageIndex === index ? 'h-2 w-5 bg-white/90 shadow-card' : 'h-2 w-2 bg-white/45'
          "
        ></span>
      </button>
    </div>
  </div>
</template>
