<template>
  <menus-button
    ico="undo"
    :text="t('base.undo')"
    shortcut="Ctrl+Z"
    hide-text
    :disabled="historyRecords.done.length === 0"
    @menu-click="menuClick"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const historyRecords = inject('historyRecords')
const menuClick = inject('undoHistory')
</script>
