<template>
  <MenusButton
    ico="table-fix"
    :text="t('table.fix.text')"
    :tooltip="t('table.fix.tip')"
    huge
    :disabled="!editor?.isActive('table')"
    @menu-click="editor?.chain().focus().fixTables().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
