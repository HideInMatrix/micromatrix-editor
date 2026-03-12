<template>
  <MenusButton
    ico="page-size"
    :text="t('page.size.text')"
    menu-type="dropdown"
    overlay-class-name="mxm-page-size-dropdown"
  >
    <template #dropmenu>
      <TDropdownMenu>
        <TDropdownItem
          v-for="(item, index) in options.dicts?.pageSizes"
          :key="index"
          :value="index"
          :active="page.size?.width === item.width"
          :divider="
            options.dicts?.pageSizes &&
            options.dicts.pageSizes.length - 1 === index
          "
          :min-column-width="150"
          @click="page.size = item"
        >
          <div class="label" v-text="l(item.label)"></div>
          <div class="desc">
            {{ item.width + t('page.size.cm') }} ×
            {{ item.height + t('page.size.cm') }}
          </div>
        </TDropdownItem>
        <TDropdownItem @click="dialogVisible = true">
          <div class="label" v-text="t('page.size.custom')"></div>
        </TDropdownItem>
      </TDropdownMenu>
    </template>
    <PageOptions :visible="dialogVisible" @close="dialogVisible = false" />
  </MenusButton>
</template>

<script setup lang="ts">
import { l, t } from '@/composables/i18n'
const page = inject('page')
const options = inject('options')
const dialogVisible = $ref(false)
</script>

<style lang="less">
.mxm-page-size-dropdown {
  .mxm-dropdown__item {
    max-width: unset !important;
    &-text {
      padding: 3px;
      .label {
        font-size: 14px;
        color: var(--mxm-text-color);
      }
      .desc {
        color: var(--mxm-text-color-light);
        margin-top: -3px;
        text-transform: uppercase;
        font-size: 12px;
      }
    }
  }
}
</style>
