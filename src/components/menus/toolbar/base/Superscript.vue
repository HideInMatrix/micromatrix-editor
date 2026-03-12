<template>
  <MenusButton
    ico="superscript"
    :text="t('base.superscript')"
    shortcut="Ctrl+."
    hide-text
    :menu-active="editor?.isActive('superscript')"
    :disabled="!editor?.can().chain().focus().toggleSuperscript().run()"
    @menu-click="editor?.commands.toggleSuperscript()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
