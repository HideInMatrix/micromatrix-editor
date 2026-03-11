<template>
  <menus-button
    ico="table-merge-cell"
    :text="t('table.mergeCells')"
    :hide-text="$toolbar.mode === 'classic'"
    :disabled="!editor?.can().mergeCells()"
    @menu-click="editor?.chain().focus().mergeCells().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
const options = inject('options')
const $toolbar = useState('toolbar', options)
</script>
