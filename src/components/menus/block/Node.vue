<template>
  <TDropdown
    placement="bottom-right"
    overlay-class-name="mxm-block-menu-dropdown"
    :max-height="320"
    trigger="click"
    :destroy-on-close="false"
    :popup-props="popupProps"
  >
    <MenusButton
      class="mxm-block-menu-button"
      :menu-active="menuActive"
      ico="block-add"
      hide-text
    />
    <TDropdownMenu>
      <TDropdownItem class="mxm-block-menu-group-name" disabled>
        {{ t('blockMenu.insert') }}
      </TDropdownItem>
      <TDropdownItem>
        <MenusButton
          ico="table"
          :text="t('table.insert.text')"
          :tooltip="false"
          @menu-click="editor?.chain().focus().insertTable().run()"
        />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('image')">
        <MenusButton
          ico="image"
          :text="t('insert.image.text')"
          :tooltip="false"
          @menu-click="insertImage"
        />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('video')">
        <MenusToolbarInsertVideo :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('audio')">
        <MenusToolbarInsertAudio :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('file')">
        <MenusToolbarInsertFile :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('details')">
        <MenusToolbarInsertDetails :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('callout')">
        <MenusToolbarInsertCallout :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('hr')">
        <MenusButton
          ico="hr"
          :text="t('insert.hr.text')"
          :tooltip="false"
          @menu-click="
            editor?.chain().focus().setHorizontalRule({ type: 'signle' }).run()
          "
        />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('toc')">
        <MenusToolbarInsertToc :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('text-box')">
        <MenusToolbarInsertTextBox :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('web-page')">
        <MenusToolbarInsertWebPage :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('qrcode')">
        <MenusToolbarToolsQrcode :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('barcode')">
        <MenusToolbarToolsBarcode :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('signature')">
        <MenusToolbarToolsSignature :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('diagrams')">
        <MenusToolbarToolsDiagrams :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('math')">
        <MenusToolbarToolsMath :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('echarts')">
        <MenusToolbarToolsEcharts
          :huge="false"
          :tooltip="false"
          mode="add"
        />
      </TDropdownItem>
      <TDropdownItem v-if="!disableMenu('mermaid')">
        <MenusToolbarToolsMermaid :huge="false" :tooltip="false" />
      </TDropdownItem>
      <TDropdownItem v-if="options.templates.length > 0">
        <MenusButton
          ico="template"
          :text="t('blockMenu.template')"
          :tooltip="false"
        />
        <TDropdownMenu
          overlay-class-name="mxm-block-menu-dropdown"
          placement="right"
        >
          <TDropdownItem
            v-for="item in options.templates"
            :key="item.value"
            :value="item.value"
            :divider="item.divider"
            @click="setTemplate(item)"
          >
            <div class="mxm-dropdown-item-label">{{ item.title }}</div>
          </TDropdownItem>
        </TDropdownMenu>
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
const options = inject('options')
const editor = inject('editor')
const uploadFileMap = inject('uploadFileMap')
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
    editor.value
      ?.chain()
      .selectTextblockEnd()
      .selectNodeForward()
      .focus(props.pos)
      .run()
    emits('dropdown-visible', visible)
  },
}

const disableMenu = (name) => {
  return options.value.disableExtensions.includes(name)
}

const insertImage = () => {
  editor.value
    ?.chain()
    .focus()
    .selectFiles('image', container, uploadFileMap.value)
    .run()
}

const setTemplate = ({ content }) => {
  if (!content || !editor.value) {
    return
  }
  editor.value.commands.insertContent(content)
}
</script>

<style lang="less"></style>
