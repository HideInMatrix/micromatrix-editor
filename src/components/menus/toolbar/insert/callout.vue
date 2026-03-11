<template>
  <menus-button
    ico="callout"
    :text="t('insert.callout')"
    huge
    @menu-click="editor?.chain().focus().insertCallout().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
