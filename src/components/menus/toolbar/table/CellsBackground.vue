<template>
  <MenusButton
    ico="table-cells-background"
    :text="t('table.cellBgColor.text')"
    :tooltip="t('table.cellBgColor.tip')"
    menu-type="popup"
    huge
    :disabled="!editor?.can().setCellAttribute('background', '')"
    :popup-visible="popupVisible"
    @toggle-popup="togglePopup"
  >
    <template #content>
      <PickerColor default-color="" @change="colorChange" />
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const emits = defineEmits(['change'])

const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')

const colorChange = (color) => {
  popupVisible.value = false
  const background = color === '' ? null : color
  editor.value?.chain().focus().setCellAttribute('background', background).run()
}
</script>
