<template>
  <MenusButton
    ico="hard-break"
    :text="t('insert.hardBreak')"
    huge
    shortcut="Shift+Enter"
    @menu-click="editor?.chain().focus().setHardBreak().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
