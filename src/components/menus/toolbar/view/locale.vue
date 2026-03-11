<template>
  <menus-button
    :text="t('view.locale')"
    ico="locale"
    menu-type="dropdown"
    huge
    :select-options="themes"
    @click="changeLocale"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const setLocale = inject('setLocale')

const { locale } = useI18n()

const themes = computed(() => {
  return [
    {
      content: '🇨🇳 简体中文',
      value: 'zh-CN',
      active: locale.value === 'zh-CN',
    },
    {
      content: '🇱🇷 English',
      value: 'en-US',
      active: locale.value === 'en-US',
    },
  ]
})

const changeLocale = ({ value }) => {
  if (value) {
    setLocale(value, false)
  }
}
</script>
