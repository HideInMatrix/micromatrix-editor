<template>
  <MenusButton
    ico="unlink"
    :text="t('insert.link.remove')"
    hide-text
    @menu-click="unsetLink"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')

const unsetLink = () => {
  editor.value.commands.unsetLink()
}
</script>
