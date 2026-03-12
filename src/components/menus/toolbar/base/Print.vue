<template>
  <MenusButton
    :text="t('print.text')"
    ico="print"
    shortcut="Ctrl+P"
    :disabled="editor?.isEmpty"
    huge
    @menu-click="printing = true"
  >
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
const printing = inject('printing')
</script>
