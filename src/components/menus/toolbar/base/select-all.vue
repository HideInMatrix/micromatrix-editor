<template>
  <menus-button
    ico="select-all"
    :text="t('base.selectAll')"
    shortcut="Ctrl+A"
    hide-text
    @menu-click="editor?.chain().focus().selectAll().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
