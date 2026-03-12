<template>
  <MenusButton
    ico="outdent"
    :text="t('base.outdent')"
    shortcut="Shift+Tab"
    hide-text
    :disabled="!editor?.can().chain().focus().setOutdent().run()"
    @menu-click="editor?.chain().focus().setOutdent().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
