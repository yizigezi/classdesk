<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppIcon from './AppIcon.vue'
import SvgIcon from './SvgIcon.vue'
import { useRegistryStore } from '@/stores/registry'
import { useShellStore } from '@/stores/shell'
import type { AppEntry } from '@/platform/contract'

// —— 应用列表（类似 Launchpad）：点图标打开应用；管理模式里装 / 卸 / 加网页 ——
const registry = useRegistryStore()
const shell = useShellStore()
const { entries, error, busy } = storeToRefs(registry)

const manage = ref(false)
const notice = ref('')

const webForm = ref(false)
const webName = ref('')
const webUrl = ref('')

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

async function uninstall(app: AppEntry): Promise<void> {
  if (!window.confirm(`卸载「${app.name}」？应用会移入回收站。`)) return
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
  if (e.key === 'Escape') {
    if (webForm.value) webForm.value = false
    else shell.closeLaunchpad()
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

          <!-- 管理模式：内置应用打「内置」标，安装的应用给卸载入口 -->
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
            @click="uninstall(app)"
          >
            <SvgIcon name="trash" class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- 管理模式：安装 / 加网页 -->
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

    <!-- 添加网页 -->
    <div
      v-if="webForm"
      class="absolute inset-0 z-10 flex items-center justify-center bg-[#12151b]/45"
      @click.self="webForm = false"
    >
      <div class="w-[380px] rounded-card bg-[#1b2029] p-6 text-white shadow-card">
        <div class="text-[15px] font-medium">添加网页</div>
        <input
          v-model="webName"
          class="mt-4 h-10 w-full rounded-tile border border-white/15 bg-white/8 px-3 text-[13px] outline-none focus:border-white/35"
          placeholder="名称"
          type="text"
        />
        <input
          v-model="webUrl"
          class="mt-3 h-10 w-full rounded-tile border border-white/15 bg-white/8 px-3 text-[13px] outline-none focus:border-white/35"
          placeholder="https://"
          type="text"
          @keydown.enter="createWeb"
        />
        <div class="mt-5 flex justify-end gap-2">
          <button
            class="bar-item h-9 rounded-pill bg-white/10 px-4 text-[12px]"
            type="button"
            @click="webForm = false"
          >
            取消
          </button>
          <button
            class="h-9 rounded-pill bg-white px-5 text-[12px] font-medium text-[#1b2029]"
            type="button"
            @click="createWeb"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
