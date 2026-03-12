<template>
  <MenusButton
    ico="mention"
    :text="t('insert.mention')"
    huge
    @menu-click="editor?.chain().focus().insertMention().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
