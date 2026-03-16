<template>
  <template v-if="aiEnabled && hasTextSelection">
    <menus-button
      ico="ai"
      :tooltip="t('bubbleMenu.ai')"
      @menu-click="dialogVisible = true"
    />
    <menus-ai-dialog
      :visible="dialogVisible"
      target-type="selection"
      @close="dialogVisible = false"
    />
  </template>
</template>

<script setup>
import { CellSelection } from '@tiptap/pm/tables'

import { getSelectionText } from '@/utils/selection'

const editor = inject('editor')
const options = inject('options')

const aiOptions = computed(() => options.value.ai || {})
const aiEnabled = computed(() => {
  return (
    aiOptions.value.enabled &&
    typeof aiOptions.value.onChat === 'function'
  )
})
const hasTextSelection = computed(() => {
  const editorIns = editor.value
  const selection = editorIns?.state?.selection
  if (!editorIns || !selection || selection.empty || selection.node) {
    return false
  }
  if (selection instanceof CellSelection) {
    return false
  }
  return !!getSelectionText(editorIns).trim()
})

let dialogVisible = $ref(false)
</script>
