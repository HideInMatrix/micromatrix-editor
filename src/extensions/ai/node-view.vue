<template>
  <node-view-wrapper
    class="umo-node-view"
    :style="nodeStyle"
    @click.capture="editor?.commands.setNodeSelection(getPos())"
  >
    <div
      class="umo-node-container umo-node-ai umo-select-outline"
      :class="{
        'umo-hover-shadow': !options.document?.readOnly,
        'is-thinking': isThinking,
        'is-error': isError,
      }"
    >
      <div class="umo-node-ai-header">
        <div class="umo-node-ai-title">
          <icon name="ai" />
          <span>{{ title }}</span>
        </div>
        <div class="umo-node-ai-status" :class="`is-${statusName}`">
          {{ statusLabel }}
        </div>
      </div>

      <div v-if="createdAtText" class="umo-node-ai-time">
        {{ createdAtText }}
      </div>

      <div class="umo-node-ai-section">
        <div class="umo-node-ai-label">{{ t('node.ai.prompt') }}</div>
        <div class="umo-node-ai-text">{{ promptText }}</div>
      </div>

      <div class="umo-node-ai-section">
        <div class="umo-node-ai-label">{{ t('node.ai.response') }}</div>
        <div v-if="isThinking" class="umo-node-ai-skeleton" aria-hidden="true">
          <span class="line short"></span>
          <span class="line"></span>
          <span class="line"></span>
          <span class="line medium"></span>
        </div>
        <div v-else class="umo-node-ai-text">
          {{ responseText }}
        </div>
      </div>

      <div v-if="summaryText" class="umo-node-ai-summary">
        {{ summaryText }}
      </div>

      <div v-if="actionLabels.length > 0" class="umo-node-ai-actions">
        <span
          v-for="item in actionLabels"
          :key="item.key"
          class="umo-node-ai-action"
        >
          {{ item.label }}
        </span>
      </div>

      <div v-if="isError && attrs.error" class="umo-node-ai-error">
        {{ attrs.error }}
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const editor = inject('editor')
const options = inject('options')
const attrs = $computed(() => props.node.attrs)
const { getPos } = props

const statusName = computed(() => attrs.status || 'done')
const isThinking = computed(() => statusName.value === 'thinking')
const isError = computed(() => statusName.value === 'error')

const title = computed(() => attrs.title || t('node.ai.title'))
const promptText = computed(() => attrs.prompt || t('node.ai.emptyPrompt'))
const responseText = computed(() => {
  if (isError.value) {
    return attrs.error || t('node.ai.error')
  }
  return attrs.response || t('node.ai.emptyResponse')
})
const summaryText = computed(() => {
  if (attrs.summary) {
    return attrs.summary
  }
  if (isThinking.value) {
    return t('node.ai.thinking')
  }
  if (isError.value) {
    return t('node.ai.failed')
  }
  return t('node.ai.done')
})
const statusLabel = computed(() => {
  if (isThinking.value) {
    return t('node.ai.thinking')
  }
  if (isError.value) {
    return t('node.ai.failed')
  }
  return t('node.ai.done')
})

const actionLabels = computed(() => {
  if (!Array.isArray(attrs.actions)) {
    return []
  }
  return attrs.actions.map((action, index) => {
    let label = t('node.ai.action.other')
    if (action?.type === 'insert_echarts') {
      label = t('node.ai.action.chart')
    } else if (action?.type === 'patch') {
      label = t('node.ai.action.rewrite')
    }
    return {
      key: `${action?.type || 'action'}-${index}`,
      label,
    }
  })
})

const createdAtText = computed(() => {
  if (!attrs.createdAt) {
    return ''
  }
  const date = new Date(attrs.createdAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString(options.value.locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const nodeStyle = $computed(() => {
  const { nodeAlign, margin } = attrs
  const marginTop =
    margin?.top && margin?.top !== '' ? `${margin.top}px` : undefined
  const marginBottom =
    margin?.bottom && margin?.bottom !== '' ? `${margin.bottom}px` : undefined
  return {
    justifyContent: nodeAlign || 'center',
    marginTop,
    marginBottom,
  }
})
</script>

<style lang="less">
.umo-node-view {
  .umo-node-ai {
    width: min(100%, 720px);
    background:
      linear-gradient(180deg, rgba(37, 99, 235, 0.03), rgba(37, 99, 235, 0)),
      var(--umo-color-white);
    border: solid 1px rgba(37, 99, 235, 0.16);
    border-radius: 14px;
    padding: 16px;
    box-sizing: border-box;

    &.is-error {
      border-color: rgba(214, 48, 49, 0.18);
      background:
        linear-gradient(180deg, rgba(214, 48, 49, 0.04), rgba(214, 48, 49, 0)),
        var(--umo-color-white);
    }
  }

  .umo-node-ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .umo-node-ai-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--umo-text-color);
    font-size: 14px;
    font-weight: 600;

    .umo-icon {
      font-size: 16px;
      color: var(--umo-primary-color);
    }
  }

  .umo-node-ai-status {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    line-height: 1;
    background-color: rgba(37, 99, 235, 0.08);
    color: var(--umo-primary-color);

    &.is-thinking {
      background-color: rgba(245, 158, 11, 0.12);
      color: #c27a00;
    }

    &.is-error {
      background-color: rgba(214, 48, 49, 0.1);
      color: var(--umo-error-color);
    }
  }

  .umo-node-ai-time {
    margin-top: 8px;
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-node-ai-section {
    margin-top: 14px;
  }

  .umo-node-ai-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--umo-text-color-light);
    margin-bottom: 6px;
  }

  .umo-node-ai-text {
    font-size: 13px;
    line-height: 1.7;
    color: var(--umo-text-color);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .umo-node-ai-summary {
    margin-top: 12px;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.6;
    border-radius: 10px;
    background-color: rgba(37, 99, 235, 0.06);
    color: var(--umo-text-color);
  }

  .umo-node-ai-actions {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .umo-node-ai-action {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--umo-text-color-light);
    font-size: 12px;
  }

  .umo-node-ai-error {
    margin-top: 12px;
    color: var(--umo-error-color);
    font-size: 12px;
    line-height: 1.6;
  }

  .umo-node-ai-skeleton {
    display: grid;
    gap: 8px;

    .line {
      display: block;
      width: 100%;
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.05) 20%,
        rgba(0, 0, 0, 0.1) 40%,
        rgba(0, 0, 0, 0.05) 60%
      );
      background-size: 220% 100%;
      animation: ai-skeleton-shimmer 1.4s ease-in-out infinite;
    }

    .short {
      width: 42%;
    }

    .medium {
      width: 68%;
    }
  }
}

@keyframes ai-skeleton-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
