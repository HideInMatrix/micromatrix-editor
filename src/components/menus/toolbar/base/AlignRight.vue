<template>
  <MenusButton
    ico="align-right"
    :text="t('base.align.right')"
    shortcut="Ctrl+Shift+R"
    hide-text
    :menu-active="
      editor?.isActive({ textAlign: 'right' }) ||
      editor?.isActive({ nodeAlign: 'flex-end' })
    "
    :disabled="
      !editor?.can().chain().focus().setTextAlign('right').run() &&
      !editor?.can().chain().focus().setNodeAlign('flex-end').run()
    "
    @menu-click="setAlignRight"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')

const setAlignRight = () => {
  if (editor.value?.can().chain().focus().setTextAlign('right').run()) {
    editor.value.chain().focus().setTextAlign('right').run()
  }
  if (editor.value?.can().chain().focus().setNodeAlign('flex-end').run()) {
    editor.value.chain().focus().setNodeAlign('flex-end').run()
  }
}
</script>
