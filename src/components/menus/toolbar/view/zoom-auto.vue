<template>
  <menus-button
    ico="zoom-auto"
    :text="t('view.zoomAuto')"
    huge
    shortcut="Ctrl+0"
    :disabled="page.layout === 'web'"
    @menu-click="autoWidth"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
const container = inject('container')

const autoWidth = () => {
  const autoWidthBtn = document.querySelector(
    `${container} .umo-auto-width-button`,
  ) as HTMLElement | null
  if (autoWidthBtn) {
    autoWidthBtn.click()
  }
}
</script>
