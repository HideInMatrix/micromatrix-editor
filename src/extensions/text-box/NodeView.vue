<template>
  <NodeViewWrapper
    :id="attrs.id"
    ref="containerRef"
    class="mxm-node-view mxm-floating-node"
    :style="{
      zIndex: 90,
      '--mxm-textbox-border-color': attrs.borderColor,
      '--mxm-textbox-border-width': attrs.borderWidth + 'px',
      '--mxm-textbox-border-style': attrs.borderStyle,
      '--mxm-textbox-background-color': attrs.backgroundColor,
    }"
  >
    <div class="mxm-node-container mxm-node-text-box">
      <Drager
        class="is-draggable"
        :style="{
          cursor: !options.document?.readOnly
            ? 'inherit'
            : 'default !important',
        }"
        :selected="selected"
        :disabled="disabled || options?.document?.readOnly"
        :rotatable="true"
        :boundary="false"
        :angle="attrs.angle"
        :width="attrs.width"
        :height="attrs.height"
        :left="attrs.left"
        :top="attrs.top"
        :min-width="14"
        :min-height="14"
        :title="t('node.textBox.tip')"
        @rotate="onRotate"
        @resize="onResize"
        @drag="onDrag"
        @blur="disabled = false"
        @click="selected = true"
        @dblclick="editTextBox"
      >
        <NodeViewContent
          ref="contentRef"
          class="mxm-node-text-box-content"
          :style="{ writingMode: attrs.writingMode }"
        />
      </Drager>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import Drager from 'es-drager'

const props = defineProps(nodeViewProps)
const attrs = $computed(() => props.node.attrs)
const { updateAttributes } = props

const options = inject('options')

const containerRef = ref(null)
const contentRef = $ref(null)
let selected = $ref(false)
let disabled = $ref(false)

const onRotate = ({ angle }) => {
  updateAttributes({ angle })
}
const onResize = ({ width, height }) => {
  updateAttributes({ width, height })
}
const onDrag = ({ left, top }) => {
  updateAttributes({ left, top })
}

onClickOutside(containerRef, () => {
  selected = false
  disabled = false
})

const editTextBox = () => {
  disabled = true
  const range = document.createRange()
  range.selectNodeContents(contentRef.$el)
  const election = window.getSelection()
  if (election) {
    election.removeAllRanges()
    election.addRange(range)
  }
  contentRef.$el.focus()
}
</script>

<style lang="less">
.mxm-node-view {
  .mxm-node-text-box {
    position: absolute;
    .es-drager {
      user-select: text !important;
      cursor: default !important;
      z-index: 90 !important;
      background-color: var(--mxm-textbox-background-color);
      &.dragging {
        caret-color: transparent;
      }
      &.disabled {
        outline: none;
        &:after {
          display: none !important;
        }
      }
      &.selected {
        .mxm-node-text-box-content {
          outline: none;
        }
      }
      &.disabled.selected {
        .mxm-node-text-box-content {
          outline: var(--mxm-textbox-border-style)
            var(--mxm-textbox-border-width) var(--mxm-textbox-border-color);
        }
      }
    }
    .mxm-node-text-box-content {
      outline: var(--mxm-textbox-border-style) var(--mxm-textbox-border-width)
        var(--mxm-textbox-border-color);
      width: 100%;
      height: 100%;
      padding: 5px;
      box-sizing: border-box;
      overflow: hidden;
    }
  }
}
</style>
