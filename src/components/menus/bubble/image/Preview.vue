<template>
  <MenusButton
    ico="image-preview"
    :text="t('bubbleMenu.image.preview')"
    @menu-click="openImageViewer"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionNode } from '@/utils/selection'

const editor = inject('editor')
const imageViewer = inject('imageViewer')

const openImageViewer = () => {
  const image = getSelectionNode(editor.value)
  imageViewer.value.current = image.attrs.id
  imageViewer.value.visible = true
}
</script>
