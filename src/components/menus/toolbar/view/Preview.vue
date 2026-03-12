<template>
  <MenusButton
    ico="preview"
    :text="t('preview.title')"
    huge
    :menu-active="page.preview.enabled"
    @menu-click="page.preview.enabled = !page.preview.enabled"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
</script>
