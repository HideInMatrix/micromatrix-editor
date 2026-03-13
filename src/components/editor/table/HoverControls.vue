<template>
  <Teleport v-if="container && activeControl && controlStyle" :to="container">
    <div
      class="mxm-table-hover-control"
      :class="[
        activeControl.axis === 'column'
          ? 'mxm-table-hover-control-column'
          : 'mxm-table-hover-control-row',
      ]"
      :style="controlStyle"
      @mouseenter="handleControlMouseEnter"
      @mouseleave="handleControlMouseLeave"
    >
      <TButton
        theme="default"
        variant="outline"
        size="small"
        class="mxm-table-hover-button"
        :title="controlLabel"
        @mousedown.prevent.stop
        @click.stop="activateCurrentControl"
      >
        <Icon name="plus" class="mxm-table-hover-button-icon" />
      </TButton>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { computed } from 'vue'

import { t } from '@/composables/i18n'
import { useTableHoverControls } from '@/extensions/table/hover-controls'

const props = defineProps<{
  editor: Editor | null | undefined
  container: HTMLElement | null
}>()

const editorRef = computed(() => props.editor)
const containerRef = computed(() => props.container)

const {
  activeControl,
  activateCurrentControl,
  handleControlMouseEnter,
  handleControlMouseLeave,
} = useTableHoverControls(editorRef, containerRef)

const controlStyle = computed(() => {
  const control = activeControl.value
  if (!control) {
    return undefined
  }

  return {
    top: `${control.top}px`,
    left: `${control.left}px`,
    width: `${control.width}px`,
    height: `${control.height}px`,
  }
})

const controlLabel = computed(() => {
  return activeControl.value?.axis === 'column'
    ? t('table.addColumnAfter')
    : t('table.addRowAfter')
})
</script>
