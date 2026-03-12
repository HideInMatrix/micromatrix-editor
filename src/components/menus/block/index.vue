<template>
  <!-- @vue-ignore -->
  <DragHandle
    :editor="editor"
    class="mxm-block-menu-drag-handle"
    :class="{
      'is-empty': editor?.isEmpty,
      'is-visible': selectedNodePos !== null,
    }"
    :node-type="selectedNode?.type?.name || 'unknown'"
    @node-change="nodeChange"
  >
    <div class="mxm-block-menu-hander">
      <MenusBlockNode
        :node="selectedNode"
        :pos="selectedNodePos"
        @dropdown-visible="dropdownVisible"
      />
      <MenusBlockCommon
        v-if="!editor?.isEmpty"
        :node="selectedNode"
        :pos="selectedNodePos"
        @dropdown-visible="dropdownVisible"
      />
    </div>
  </DragHandle>
</template>

<script setup lang="ts">
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'

const editor = inject('editor')
let selectedNode = $ref(null)
let selectedNodePos = $ref(null)

const nodeChange = ({ node, pos }) => {
  selectedNode = node || null
  if (pos !== null) {
    selectedNodePos = pos
  }
}

const dropdownVisible = (visible) => {
  editor.value.commands.setMeta('lockDragHandle', visible)
}
</script>

<style lang="less">
.mxm-block-menu {
  .mxm-menu-button {
    color: var(--mxm-text-color-light) !important;
  }
  &-drag-handle {
    z-index: 10;
    outline: solid 1px var(--mxm-border-color);
    transform: translateX(-15px);
    padding: 2px;
    border-radius: 3px;
    background-color: #fff;
    margin-top: -5px;
    &:hover {
      outline: none;
      box-shadow:
        0 2px 5px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(0, 0, 0, 0.1);
    }
    &[node-type='table'],
    &[node-type='horizontalRule'],
    &[node-type='columnContainer'],
    &[node-type='codeBlock'],
    &[node-type='details'],
    &[node-type='ProseMirror-gapcursor'] {
      margin-top: 0;
    }
    &[node-type='pageBreak'] {
      margin-top: -14px;
    }
    &[node-type='footnotes'] {
      display: none;
    }
    &.is-empty {
      z-index: 20;
    }
    &.is-visible {
      visibility: visible !important;
    }
  }
  &-hander {
    display: flex;
    @media print {
      display: none;
    }
    .mxm-menu-button {
      background-color: #fff;
      width: 20px;
      height: 20px;
      &-wrap {
        margin: 0 !important;
      }
      .mxm-button-content {
        color: rgba(0, 0, 0, 0.5);
      }
      &:not(.active):hover {
        background-color: var(--mxm-content-node-selected-background);
        .mxm-button-content {
          color: var(--mxm-primary-color);
        }
      }
      &.active {
        &:hover {
          opacity: 0.8;
        }
        .mxm-button-content {
          color: var(--mxm-text-color-light);
        }
      }
    }
  }
  &-dropdown {
    .mxm-block-menu-group-name {
      padding-left: 15px !important;
    }
    .mxm-dropdown__menu,
    .mxm-dropdown__submenu {
      --td-radius-default: 0;
      padding: 8px 0 !important;
      .mxm-divider {
        margin: 4px 0 2px;
        opacity: 0.5;
      }
      .mxm-dropdown__item {
        padding: 2px 0;
        min-width: 140px !important;
        .mxm-menu-button {
          background-color: transparent;
          padding: 0 15px;
          box-sizing: border-box;
          justify-content: flex-start;
          width: 100%;
          &-wrap {
            display: block !important;
          }
          .mxm-button__text {
            width: 100%;
          }
        }
        .mxm-button-content {
          width: 100%;
          justify-content: flex-start;
          .mxm-button-text {
            color: var(--mxm-text-color);
          }
          .mxm-button-icon {
            margin-right: 3px;
            font-size: 16px;
            color: #666;
          }
          .mxm-button-kbd {
            flex: 1;
            text-align: right;
            color: var(--mxm-text-color-light);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9px;
          }
          .mxm-heading {
            display: flex;
            color: var(--mxm-text-color);
            .icon-heading {
              font-size: 12px;
              display: inline-block;
              width: 2em;
            }
          }
        }
        &--disabled {
          .mxm-button-content {
            opacity: 0.6;
          }
        }
        &-direction {
          opacity: 0.4;
          font-size: 12px !important;
          margin-right: 8px;
        }
        .mxm-dropdown-item-label {
          padding: 1px 15px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      }
    }

    .mxm-delete-node {
      .mxm-button {
        * {
          color: var(--mxm-error-color) !important;
        }
      }
    }
  }
}

.ProseMirror-noderangeselection {
  *::selection {
    background: transparent;
  }
  * {
    caret-color: transparent;
  }
}
</style>
