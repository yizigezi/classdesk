<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import SvgIcon from './SvgIcon.vue'
import AppIcon from './AppIcon.vue'
import { useAppStore } from '@/stores/app'
import { useShellStore } from '@/stores/shell'
import { useRegistryStore } from '@/stores/registry'
import { useDevicesStore } from '@/stores/devices'
import type { AppEntry, ShellAction } from '@/platform/contract'

// —— 底栏：左 = 系统导航 + 应用操作｜中 = 应用列表 + 任务栏 + 实时操作｜右 = 应用操作 ——
const store = useAppStore()
const { dateLabel } = storeToRefs(store)
const shell = useShellStore()
const { activeApp, currentActions, navStack, runningApps, launchpadOpen } = storeToRefs(shell)
const registry = useRegistryStore()
const devices = useDevicesStore()
const { drives } = storeToRefs(devices)

const leftActions = computed(() => currentActions.value?.left ?? [])
const rightActions = computed(() => currentActions.value?.right ?? [])
const canGoBack = computed(() => activeApp.value !== 'launcher' || navStack.value.length > 0)

// 任务栏：当前打开的应用（图标 + 名称），点一下切过去
const taskApps = computed<AppEntry[]>(() =>
  runningApps.value
    .map((id) => registry.byId(id))
    .filter((app): app is AppEntry => app !== null)
)

function runAction(action: ShellAction): void {
  if (action.disabled || action.info) return
  action.onClick?.()
}

// 「实时操作」区：可移动存储设备（U 盘等），点开先走系统文件管理器
onMounted(() => {
  devices.startPolling()
})
onBeforeUnmount(() => {
  devices.stopPolling()
})
</script>

<template>
  <!-- 顶栏 48px、底栏 72px：顶栏 = 底栏的 2/3 -->
  <footer class="bar-glass z-20 flex h-[72px] shrink-0 items-center border-t border-white/10 px-4">
    <!-- 左端：系统导航（返回 / 桌面），后面接应用自定义操作 -->
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <button
        class="bar-item grid h-10 w-10 shrink-0 place-items-center rounded-tile"
        :disabled="!canGoBack"
        title="返回"
        type="button"
        @click="shell.goBack()"
      >
        <SvgIcon name="back" class="h-[18px] w-[18px]" />
      </button>
      <button
        class="bar-item grid h-10 w-10 shrink-0 place-items-center rounded-tile"
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
          class="bar-item ml-1 flex h-10 items-center gap-2 rounded-pill bg-white/10 px-3.5 text-[12px] tabular-nums"
        >
          <SvgIcon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
          {{ action.label }}
        </span>
        <button
          v-else
          class="bar-item ml-1 flex h-10 items-center gap-2 rounded-pill px-3.5 text-[12px]"
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

    <!-- 中间：应用列表（固定）+ 任务栏（打开的应用）+ 实时操作（可移动存储） -->
    <nav class="flex shrink-0 items-center gap-2">
      <button
        class="bar-item grid h-10 w-10 shrink-0 place-items-center rounded-tile"
        :class="launchpadOpen ? 'bg-white/18' : ''"
        title="应用列表"
        type="button"
        @click="shell.toggleLaunchpad()"
      >
        <SvgIcon name="apps" class="h-5 w-5" />
      </button>

      <span v-if="taskApps.length" class="h-6 w-px bg-white/15"></span>

      <!-- 任务栏：当前打开的应用 -->
      <div class="flex items-center gap-1.5">
        <div v-for="app in taskApps" :key="app.id" class="group relative">
          <button
            class="bar-item flex h-10 items-center gap-2 rounded-tile px-3"
            :class="activeApp === app.id ? 'bg-white/18' : ''"
            type="button"
            @click="shell.focusApp(app.id)"
          >
            <span class="block h-[18px] w-[18px]"><AppIcon :app="app" /></span>
            <span class="text-[12px] leading-none">{{ app.name }}</span>
          </button>
          <button
            class="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border border-white/20 bg-[#12151b]/90 text-white/85 opacity-0 transition group-hover:opacity-100 hover:bg-[#c8503c]"
            title="关闭"
            type="button"
            @click="shell.closeApp(app.id)"
          >
            <SvgIcon name="close" class="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <!-- 实时操作：可移动存储设备快捷方式 -->
      <span class="h-6 w-px bg-white/15"></span>
      <div class="flex items-center gap-1.5">
        <span
          class="flex h-10 items-center gap-1.5 rounded-pill bg-white/8 px-3 text-[11px] text-white/60"
          title="实时操作：可移动存储设备"
        >
          <SvgIcon name="usb" class="h-4 w-4" />
          实时操作
        </span>
        <button
          v-for="drive in drives"
          :key="drive.id"
          class="bar-item flex h-10 items-center gap-2 rounded-tile px-3"
          :title="drive.path"
          type="button"
          @click="devices.open(drive)"
        >
          <SvgIcon name="usb" class="h-4 w-4" />
          <span class="max-w-[120px] truncate text-[12px] leading-none">{{ drive.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 右端：应用自定义操作；桌面（无应用操作）时放日期，左右视觉平衡 -->
    <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
      <span
        v-if="rightActions.length === 0"
        class="bar-item flex h-10 items-center rounded-pill bg-white/10 px-3.5 text-[12px] tabular-nums"
      >
        {{ dateLabel }}
      </span>
      <template v-for="action in rightActions" :key="action.id">
        <span
          v-if="action.info"
          class="bar-item flex h-10 items-center gap-2 rounded-pill bg-white/10 px-3.5 text-[12px] tabular-nums"
        >
          <SvgIcon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
          {{ action.label }}
        </span>
        <button
          v-else
          class="bar-item flex h-10 items-center gap-2 rounded-pill px-3.5 text-[12px]"
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
  </footer>
</template>
