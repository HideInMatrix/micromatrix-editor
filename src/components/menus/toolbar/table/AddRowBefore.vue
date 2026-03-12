<template>
  <MenusButton
    ico="table-add-row-before"
    :text="t('table.addRowBefore')"
    :hide-text="$toolbar.mode === 'classic'"
    :disabled="!editor?.can().addRowBefore()"
    @menu-click="editor?.chain().focus().addRowBefore().run()"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
const options = inject('options')
const $toolbar = useState('toolbar', options)
</script>
