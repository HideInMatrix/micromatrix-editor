<template>
  <ToolbarToolsMath
    ico="edit"
    :tooltip="t('tools.math.edit')"
    :latex="latex"
    :type="type"
  />
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

const ToolbarToolsMath = defineAsyncComponent(
  () => import('@/components/menus/toolbar/tools/math.vue'),
)

const editor = inject('editor')

const type = computed(() => {
  if (editor.value?.isActive('blockMath')) {
    return 'block'
  }
  if (editor.value?.isActive('inlineMath')) {
    return 'inline'
  }
  return null
})

const latex = computed(() => {
  let node = null
  if (editor.value?.isActive('blockMath')) {
    node = editor.value?.getAttributes('blockMath')
  }
  if (editor.value?.isActive('inlineMath')) {
    node = editor.value?.getAttributes('inlineMath')
  }
  return node?.latex || ''
})
</script>
