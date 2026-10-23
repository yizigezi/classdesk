<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import SvgIcon from './SvgIcon.vue'
import { useAppStore } from '@/stores/app'
import { useShellStore } from '@/stores/shell'
import type { ShellAction } from '@/platform/contract'

const store = useAppStore()
const { quickItems, activeQuickId, dateLabel } = storeToRefs(store)
const shell = useShellStore()
const { activeApp, currentActions, navStack } = storeToRefs(shell)

const leftActions = computed(() => currentActions.value?.left ?? [])
const rightActions = computed(() => currentActions.value?.right ?? [])
const canGoBack = computed(() => activeApp.value !== 'launcher' || navStack.value.length > 0)

function isDockActive(id: string): boolean {
  if (id === 'present') return activeApp.value === 'pptx'
  return activeApp.value === 'launcher' && activeQuickId.value === id
}

function onDockClick(id: string): void {
  if (id === 'present') {
    shell.openApp('pptx')
    return
  }
  store.setActiveQuick(id)
  shell.goHome()
}

function runAction(action: ShellAction): void {
  if (action.disabled || action.info) return
  action.onClick?.()
}
</script>

<template>
  <footer class="bar-glass z-20 shrink-0 border-t border-white/10 px-4 py-2.5">
    <div class="flex items-center gap-4">
      <!-- 左端：系统导航（返回 / 桌面），后面接应用自定义操作 -->
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <button
          class="bar-item grid h-9 w-9 shrink-0 place-items-center rounded-tile"
          :disabled="!canGoBack"
          title="返回"
          type="button"
          @click="shell.goBack()"
        >
          <SvgIcon name="back" class="h-[18px] w-[18px]" />
        </button>
        <button
          class="bar-item grid h-9 w-9 shrink-0 place-items-center rounded-tile"
          :class="activeApp === 'launcher' ? 'bg-white/14' : ''"
          title="桌面"
          type="button"
          @click="shell.goHome()"
        >
          <SvgIcon name="home" class="h-[18px] w-[18px]" />
        </button>

        <template v-for="action in leftActions" :key="action.id">
          <span
            v-if="action.info"
            class="bar-item ml-1 flex h-9 items-center gap-2 rounded-pill bg-white/10 px-3.5 text-[12px] tabular-nums"
          >
            <SvgIcon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
            {{ action.label }}
          </span>
          <button
            v-else
            class="bar-item ml-1 flex h-9 items-center gap-2 rounded-pill px-3.5 text-[12px]"
            :class="action.active ? 'bg-white/18' : ''"
            :disabled="action.disabled"
            type="button"
            @click="runAction(action)"
          >
            <SvgIcon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
            {{ action.label }}
          </button>
        </template>
      </div>

      <!-- 中间：应用坞（系统级入口，常驻） -->
      <nav class="flex shrink-0 items-center gap-1.5">
        <button
          v-for="item in quickItems"
          :key="item.id"
          class="bar-item no-drag flex w-[62px] flex-col items-center gap-1 rounded-tile px-2 py-1.5"
          :class="isDockActive(item.id) ? 'bg-white/18' : ''"
          type="button"
          @click="onDockClick(item.id)"
        >
          <SvgIcon :name="item.icon" class="h-5 w-5" />
          <span class="text-[10px] leading-none">{{ item.label }}</span>
        </button>
      </nav>

      <!-- 右端：应用自定义操作；桌面（无应用操作）时放日期，左右视觉平衡 -->
      <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span
          v-if="rightActions.length === 0"
          class="bar-item flex h-9 items-center rounded-pill bg-white/10 px-3.5 text-[12px] tabular-nums"
        >
          {{ dateLabel }}
        </span>
        <template v-for="action in rightActions" :key="action.id">
          <span
            v-if="action.info"
            class="bar-item flex h-9 items-center gap-2 rounded-pill bg-white/10 px-3.5 text-[12px] tabular-nums"
          >
            <SvgIcon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
            {{ action.label }}
          </span>
          <button
            v-else
            class="bar-item flex h-9 items-center gap-2 rounded-pill px-3.5 text-[12px]"
            :class="action.active ? 'bg-white/18' : ''"
            :disabled="action.disabled"
            type="button"
            @click="runAction(action)"
          >
            <SvgIcon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
            {{ action.label }}
          </button>
        </template>
      </div>
    </div>
  </footer>
</template>
