<template>
  <MenusToolbarToolsQrcode
    v-if="attrs.type === 'qrcode'"
    :content="attrs.content"
  />
  <MenusToolbarToolsBarcode
    v-if="attrs.type === 'barcode'"
    :content="attrs.content"
  />
  <MenusToolbarToolsDiagrams
    v-if="attrs.type === 'diagrams'"
    :content="attrs.content"
  />
  <MenusToolbarToolsMermaid
    v-if="attrs.type === 'mermaid'"
    :content="attrs.content"
    :config="JSON.parse(attrs.config || '{}')"
  />
</template>

<script setup lang="ts">
import { getSelectionNode } from '@/utils/selection'

const editor = inject('editor')

const attrs = computed(() => {
  const node = editor.value ? getSelectionNode(editor?.value) : null
  return node?.attrs || {}
})
</script>
