<template>
  <menus-button
    ico="share"
    :text="t('export.share.text')"
    huge
    @menu-click="dialogVisible = true"
  />
  <modal
    :visible="dialogVisible"
    width="420px"
    :confirm-btn="t('export.share.copy')"
    @confirm="copyLink"
    @close="dialogVisible = false"
  >
    <template #header>
      <icon name="share" />
      {{ t('export.share.text') }}
    </template>
    <div class="mxm-share-container">
      <div class="mxm-share-tip" v-text="t('export.share.tip')"></div>
      <t-textarea
        class="mxm-share-textarea"
        :value="options.shareUrl"
        readonly
        autosize
      ></t-textarea>
    </div>
  </modal>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const options = inject('options')
const container = inject('container')
let dialogVisible = $ref(false)

const copyLink = () => {
  const { copy } = useClipboard({ source: options.value.shareUrl })
  copy(options.value.shareUrl)
  useMessage('success', {
    attach: container,
    content: t('export.share.copied'),
  })
  dialogVisible = false
}
</script>

<style lang="less" scoped>
.mxm-share-container {
  padding: 2px;
  .mxm-share-tip {
    font-size: 12px;
    color: var(--mxm-text-color-light);
    margin-bottom: 6px;
    line-height: 1.4;
  }
  .mxm-share-textarea {
    :deep(textarea) {
      word-break: break-all;
      word-wrap: break-word;
    }
  }
}
</style>
