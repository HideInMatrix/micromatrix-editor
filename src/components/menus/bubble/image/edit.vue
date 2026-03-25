<template>
  <ToolbarToolsQrcode v-if="attrs.type === 'qrcode'" :content="attrs.content" />
  <ToolbarToolsBarcode
    v-if="attrs.type === 'barcode'"
    :content="attrs.content"
  />
  <ToolbarToolsDiagrams
    v-if="attrs.type === 'diagrams'"
    :content="attrs.content"
  />
  <ToolbarToolsMermaid
    v-if="attrs.type === 'mermaid'"
    :content="attrs.content"
    :config="JSON.parse(attrs.config || '{}')"
  />
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

import { getSelectionNode } from '@/utils/selection'

const ToolbarToolsBarcode = defineAsyncComponent(
  () => import('@/components/menus/toolbar/tools/barcode.vue'),
)
const ToolbarToolsDiagrams = defineAsyncComponent(
  () => import('@/components/menus/toolbar/tools/diagrams.vue'),
)
const ToolbarToolsMermaid = defineAsyncComponent(
  () => import('@/components/menus/toolbar/tools/mermaid.vue'),
)
const ToolbarToolsQrcode = defineAsyncComponent(
  () => import('@/components/menus/toolbar/tools/qrcode.vue'),
)

const editor = inject('editor')

const attrs = computed(() => {
  const node = editor.value ? getSelectionNode(editor?.value) : null
  return node?.attrs || {}
})
</script>
