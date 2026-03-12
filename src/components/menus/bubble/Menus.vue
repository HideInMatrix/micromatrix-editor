<template>
  <template v-if="is('link') && attrs('link').href">
    <MenusBubbleLinkOpen />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarInsertLink ico="edit" :text="t('insert.link.edit')" />
    <MenusBubbleLinkCopy />
    <MenusBubbleLinkUnlink />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleNodeDelete />
  </template>
  <template
    v-else-if="
      (is('image') && !attrs('image').error) ||
      (is('inlineImage') && !attrs('inlineImage').error)
    "
  >
    <MenusToolbarBaseAlignLeft />
    <MenusToolbarBaseAlignCenter />
    <MenusToolbarBaseAlignRight />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleImageFlip />
    <MenusBubbleImageProportion />
    <MenusBubbleImageDraggable />
    <MenusBubbleImageReset />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleImagePreview
      v-if="
        attrs('image')?.type?.startsWith('image') ||
        attrs('inlineImage')?.type?.startsWith('image')
      "
    />
    <MenusBubbleImageEdit />
    <MenusBubbleImageOpen />
    <MenusBubbleNodeDuplicate
      v-if="is('image') && attrs('image').draggable"
    />
    <MenusBubbleNodeTofile
      v-if="
        attrs('image').previewType !== null &&
        attrs('inlineImage').previewType !== null
      "
    />
    <MenusBubbleImageConvert />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleNodeDelete />
  </template>
  <template
    v-else-if="is('video') || is('audio') || is('file') || is('iframe')"
  >
    <MenusToolbarBaseAlignLeft />
    <MenusToolbarBaseAlignCenter />
    <MenusToolbarBaseAlignRight />
    <template v-if="is('file')">
      <MenusBubbleFileWidth />
    </template>
    <div class="mxm-bubble-menu-divider"></div>
    <template v-if="is('iframe')">
      <MenusBubbleWebpageClickable />
      <MenusToolbarInsertWebPage
        v-if="!disable('web-page')"
        ico="edit"
        :page-type="attrs('iframe')?.type"
        :page-url="attrs('iframe')?.src"
      />
      <MenusBubbleWebpageOpen />
      <div class="mxm-bubble-menu-divider"></div>
    </template>
    <MenusBubbleFileDownload
      v-if="is('file') || is('video') || is('audio')"
    />
    <MenusBubbleNodeTofile v-if="is('video') || is('audio')" />
    <MenusBubbleNodeDelete />
  </template>
  <template v-else-if="is('table')">
    <MenusToolbarTableCellsAlign />
    <MenusToolbarTableCellsBackground />
    <!-- <MenusToolbarTableBorderColor  /> -->
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarTableAddRowBefore />
    <MenusToolbarTableAddRowAfter />
    <MenusToolbarTableAddColumnBefore />
    <MenusToolbarTableAddColumnAfter />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarTableDeleteRow />
    <MenusToolbarTableDeleteColumn />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarTableMergeCells />
    <MenusToolbarTableSplitCell />
  </template>
  <template v-else-if="is('tag')">
    <MenusBubbleTagInput />
    <MenusBubbleTagBuiltin />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleTagColor />
    <MenusBubbleTagBackground />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleTagDelete />
  </template>
  <template v-else-if="is('echarts')">
    <MenusToolbarBaseAlignLeft />
    <MenusToolbarBaseAlignCenter />
    <MenusToolbarBaseAlignRight />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarToolsEcharts ico="setting" />
    <MenusBubbleNodeDelete />
  </template>
  <template v-else-if="is('optionBox')">
    <MenusToolbarBaseFontSize :select="false" />
    <MenusToolbarBaseBold />
    <MenusToolbarBaseItalic />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarBaseColor />
    <MenusToolbarBaseBackgroundColor />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarInsertOptionBox edit />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusBubbleNodeDelete />
  </template>
  <template v-else-if="is('blockMath') || is('inlineMath')">
    <MenusBubbleMath />
    <MenusBubbleNodeDelete />
  </template>
  <template
    v-else-if="
      is('toc') ||
      is('pageBreak') ||
      is('horizontalRule') ||
      is('codeBlock') ||
      attrs('image').error
    "
  >
    <!-- <MenusBubbleNodeDelete /> -->
  </template>
  <template v-else>
    <MenusToolbarBaseFontSize :select="false" />
    <div
      v-if="!disable('font-size-increase') || !disable('font-size-decrease')"
      class="mxm-bubble-menu-divider"
    ></div>
    <MenusToolbarBaseBold />
    <MenusToolbarBaseItalic />
    <MenusToolbarBaseUnderline />
    <MenusToolbarBaseStrike />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarBaseAlignDropdown />
    <MenusToolbarInsertLink v-if="!disable('link')" />
    <div class="mxm-bubble-menu-divider"></div>
    <MenusToolbarBaseColor />
    <template v-if="!is('textBox')">
      <MenusToolbarBaseBackgroundColor />
      <MenusToolbarBaseHighlight v-if="!disable('highlight')" />
    </template>
    <template v-else>
      <MenusBubbleTextBoxBorder />
      <MenusBubbleTextBoxBackground />
      <MenusBubbleTextBoxWritingMode />
      <div class="mxm-bubble-menu-divider"></div>
      <MenusBubbleNodeDelete />
    </template>
  </template>
  <template v-if="editor?.state?.selection">
    <slot
      name="bubble_menu"
      :node-type="getCurrentNode('name')"
      :node-attrs="getCurrentNode('attrs')"
    />
  </template>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { CellSelection } from '@tiptap/pm/tables'

const editor = inject('editor')
const options = inject('options')

const disable = (name) => {
  return options.value.disableExtensions.includes(name)
}
const is = (type) => {
  const editorIns = editor.value
  if (!editorIns) return false

  if (type === 'table') {
    const { selection } = editorIns.state
    return selection instanceof CellSelection
  }

  return editorIns.isActive(type)
}
const attrs = (type) => {
  return editor.value.getAttributes(type)
}

const getCurrentNode = (type) => {
  const { state } = editor.value
  const { selection } = state
  const { $from } = selection
  const currentNode = selection.node || $from.parent
  if (type === 'name') {
    return currentNode.type.name
  }
  if (type === 'attrs') {
    return currentNode.type.attrs
  }
}
</script>

<style lang="less">
.mxm-bubble-menu-divider {
  width: 1px;
  border-right: solid 1px var(--mxm-border-color-light);
  height: 16px;
  margin: 0 10px 0 5px;
  &:last-child:is(.mxm-bubble-menu-divider) {
    display: none;
  }
}
</style>
