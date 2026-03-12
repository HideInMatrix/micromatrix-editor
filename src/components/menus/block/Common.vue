<template>
  <TDropdown
    placement="bottom-right"
    overlay-class-name="mxm-block-menu-dropdown"
    trigger="click"
    :destroy-on-close="false"
    :popup-props="popupProps"
  >
    <MenusButton
      class="mxm-block-menu-button"
      :menu-active="menuActive"
      ico="block-menu"
      hide-text
      style="cursor: grab"
    />
    <TDropdownMenu>
      <TDropdownItem class="mxm-block-menu-group-name" disabled>
        {{ t('blockMenu.common') }}
      </TDropdownItem>
      <TDropdownItem>
        <MenusButton
          ico="node-clear-format"
          :text="t('blockMenu.clearFormat')"
          :tooltip="false"
          @menu-click="clearTextFormatting"
        />
      </TDropdownItem>
      <TDropdownItem divider>
        <MenusButton
          ico="node-duplicate"
          :text="t('blockMenu.duplicate')"
          :tooltip="false"
          @menu-click="duplicateNode"
        />
      </TDropdownItem>
      <TDropdownItem>
        <MenusButton
          ico="node-copy"
          :text="t('blockMenu.copy')"
          :tooltip="false"
          @menu-click="copyNodeToClipboard"
        />
      </TDropdownItem>
      <TDropdownItem>
        <MenusButton
          ico="node-cut"
          :text="t('blockMenu.cut')"
          :tooltip="false"
          @menu-click="cutNodeToClipboard"
        />
      </TDropdownItem>
      <TDropdownItem class="mxm-delete-node">
        <MenusButton
          ico="node-delete-2"
          :text="t('blockMenu.delete')"
          :tooltip="false"
          @menu-click="deleteNode"
        />
      </TDropdownItem>
    </TDropdownMenu>
  </TDropdown>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const props = defineProps({
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
})
const emits = defineEmits(['dropdown-visible'])

const container = inject('container')
const editor = inject('editor')
const blockMenu = inject('blockMenu')

let menuActive = $ref(false)

const popupProps = {
  attach: `${container} .mxm-main-container`,
  popperOptions: {
    modifiers: [{ name: 'offset', options: { offset: [2, 0] } }],
  },
  onVisibleChange(visible) {
    blockMenu.value = visible
    menuActive = visible
    emits('dropdown-visible', visible)
  },
}

const clearTextFormatting = () => {
  editor.value
    ?.chain()
    .setNodeSelection(props.pos)
    .focus()
    .unsetAllMarks()
    .run()
}
const copyNodeToClipboard = () => {
  editor.value?.commands.setNodeSelection(props.pos)
  document.execCommand('copy')
}
const cutNodeToClipboard = () => {
  editor.value?.commands.setNodeSelection(props.pos)
  document.execCommand('cut')
}
const duplicateNode = () => {
  editor.value?.commands.insertContentAt(props.pos, props.node?.toJSON())
}
const deleteNode = () => {
  editor.value
    ?.chain()
    .setNodeSelection(props.pos)
    .focus()
    .deleteSelection()
    .run()
}
</script>
