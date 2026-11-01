<script setup lang="ts">
import { ref } from 'vue'
import QcCard from './QcCard.vue'
import QcSettingsItem from './QcSettingsItem.vue'
import QcSwitch from './QcSwitch.vue'
import QcButton from './QcButton.vue'

const enabled = ref(true)
</script>

<template>
  <div class="showcase">
    <header>
      <p class="eyebrow">QuickClass UI</p>
      <h1>组件预览</h1>
      <p class="subtitle">HyperOS × Material You 风格的桌面组件基础。</p>
    </header>

    <QcCard class="section">
      <h2>Settings Item</h2>
      <QcSettingsItem title="启动时打开" description="启动 QuickClass DE 时自动恢复工作区">
        <QcSwitch v-model="enabled" />
      </QcSettingsItem>
      <QcSettingsItem title="当前状态" description="用于检查组件的双向绑定">
        <span class="status">{{ enabled ? '已开启' : '已关闭' }}</span>
      </QcSettingsItem>
    </QcCard>

    <QcCard class="section">
      <h2>Buttons</h2>
      <div class="buttons">
        <QcButton>确定</QcButton>
        <QcButton variant="tonal">次要操作</QcButton>
        <QcButton variant="text">取消</QcButton>
      </div>
    </QcCard>
  </div>
</template>

<style scoped>
.showcase { max-width: 760px; margin: 0 auto; padding: 48px 32px 64px; color: var(--qc-on-surface); }
header { margin-bottom: 28px; }
.eyebrow { margin: 0 0 8px; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--qc-primary); }
h1 { margin: 0; font-size: 32px; letter-spacing: -.03em; }
.subtitle { margin: 8px 0 0; color: var(--qc-on-surface-variant); }
.section { margin-top: 20px; padding: 8px; }
h2 { margin: 16px 20px 8px; font-size: 17px; }
.status { min-width: 64px; text-align: right; color: var(--qc-on-surface-variant); font-size: 13px; }
.buttons { display: flex; flex-wrap: wrap; gap: 12px; padding: 16px 20px 20px; }
</style>
