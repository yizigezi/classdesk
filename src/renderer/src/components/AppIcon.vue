<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { isIconName } from '../icons'
import type { AppEntry } from '@/platform/contract'

// 应用图标：内置图标名 → SvgIcon；带扩展名 → 应用包内的图标文件（classdesk-app 协议）
const props = defineProps<{ app: AppEntry }>()

const isFile = computed(() => /\.(png|jpe?g|webp|gif|svg)$/i.test(props.app.icon ?? ''))

const fileUrl = computed(() => `classdesk-app://${props.app.id}/${props.app.icon}`)

const iconName = computed(() =>
  props.app.icon && isIconName(props.app.icon) ? props.app.icon : 'apps'
)
</script>

<template>
  <img v-if="isFile" :src="fileUrl" class="h-full w-full object-contain" :alt="app.name" />
  <SvgIcon v-else :name="iconName" class="h-full w-full" />
</template>
