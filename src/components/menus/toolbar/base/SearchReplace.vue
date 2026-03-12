<template>
  <MenusButton
    ico="search-replace"
    :text="t('search.text')"
    shortcut="Ctrl+F"
    huge
    @menu-click="searchReplace = true"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const searchReplace = inject('searchReplace')
</script>
