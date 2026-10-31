<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppDialog from './AppDialog.vue'
import AppIcon from './AppIcon.vue'
import SvgIcon from './SvgIcon.vue'
import { useRegistryStore } from '@/stores/registry'
import { useShellStore } from '@/stores/shell'
import type { AppEntry } from '@/platform/contract'

const registry = useRegistryStore()
const shell = useShellStore()
const { entries, error, busy } = storeToRefs(registry)

const manage = ref(false)
const notice = ref('')
const webForm = ref(false)
const webName = ref('')
const webUrl = ref('')
const uninstallTarget = ref<AppEntry | null>(null)

function launch(id: string): void {
  if (shell.activated[id] && shell.activeApp !== id) shell.focusApp(id)
  else shell.openApp(id)
}

async function install(): Promise<void> {
  notice.value = ''
  const res = await registry.install()
  if (!res) return
  if (res.error) notice.value = res.error
  else if (res.installed) notice.value = `已安装：${res.installed.name}`
}

function requestUninstall(app: AppEntry): void {
  uninstallTarget.value = app
}

async function confirmUninstall(): Promise<void> {
  const app = uninstallTarget.value
  uninstallTarget.value = null
  if (!app) return
  notice.value = ''
  shell.closeApp(app.id)
  await registry.uninstall(app.id)
  if (registry.error) notice.value = registry.error
}

async function createWeb(): Promise<void> {
  notice.value = ''
  const res = await registry.createWeb(webName.value, webUrl.value)
  if (!res) return
  if (res.error) {
    notice.value = res.error
    return
  }
  if (res.installed) {
    notice.value = `已添加：${res.installed.name}`
    webForm.value = false
    webName.value = ''
    webUrl.value = ''
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  if (uninstallTarget.value) {
    uninstallTarget.value = null
  } else if (webForm.value) {
    webForm.value = false
  } else {
    shell.closeLaunchpad()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="absolute inset-0 z-30 flex flex-col bg-[#12151b]/55 backdrop-blur-2xl"
    @click.self="shell.closeLaunchpad()"
  >
    <div class="flex items-center gap-3 px-8 pt-7">
      <div class="text-[17px] font-medium text-white">应用</div>
      <span v-if="notice || error" class="text-[12px] text-white/70">{{ notice || error }}</span>
      <button
        class="bar-item ml-auto flex h-9 items-center rounded-pill bg-white/12 px-4 text-[12px]"
        type="button"
        @click="manage = !manage"
      >
        {{ manage ? '完成' : '管理' }}
      </button>
    </div>

    <div class="flex min-h-0 flex-1 items-start justify-center overflow-auto px-10 py-10">
      <div class="grid w-full max-w-[880px] grid-cols-5 gap-x-6 gap-y-9">
        <div v-for="app in entries" :key="app.id" class="group relative flex flex-col items-center">
          <button
            class="grid h-[72px] w-[72px] place-items-center rounded-[22px] border border-white/15 bg-white/12 p-4 text-white transition hover:bg-white/22"
            :title="app.name"
            type="button"
            @click="launch(app.id)"
          >
            <AppIcon :app="app" />
          </button>
          <span class="mt-2.5 max-w-[110px] truncate text-[12px] text-white/85">{{ app.name }}</span>

          <span
            v-if="manage && !app.removable"
            class="absolute -right-1 -top-1 rounded-pill bg-white/22 px-2 py-0.5 text-[9px] text-white/85"
          >
            内置
          </span>
          <button
            v-else-if="manage"
            class="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-[#c8503c] text-white shadow-card transition hover:bg-[#b3442f]"
            title="卸载"
            type="button"
            @click="requestUninstall(app)"
          >
            <SvgIcon name="trash" class="h-3.5 w-3.5" />
          </button>
        </div>

        <div v-if="manage" class="flex flex-col items-center">
          <button
            class="grid h-[72px] w-[72px] place-items-center rounded-[22px] border border-dashed border-white/35 text-white/85 transition hover:bg-white/12"
            type="button"
            @click="install"
          >
            <SvgIcon name="plus" class="h-7 w-7" />
          </button>
          <span class="mt-2.5 text-[12px] text-white/85">{{ busy ? '处理中…' : '安装应用' }}</span>
        </div>
        <div v-if="manage" class="flex flex-col items-center">
          <button
            class="grid h-[72px] w-[72px] place-items-center rounded-[22px] border border-dashed border-white/35 text-white/85 transition hover:bg-white/12"
            type="button"
            @click="webForm = true"
          >
            <SvgIcon name="apps" class="h-7 w-7" />
          </button>
          <span class="mt-2.5 text-[12px] text-white/85">添加网页</span>
        </div>
      </div>
    </div>

    <div class="px-8 pb-6 text-center text-[11px] text-white/45">
      应用装在应用根目录的 apps 文件夹，启动时自动加载
    </div>

    <div
      v-if="webForm"
      class="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-6 backdrop-blur-md"
      @click.self="webForm = false"
    >
      <form
        class="w-full max-w-[440px] overflow-hidden rounded-[30px] border border-white/12 bg-[#20242d]/95 p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,.35)]"
        @submit.prevent="createWeb"
      >
        <div class="text-[22px] font-semibold tracking-[-0.02em]">添加网页</div>
        <div class="mt-2 text-[13px] leading-5 text-white/60">将网页添加到应用列表，以独立应用的形式打开。</div>
        <label class="mt-6 block text-[12px] font-medium text-white/70">名称</label>
        <input
          v-model="webName"
          class="mt-2 h-12 w-full rounded-[16px] border border-white/12 bg-white/[.06] px-4 text-[14px] outline-none transition placeholder:text-white/35 focus:border-[#b8c7ff] focus:bg-white/[.08] focus:ring-2 focus:ring-[#b8c7ff]/20"
          placeholder="例如：班级网站"
          type="text"
          autofocus
        />
        <label class="mt-4 block text-[12px] font-medium text-white/70">网址</label>
        <input
          v-model="webUrl"
          class="mt-2 h-12 w-full rounded-[16px] border border-white/12 bg-white/[.06] px-4 text-[14px] outline-none transition placeholder:text-white/35 focus:border-[#b8c7ff] focus:bg-white/[.08] focus:ring-2 focus:ring-[#b8c7ff]/20"
          placeholder="https://example.com"
          type="url"
        />
        <div class="mt-7 flex justify-end gap-2">
          <button
            class="min-w-[72px] rounded-full px-4 py-2.5 text-[13px] font-medium text-white/75 transition hover:bg-white/8 hover:text-white"
            type="button"
            @click="webForm = false"
          >
            取消
          </button>
          <button
            class="min-w-[72px] rounded-full bg-[#d9e2ff] px-5 py-2.5 text-[13px] font-semibold text-[#0b1a33] transition hover:bg-[#e7ebff] active:scale-[.98]"
            type="submit"
            :disabled="busy"
          >
            {{ busy ? '添加中…' : '添加' }}
          </button>
        </div>
      </form>
    </div>

    <AppDialog
      :open="Boolean(uninstallTarget)"
      title="卸载应用"
      :message="uninstallTarget ? `确定要卸载「${uninstallTarget.name}」吗？应用会移入回收站。` : ''"
      confirm-text="卸载"
      cancel-text="取消"
      destructive
      @confirm="confirmUninstall"
      @cancel="uninstallTarget = null"
    />
  </div>
</template>
