<template>
  <menus-button
    ico="layout-page"
    :text="t('layout.page')"
    huge
    :menu-active="page.layout === 'page'"
    @menu-click="page.layout = 'page'"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
</script>
