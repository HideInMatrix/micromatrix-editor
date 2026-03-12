<template>
  <MenusButton
    ico="layout-web"
    :text="t('layout.web')"
    huge
    :menu-active="page.layout === 'web'"
    @menu-click="page.layout = 'web'"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
</script>
