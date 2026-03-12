<template>
  <MenusButton
    ico="image-rotate"
    :text="t('bubbleMenu.image.rotateCC')"
    @menu-click="setRotate(-90)"
  />
  <MenusButton
    :text="t('bubbleMenu.image.rotateC')"
    @menu-click="setRotate(90)"
  >
    <Icon name="image-rotate" style="transform: rotateY(180deg)" />
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionNode } from '@/utils/selection'

const editor = inject('editor')

const setRotate = (rotate) => {
  const image = editor.value ? getSelectionNode(editor.value) : null
  const { angle } = image?.attrs || {}
  if (image) {
    editor.value?.commands.updateAttributes(image.type, {
      angle: angle ? angle + rotate : rotate,
    })
  }
}
</script>
