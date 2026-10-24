<script setup lang="ts">
import { computed } from 'vue'
import type { InstalledApp } from '@/platform/contract'

// —— 外部应用容器：apps/ 仓库里的应用用 iframe 跑在 classdesk-app 协议下 ——
// 挂载一次常驻（壳层用 v-show 切换），保留应用内状态。
// 与应用的互操作（底栏操作、权限校验）走预留的 postMessage 接口，见 platform/permissions.ts
const props = defineProps<{ app: InstalledApp }>()

const src = computed(() => `classdesk-app://${props.app.id}/${props.app.entry || 'index.html'}`)
</script>

<template>
  <div class="absolute inset-0 bg-white">
    <iframe class="h-full w-full border-0" :src="src" :title="app.name" allow="clipboard-read; clipboard-write" />
  </div>
</template>
