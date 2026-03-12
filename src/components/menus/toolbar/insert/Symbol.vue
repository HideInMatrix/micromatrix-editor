<template>
  <MenusButton
    ico="symbol"
    :text="t('insert.symbol')"
    menu-type="popup"
    huge
    :popup-visible="popupVisible"
    @toggle-popup="togglePopup"
  >
    <template #content>
      <div class="mxm-symbols-container mxm-scrollbar">
        <template v-for="(group, index) in options.dicts?.symbols" :key="index">
          <div class="mxm-symbols-group-title" v-text="l(group.label)"></div>
          <div class="mxm-symbols-group-container">
            <div
              v-for="(item, i) in group.items.split('')"
              :key="i"
              class="mxm-symbols-group-item"
              @click="selectSymbol(item)"
            >
              {{ item }}
            </div>
          </div>
        </template>
      </div>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { l, t } from '@/composables/i18n'
const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')
const options = inject('options')

const selectSymbol = (char) => {
  editor.value?.chain().focus().insertContent(char).run()
  popupVisible.value = false
}
</script>

<style lang="less" scoped>
.mxm-symbols-container {
  width: 336px;
  max-height: var(--mxm-popup-max-height);
  min-height: 300px;
  overflow: auto;
  margin: calc(var(--mxm-popup-content-padding) * -1);
  padding: calc(var(--mxm-popup-content-padding) - 2px);
}

.mxm-symbols-group {
  &-title {
    color: var(--mxm-text-color-light);
    font-size: 12px;
    margin: 5px 0 2px 4px;
    &:first-child {
      margin-top: 0;
    }
  }
  &-container {
    display: flex;
    flex-wrap: wrap;
    overflow: auto;
    gap: 2px;
  }
  &-item {
    flex-basis: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    line-height: 1em;
    margin-bottom: 2px;
    border-radius: var(--mxm-radius);
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 14px;
    color: var(--mxm-text-color);
    &:hover {
      background-color: var(--mxm-button-hover-background);
    }
  }
}
</style>
