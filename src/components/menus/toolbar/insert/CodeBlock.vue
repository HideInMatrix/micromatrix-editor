<template>
  <MenusButton
    ico="code-block"
    :text="t('insert.codeBlock')"
    shortcut="Ctrl+Alt+C"
    huge
    @menu-click="editor?.chain().focus().setCodeBlock().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
