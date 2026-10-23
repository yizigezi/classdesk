<script setup lang="ts">
import type { IconName } from '../icons'

defineProps<{
  name: IconName
}>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <template v-if="name === 'wifi'">
      <path d="M2.8 9.6a13.4 13.4 0 0 1 18.4 0" />
      <path d="M6.1 13a8.7 8.7 0 0 1 11.8 0" />
      <path d="M9.3 16.3a4.2 4.2 0 0 1 5.4 0" />
      <circle cx="12" cy="19.3" r="1.1" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'volume'">
      <path d="M4 9.4h3.2L11 6v12l-3.8-3.4H4z" />
      <path d="M14.4 9.4a3.7 3.7 0 0 1 0 5.2" />
      <path d="M16.9 7a7.2 7.2 0 0 1 0 10" />
    </template>

    <template v-else-if="name === 'bell'">
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3.6 1.2 4.8 1.2 4.8H5.3S6.5 13.6 6.5 10z" />
      <path d="M10.2 17.5a1.9 1.9 0 0 0 3.6 0" />
    </template>

    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6L20 20" />
    </template>

    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </template>

    <template v-else-if="name === 'folder'">
      <path
        d="M3.5 7.4a1.7 1.7 0 0 1 1.7-1.7h3.5l2 2.2h6.1a1.7 1.7 0 0 1 1.7 1.7v7.7a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"
      />
    </template>

    <template v-else-if="name === 'slide'">
      <rect x="3" y="4.5" width="18" height="12" rx="2.2" />
      <path d="M12 16.5v3M8.6 19.5h6.8" />
      <path d="M10.6 8.2l4 2.3-4 2.3z" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'doc'">
      <path d="M6.5 3.8h7l4.5 4.5v11.9H6.5z" />
      <path d="M13.5 3.8v4.5H18" />
      <path d="M9.5 12.8h5M9.5 16h5" />
    </template>

    <template v-else-if="name === 'sheet'">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 9.5h16M4 14.5h16M10 4v16" />
    </template>

    <template v-else-if="name === 'pen'">
      <path d="M4.5 19.5l1-4L15.7 5.3a1.8 1.8 0 0 1 2.6 0l.4.4a1.8 1.8 0 0 1 0 2.6L8.5 18.5z" />
      <path d="M14.2 6.8l3 3" />
    </template>

    <template v-else-if="name === 'setting'">
      <path d="M4 7.5h9M17.5 7.5H20M4 16.5h2.5M11 16.5h9" />
      <circle cx="15" cy="7.5" r="2.3" />
      <circle cx="8.5" cy="16.5" r="2.3" />
    </template>

    <template v-else-if="name === 'chevron-left'">
      <path d="M14.5 6.5L9 12l5.5 5.5" />
    </template>

    <template v-else-if="name === 'chevron-right'">
      <path d="M9.5 6.5L15 12l-5.5 5.5" />
    </template>

    <template v-else-if="name === 'prev'">
      <path d="M14.8 6.8L9.2 12l5.6 5.2" />
      <path d="M7 6.8v10.4" />
    </template>

    <template v-else-if="name === 'home'">
      <path d="M4.5 10.6L12 4.5l7.5 6.1" />
      <path d="M6.5 9.4v9.3h11V9.4" />
      <path d="M10 18.7v-5h4v5" />
    </template>

    <template v-else-if="name === 'back'">
      <path d="M19 12H5.5" />
      <path d="M11 5.5L4.8 12l6.2 6.5" />
    </template>

    <template v-else-if="name === 'play'">
      <path d="M8.5 5.6l10 6.4-10 6.4z" fill="currentColor" stroke="none" />
    </template>

    <template v-else-if="name === 'exit'">
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <path d="M9 12h6" />
    </template>

    <template v-else>
      <path d="M9.2 6.8L14.8 12l-5.6 5.2" />
      <path d="M17 6.8v10.4" />
    </template>
  </svg>
</template>
