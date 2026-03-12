<template>
  <MenusButton
    ico="remove"
    :text="t('bubbleMenu.callout.removeEmoji')"
    @menu-click="removeEmoji"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionNode } from '@/utils/selection'

const emits = defineEmits(['change'])

const editor = inject('editor')

const removeEmoji = () => {
  const callout = editor.value ? getSelectionNode(editor.value) : null
  if (callout) {
    editor.value?.commands.updateAttributes('callout', {
      icon: null,
    })
  }
}
</script>
