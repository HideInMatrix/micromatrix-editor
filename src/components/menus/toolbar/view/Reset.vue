<template>
  <MenusButton
    ico="clear-cache"
    :text="t('resetAll.title')"
    huge
    @menu-click="reset(false)"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const reset = inject('reset')
</script>
