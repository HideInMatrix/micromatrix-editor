<template>
  <MenusButton
    ico="page-footer"
    :text="page.footer ? t('page.footer.hide') : t('page.footer.show')"
    huge
    @menu-click="page.footer = !page.footer"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')
</script>
