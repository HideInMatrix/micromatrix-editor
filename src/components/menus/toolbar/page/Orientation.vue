<template>
  <MenusButton
    ico="page-orientation"
    :text="t('page.orientation.text')"
    menu-type="dropdown"
    overlay-class-name="mxm-page-orientation-dropdown"
  >
    <template #dropmenu>
      <TDropdownMenu>
        <TDropdownItem
          v-for="(item, index) in orientations"
          :key="index"
          :value="item.value"
          :active="page.orientation === item.value"
          @click="page.orientation = item.value"
        >
          <div
            class="icon-orientation"
            :class="{ rotate: item.value === 'landscape' }"
          >
            <Icon name="page" />
          </div>
          <div class="label">{{ item.label }}</div>
        </TDropdownItem>
      </TDropdownMenu>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const page = inject('page')

const orientations = [
  { label: t('page.orientation.landscape'), value: 'landscape' },
  { label: t('page.orientation.portrait'), value: 'portrait' },
]
</script>

<style lang="less">
.mxm-page-orientation-dropdown {
  .mxm-dropdown__item {
    max-width: unset !important;
    &-text {
      display: flex;
      padding: 5px 8px;
      .icon-orientation {
        font-size: 20px;
        margin-right: 5px;
        &.rotate {
          transform: rotate(90deg) rotateY(180deg) translate(0, 3px);
        }
      }
      .label {
        font-size: 14px;
        color: var(--mxm-text-color);
      }
    }
  }
}
</style>
