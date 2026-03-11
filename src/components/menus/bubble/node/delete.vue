<template>
  <menus-button
    ico="node-delete"
    :text="t('bubbleMenu.delete')"
    shortcut="Backspace"
    @menu-click="editor?.chain().focus().deleteSelectionNode().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
