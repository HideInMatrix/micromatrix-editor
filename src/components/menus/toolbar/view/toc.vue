<template>
  <menus-button
    ico="toc"
    :text="page.showToc ? t('toc.hide') : t('toc.show')"
    huge
    @menu-click="page.showToc = !page.showToc"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
</script>
