<template>
  <menus-button
    :text="t('base.italic')"
    ico="italic"
    shortcut="Ctrl+I"
    hide-text
    :menu-active="editor?.isActive('italic')"
    :disabled="!editor?.can().chain().focus().toggleItalic().run()"
    @menu-click="editor?.chain().focus().toggleItalic().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
