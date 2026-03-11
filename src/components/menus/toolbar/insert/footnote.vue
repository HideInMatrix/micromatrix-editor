<template>
  <menus-button
    ico="footnote"
    :text="t('insert.footnote')"
    huge
    @menu-click="editor?.commands.addFootnote"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
