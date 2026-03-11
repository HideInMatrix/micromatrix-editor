<template>
  <menus-button
    ico="toc"
    :text="t('insert.toc')"
    huge
    @menu-click="editor?.chain().focus().addTableOfContents().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
