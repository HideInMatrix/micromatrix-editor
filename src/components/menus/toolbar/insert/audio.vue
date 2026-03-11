<template>
  <menus-button
    ico="audio"
    :text="t('insert.audio')"
    huge
    @menu-click="
      editor
        ?.chain()
        .focus()
        .selectFiles('audio', container, uploadFileMap)
        .run()
    "
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const container = inject('container')
const editor = inject('editor')
const uploadFileMap = inject('uploadFileMap')
</script>
