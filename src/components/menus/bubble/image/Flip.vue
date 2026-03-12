<template>
  <MenusButton
    ico="image-flip"
    :text="t('bubbleMenu.image.flipX')"
    :menu-active="flipYActive"
    @menu-click="setFlip('flipY')"
  />
  <MenusButton
    :text="t('bubbleMenu.image.flipY')"
    :menu-active="flipXActive"
    @menu-click="setFlip('flipX')"
  >
    <Icon name="image-flip" style="transform: rotate(90deg)" />
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionNode } from '@/utils/selection'

const editor = inject('editor')

const flipYActive = computed(() => {
  const image = editor.value ? getSelectionNode(editor.value) : null
  if (image?.type?.name) {
    return editor.value?.getAttributes(image?.type?.name)?.flipY
  } else return false
})

const flipXActive = computed(() => {
  const image = editor.value ? getSelectionNode(editor.value) : null
  if (image?.type?.name) {
    return editor.value?.getAttributes(image?.type?.name)?.flipX
  } else return false
})

const setFlip = (flip) => {
  const image = editor.value ? getSelectionNode(editor.value) : null
  const { flipX, flipY } = image?.attrs || {}
  if (image && flip === 'flipX') {
    editor.value?.commands.updateAttributes(image.type, {
      flipX: !flipX,
    })
  }
  if (image && flip === 'flipY') {
    editor.value?.commands.updateAttributes(image.type, {
      flipY: !flipY,
    })
  }
}
</script>
