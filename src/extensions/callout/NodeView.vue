<template>
  <NodeViewWrapper class="mxm-node-view">
    <TPopup
      :attach="`${container} .mxm-zoomable-container`"
      overlay-inner-class-name="mxm-editor-bubble-menu"
      trigger="click"
      :visible="
        editor?.isEditable &&
        bubbleMenu &&
        editor.state.selection.to === editor.state.selection.from
      "
      @visible-change="(visible) => (bubbleMenu = visible)"
    >
      <div
        class="mxm-node-container hover-shadow mxm-node-callout"
        :style="{
          color: attrs.fontColor,
          backgroundColor: attrs.backgroundColor,
        }"
      >
        <span
          v-if="attrs.icon"
          class="mxm-node-callout-icon"
          contenteditable="false"
          >{{ attrs.icon }}</span
        >
        <NodeViewContent
          class="mxm-node-callout-content"
          :class="{
            'mxm-node-callout-empty': node.content.size <= 2,
          }"
          :data-placeholder="t('callout.placeholder')"
        />
      </div>
      <template #content>
        <MenusBubbleCalloutBuiltin />
        <div class="mxm-bubble-menu-divider"></div>
        <MenusToolbarInsertEmoji @select-emoji="selectEmoji" />
        <MenusBubbleCalloutEmojiRemove
          v-if="editor.getAttributes('callout').icon"
        />
        <MenusBubbleCalloutBackground />
        <div class="mxm-bubble-menu-divider"></div>
        <MenusBubbleNodeDelete />
      </template>
    </TPopup>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

import { t } from '@/composables/i18n'

const props = defineProps(nodeViewProps)
const attrs = $computed(() => props.node.attrs)
const { updateAttributes } = props

const container = inject('container')
const bubbleMenu = $ref(false)

const selectEmoji = (emoji) => {
  updateAttributes({
    icon: emoji,
  })
}
</script>

<style lang="less">
.mxm-node-callout {
  padding: 8px 12px;
  border-radius: var(--mxm-radius);
  display: flex;
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  align-items: center;
  &-icon {
    font-size: 18px;
    margin-right: 10px;
  }
  &-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.mxm-node-callout-empty {
      display: flex;
      align-items: center;
      line-height: 1.5;
      &::after {
        content: attr(data-placeholder);
        opacity: 0.5;
      }
      .tiptap-invisible-character {
        display: none;
      }
    }
  }
}
</style>
