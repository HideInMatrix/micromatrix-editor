<template>
  <MenusButton
    ico="align-justify"
    :text="t('base.align.justify')"
    shortcut="Ctrl+Shift+J"
    hide-text
    :menu-active="editor?.isActive({ textAlign: 'justify' })"
    :disabled="!editor?.can().chain().focus().setTextAlign('justify').run()"
    @menu-click="editor?.chain().focus().setTextAlign('justify').run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
