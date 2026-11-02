<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { timeLabel } = storeToRefs(store)
const fullscreen = ref(false)

async function syncFullscreen(): Promise<void> {
  fullscreen.value = await window.desk?.window.isFullscreen() ?? false
}

async function toggleFullscreen(): Promise<void> {
  fullscreen.value = await window.desk?.window.toggleFullscreen() ?? fullscreen.value
}

onMounted(() => {
  void syncFullscreen()
})

onBeforeUnmount(() => {})
</script>

<template>
  <header class="drag desktop-topbar z-20 flex shrink-0 items-center">
    <div class="desktop-topbar__brand no-drag">
      <span class="desktop-topbar__avatar">C</span>
      <span class="desktop-topbar__identity">
        <strong>CLASSDESK</strong>
        <small>DESKTOP ENVIRONMENT</small>
      </span>
      <span class="desktop-topbar__status">
        <i></i>
        Ready
      </span>
    </div>

    <div class="desktop-topbar__right no-drag">
      <span class="desktop-topbar__weather">18°</span>
      <span class="desktop-topbar__icon"><SvgIcon name="volume" /></span>
      <span class="desktop-topbar__icon"><SvgIcon name="wifi" /></span>
      <span class="desktop-topbar__icon desktop-topbar__notification">
        <SvgIcon name="bell" />
        <i></i>
      </span>
      <span class="desktop-topbar__divider"></span>
      <span class="desktop-topbar__time">{{ timeLabel }}</span>
      <button
        class="no-drag desktop-topbar__fullscreen"
        :title="fullscreen ? '退出全屏' : '进入全屏'"
        type="button"
        @click="toggleFullscreen"
      >
        <SvgIcon name="fullscreen" />
      </button>
    </div>
  </header>
</template>
