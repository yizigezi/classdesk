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

const taskApps = computed<AppEntry[]>(() =>
  runningApps.value
    .map((id) => registry.byId(id))
    .filter((app): app is AppEntry => app !== null)
)

function runAction(action: ShellAction): void {
  if (action.disabled || action.info) return
  action.onClick?.()
}

async function showWindowsDesktop(): Promise<void> {
  await window.desk?.window.showDesktop()
}

onMounted(() => {
  devices.startPolling()
})
onBeforeUnmount(() => {
  devices.stopPolling()
})
</script>

<template>
  <footer class="desktop-dock z-20 shrink-0">
    <div class="desktop-dock__side desktop-dock__side--left">
      <button
        class="dock-button"
        :disabled="!canGoBack"
        title="返回"
        type="button"
        @click="shell.goBack()"
      >
        <SvgIcon name="back" />
      </button>
      <button
        class="dock-button"
        :class="activeApp === 'launcher' ? 'is-active' : ''"
        title="桌面"
        type="button"
        @click="shell.goHome()"
      >
        <SvgIcon name="home" />
      </button>
      <button
        class="dock-button"
        title="返回 Windows 桌面"
        type="button"
        @click="showWindowsDesktop"
      >
        <SvgIcon name="windows" />
      </button>

      <template v-for="action in leftActions" :key="action.id">
        <span v-if="action.info" class="dock-chip">
          <SvgIcon v-if="action.icon" :name="action.icon" />
          {{ action.label }}
        </span>
        <button
          v-else
          class="dock-action"
          :class="action.active ? 'is-active' : ''"
          :disabled="action.disabled"
          type="button"
          @click="runAction(action)"
        >
          <SvgIcon v-if="action.icon" :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </template>
    </div>

    <nav class="desktop-dock__apps">
      <button
        class="dock-button dock-button--apps"
        :class="launchpadOpen ? 'is-active' : ''"
        title="应用列表"
        type="button"
        @click="shell.toggleLaunchpad()"
      >
        <SvgIcon name="apps" />
      </button>

      <span v-if="taskApps.length" class="dock-divider"></span>

      <div v-if="taskApps.length" class="dock-tasks">
        <div v-for="app in taskApps" :key="app.id" class="dock-task group">
          <button
            class="dock-task__button"
            :class="activeApp === app.id ? 'is-active' : ''"
            type="button"
            :title="app.name"
            @click="shell.focusApp(app.id)"
          >
            <span class="dock-task__icon"><AppIcon :app="app" /></span>
            <span class="dock-task__name">{{ app.name }}</span>
          </button>
          <button
            class="dock-task__close"
            title="关闭"
            type="button"
            @click="shell.closeApp(app.id)"
          >
            <SvgIcon name="close" />
          </button>
        </div>
      </div>

      <span v-if="drives.length" class="dock-divider"></span>
      <div v-if="drives.length" class="dock-devices">
        <button
          v-for="drive in drives"
          :key="drive.id"
          class="dock-device"
          :title="drive.path"
          type="button"
          @click="devices.open(drive)"
        >
          <SvgIcon name="usb" />
          <span>{{ drive.label }}</span>
        </button>
      </div>
    </nav>

    <div class="desktop-dock__side desktop-dock__side--right">
      <span v-if="rightActions.length === 0" class="dock-chip dock-chip--date">
        {{ dateLabel }}
      </span>
      <template v-for="action in rightActions" :key="action.id">
        <span v-if="action.info" class="dock-chip">
          <SvgIcon v-if="action.icon" :name="action.icon" />
          {{ action.label }}
        </span>
        <button
          v-else
          class="dock-action"
          :class="action.active ? 'is-active' : ''"
          :disabled="action.disabled"
          type="button"
          @click="runAction(action)"
        >
          <SvgIcon v-if="action.icon" :name="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </template>
    </div>
  </footer>
</template>
