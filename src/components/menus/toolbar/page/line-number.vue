<template>
  <menus-button
    ico="line-number"
    :text="t('page.lineNumber')"
    :menu-active="page.showLineNumber"
    huge
    @menu-click="page.showLineNumber = !page.showLineNumber"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
</script>
