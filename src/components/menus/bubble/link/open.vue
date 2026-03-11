<template>
  <menus-button :text="t('insert.link.open')">
    <a
      class="mxm-link"
      :href="editor?.getAttributes('link').href"
      target="_blank"
      ><icon name="link" /> {{ t('insert.link.open') }}</a
    >
  </menus-button>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>

<style lang="less" scoped>
.mxm-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--mxm-primary-color);
  text-decoration: none !important;
}
</style>
