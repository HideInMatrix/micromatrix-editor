<template>
  <BubbleMenu v-if="editor" class="mxm-editor-bubble-menu" :editor="editor">
    <MenusBubbleMenus v-if="options?.document?.enableBubbleMenu">
      <template #bubble_menu="props">
        <slot name="bubble_menu" v-bind="props" />
      </template>
    </MenusBubbleMenus>
  </BubbleMenu>
</template>

<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3/menus'

const editor = inject('editor')
const options = inject('options')
</script>

<style lang="less">
.mxm-editor-bubble-menu {
  max-width: 580px;
  z-index: 110;
  border-radius: var(--mxm-radius);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 10px !important;
  box-shadow: var(--mxm-shadow);
  border: 1px solid var(--mxm-border-color);
  background-color: var(--mxm-color-white);

  &:empty {
    display: none;
  }

  .mxm-menu-button.show-text .mxm-button-content .mxm-button-text {
    display: none !important;
  }

  .mxm-menu-button.huge {
    height: var(--td-comp-size-xs);
    min-width: unset;

    .mxm-button-content {
      min-width: unset !important;

      .mxm-icon {
        font-size: 16px;
        margin-top: 0;
      }
    }
  }
}
</style>
