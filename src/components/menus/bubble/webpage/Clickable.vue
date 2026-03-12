<template>
  <MenusButton
    :menu-active="editor?.getAttributes('iframe')?.clickable"
    ico="clickable"
    :text="t('bubbleMenu.webpage.clickable')"
    @menu-click="toggleClickable"
  />
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionNode } from '@/utils/selection'

const editor = inject('editor')

const toggleClickable = () => {
  const webpage = editor.value ? getSelectionNode(editor.value) : null
  if (webpage) {
    // editor.value?.commands.updateAttributes(webpage.type, {
    //   clickable: !webpage?.attrs?.clickable,
    // })
    editor.value?.commands.setIframe({
      ...webpage?.attrs,
      clickable: !webpage?.attrs?.clickable,
    })
  }
}
</script>
