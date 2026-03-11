<template>
  <menus-button
    ico="embed"
    :text="t('export.embed.text')"
    huge
    @menu-click="dialogVisible = true"
  />
  <modal
    :visible="dialogVisible"
    width="460px"
    :confirm-btn="t('export.embed.copy')"
    @confirm="copyEmbed"
    @close="dialogVisible = false"
  >
    <template #header>
      <icon name="embed" />
      {{ t('export.embed.title') }}
    </template>
    <div class="mxm-embed-container">
      <div class="mxm-embed-tip" v-text="t('export.embed.tip')"></div>
      <t-textarea
        class="mxm-embed-textarea"
        :value="embedValue"
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

const embedValue = computed(() => {
  return `<iframe src="${options.value.shareUrl}" width="100%" height="720px" frameborder="0" allowfullscreen="true"></iframe>`
})

const copyEmbed = () => {
  const { copy } = useClipboard({ source: embedValue })
  copy()
  useMessage('success', {
    attach: container,
    content: t('export.embed.copied'),
  })
  dialogVisible = false
}
</script>

<style lang="less" scoped>
.mxm-embed-container {
  padding: 2px;
  .mxm-embed-tip {
    font-size: 12px;
    color: var(--mxm-text-color-light);
    margin-bottom: 6px;
    line-height: 1.4;
  }
  .mxm-embed-textarea {
    :deep(textarea) {
      word-break: break-all;
      word-wrap: break-word;
    }
  }
}
</style>
