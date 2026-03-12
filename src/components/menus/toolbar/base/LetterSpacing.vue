<template>
  <MenusButton
    :text="t('base.letterSpacing.text')"
    ico="letter-spacing"
    hide-text
    menu-type="popup"
    :menu-active="editor?.isActive('spacing')"
    :popup-visible="popupVisible"
    :disabled="!editor?.can().chain().focus().setLetterSpacing().run()"
    @toggle-popup="togglePopup"
  >
    <template #content>
      <div class="mxm-letter-spacing-tile">
        {{ t('base.letterSpacing.tip', { value: spacing }) }}
        <Tooltip :content="t('base.letterSpacing.reset')">
          <TButton
            variant="text"
            size="small"
            shape="square"
            @click="resetLetterSpacing"
          >
            <Icon name="node-clear-format" size="16" />
          </TButton>
        </Tooltip>
      </div>
      <div class="mxm-letter-spacing-menu">
        <TButton
          variant="text"
          size="small"
          :disabled="spacing <= -1"
          @click="spacing = Math.round((spacing - 0.1) * 10) / 10"
        >
          <Icon name="minus" />
        </TButton>
        <TSlider
          v-model="spacing"
          :min="-2"
          :max="20"
          :step="0.1"
          :tooltip-props="{
            visible: false,
          }"
        />
        <TButton
          variant="text"
          size="small"
          :disabled="spacing >= 10"
          @click="spacing = Math.round((spacing + 0.1) * 10) / 10"
        >
          <Icon name="plus" />
        </TButton>
      </div>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')

let spacing = $ref(0)
watch(
  () => popupVisible.value,
  (visible) => {
    if (!visible) {
      spacing = 0
    }
    const attrs = editor.value?.getAttributes('letterSpacing')
    spacing = attrs?.spacing ? parseFloat(attrs.spacing.replace('em', '')) : 0
  },
)
watch(
  () => spacing,
  () => {
    setLetterSpacing()
  },
)

const setLetterSpacing = () => {
  editor.value?.chain().focus().setLetterSpacing(`${spacing}em`).run()
}
const resetLetterSpacing = () => {
  spacing = 0
  popupVisible.value = false
}
</script>

<style lang="less" scoped>
.mxm-letter-spacing {
  &-tile {
    font-size: 12px;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
  }
  &-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 200px;
    :deep(.mxm-button) {
      width: 20px;
      height: 20px;
      font-size: 16px;
    }
  }
}
</style>
