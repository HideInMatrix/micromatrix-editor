<template>
  <menus-button
    :ico="fullscreen ? 'full-screen-exit' : 'full-screen'"
    :text="fullscreen ? t('fullscreen.disable') : t('fullscreen.title')"
    shortcut="Ctrl+F11"
    huge
    :menu-active="fullscreen"
    @menu-click="fullscreen = !fullscreen"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const fullscreen = inject('fullscreen')
</script>
