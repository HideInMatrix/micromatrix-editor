<template>
  <MenusButton
    ico="details"
    :text="t('insert.details')"
    huge
    @menu-click="editor?.chain().focus().setDetails().run()"
  />
</template>
<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>

<style lang="less" scoped>
.bookmark-list {
  border: solid 1px var(--mxm-border-color-dark);
  border-radius: var(--mxm-radius);
  margin-bottom: 5px;
  overflow: hidden;
  :deep(table) {
    th,
    td,
    tr {
      border: none !important;
      padding: 4px 10px;
    }
    th {
      border-bottom: solid 1px var(--mxm-border-color) !important;
    }
  }
}
</style>
