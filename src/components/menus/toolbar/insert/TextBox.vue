<template>
  <MenusButton
    ico="text-box"
    :text="t('insert.textBox')"
    huge
    @menu-click="editor?.chain().focus().setTextBox({}).run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
