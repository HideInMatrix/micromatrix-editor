<template>
  <MenusButton
    ico="image-draggable"
    :text="t('bubbleMenu.image.draggable')"
    :menu-active="editor?.getAttributes('image')?.draggable"
    @menu-click="toggleDraggable"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionNode } from '@/utils/selection'

const editor = inject('editor')

const toggleDraggable = () => {
  const image = editor.value ? getSelectionNode(editor.value) : null
  if (image) {
    editor.value?.commands.updateAttributes(image.type, {
      draggable: !image.attrs.draggable,
    })
  }
}
</script>
