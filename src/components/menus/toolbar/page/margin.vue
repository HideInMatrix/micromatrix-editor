<template>
  <menus-button
    ico="page-margin"
    :text="t('page.margin')"
    huge
    @menu-click="dialogVisible = true"
  >
    <page-options :visible="dialogVisible" @close="dialogVisible = false" />
  </menus-button>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const dialogVisible = $ref(false)
</script>
