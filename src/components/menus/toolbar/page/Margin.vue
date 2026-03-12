<template>
  <MenusButton
    ico="page-margin"
    :text="t('page.margin')"
    huge
    @menu-click="dialogVisible = true"
  >
    <PageOptions :visible="dialogVisible" @close="dialogVisible = false" />
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const dialogVisible = $ref(false)
</script>
