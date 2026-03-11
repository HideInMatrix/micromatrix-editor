<template>
  <menus-button
    ico="node-delete"
    :text="t('bubbleMenu.tag.delete')"
    @menu-click="editor?.chain().focus().deleteSelection().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
