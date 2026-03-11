<template>
  <menus-button
    :text="text || t('base.bgColor')"
    menu-type="popup"
    popup-handle="arrow"
    hide-text
    :disabled="!editor?.can().chain().focus().setBackgroundColor().run()"
    :popup-visible="popupVisible"
    @toggle-popup="togglePopup"
  >
    <icon
      name="background-color"
      class="mxm-icon-background-color"
      :style="{
        background: editor?.getAttributes('highlight')?.color || currentColor,
      }"
    />
    <template #content>
      <picker-color :default-color="defaultColor" @change="colorChange" />
    </template>
  </menus-button>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  modeless: {
    type: Boolean,
    default: false,
  },
  defaultColor: {
    type: String,
    default: '',
  },
})
const emits = defineEmits(['change'])

const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')

let currentColor = $ref('')

const colorChange = (color) => {
  currentColor = color
  popupVisible.value = false

  if (props.modeless) {
    emits('change', currentColor)
    return
  }

  if (color === '') {
    editor.value?.chain().focus().unsetBackgroundColor().run()
  } else {
    editor.value?.chain().focus().setBackgroundColor(color).run()
  }
}
</script>

<style lang="less" scoped>
.mxm-icon-background-color {
  border-radius: 2px;
}
</style>
