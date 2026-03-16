<template>
  <node-view-wrapper class="umo-node-view" :style="nodeStyle">
    <div
      class="umo-node-container umo-node-ai umo-select-outline"
      :class="{
        'umo-hover-shadow': !options.document?.readOnly,
        'is-thinking': isThinking,
        'is-error': isError,
      }"
      @click="handleContainerClick"
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
        <div class="umo-node-ai-label">{{ t('node.ai.context') }}</div>
        <div class="umo-node-ai-text is-context">{{ contextText }}</div>
      </div>

      <div class="umo-node-ai-section">
        <div class="umo-node-ai-label">{{ t('node.ai.prompt') }}</div>
        <t-textarea
          ref="promptInputRef"
          v-model="localPrompt"
          class="umo-node-ai-input"
          :autosize="{ minRows: 3, maxRows: 6 }"
          :maxlength="1000"
          :disabled="isReadonly || isThinking"
          :placeholder="inputPlaceholder"
          @keydown="handlePromptKeydown"
        />
      </div>

      <div class="umo-node-ai-toolbar">
        <t-button
          theme="primary"
          :loading="isThinking"
          :disabled="!canSubmit"
          @click="submitPrompt"
        >
          {{ submitLabel }}
        </t-button>
        <t-button
          theme="default"
          variant="base"
          :disabled="isThinking"
          @click="discardNode"
        >
          {{ t('node.ai.discard') }}
        </t-button>
      </div>

      <div class="umo-node-ai-section">
        <div class="umo-node-ai-label">{{ t('node.ai.response') }}</div>
        <div v-if="isThinking" class="umo-node-ai-skeleton" aria-hidden="true">
          <span class="line short"></span>
          <span class="line"></span>
          <span class="line"></span>
          <span class="line medium"></span>
        </div>
        <div v-else class="umo-node-ai-text" :class="{ 'is-empty': !responseText }">
          {{ responseText || t('node.ai.emptyResponse') }}
        </div>
      </div>

      <div v-if="previewText" class="umo-node-ai-preview">
        <div class="umo-node-ai-label">{{ t('node.ai.preview') }}</div>
        <div class="umo-node-ai-text">{{ previewText }}</div>
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

      <div v-if="showDecisionActions" class="umo-node-ai-decisions">
        <t-button
          theme="primary"
          :disabled="isThinking"
          @click="applyDecision('append')"
        >
          {{ t('node.ai.apply.append') }}
        </t-button>
        <t-button
          theme="default"
          :disabled="isThinking"
          @click="applyDecision('replace')"
        >
          {{ t('node.ai.apply.replace') }}
        </t-button>
        <t-button
          theme="default"
          variant="base"
          :disabled="isThinking"
          @click="discardNode"
        >
          {{ t('node.ai.apply.cancel') }}
        </t-button>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

import {
  applyAiActions,
  getAiApplyMeta,
  getAiErrorMessage,
  normalizeAiResult,
} from '@/utils/ai-actions'

const props = defineProps(nodeViewProps)

const editor = inject('editor')
const options = inject('options')
const page = inject('page')
const container = inject('container')
const saveContent = inject('saveContent', null)

const promptInputRef = ref(null)
const attrs = computed(() => props.node.attrs)
const aiOptions = computed(() => options.value.ai || {})
const locale = computed(() => options.value.locale || 'zh-CN')

const nodeInsertTypes = new Set([
  'insert_echarts',
  'insert_math',
  'insert_mermaid',
  'insert_diagrams',
])

const htmlToText = (value = '') => {
  if (!value || typeof value !== 'string') {
    return ''
  }
  if (typeof DOMParser === 'undefined') {
    return value
  }
  try {
    const doc = new DOMParser().parseFromString(value, 'text/html')
    return doc.body?.textContent?.trim() || ''
  } catch {
    return value
  }
}

const toPreviewText = (value = '', limit = 280) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) {
    return normalized
  }
  return `${normalized.slice(0, limit)}...`
}

const getPatchPreview = (action) => {
  const content =
    action?.content ??
    action?.html ??
    action?.text ??
    action?.json ??
    ''
  const format =
    action?.format ||
    (typeof content === 'string' && content.trim().startsWith('<')
      ? 'html'
      : 'text')

  if (format === 'json') {
    return toPreviewText(JSON.stringify(content))
  }
  if (format === 'html') {
    return toPreviewText(htmlToText(`${content}`))
  }
  return toPreviewText(`${content}`)
}

const getActionPreviewText = (action) => {
  if (!action || typeof action !== 'object') {
    return ''
  }
  if (action.type === 'patch') {
    return getPatchPreview(action)
  }
  if (action.type === 'insert_math') {
    const {math} = action
    const latex =
      typeof math === 'string'
        ? math
        : math?.latex || math?.content || math?.formula || ''
    return locale.value === 'zh-CN'
      ? `公式：${latex}`
      : `Formula: ${latex}`
  }
  if (action.type === 'insert_mermaid') {
    const mermaid =
      typeof action.mermaid === 'string'
        ? action.mermaid
        : action.mermaid?.content || action.mermaid?.code || ''
    return locale.value === 'zh-CN'
      ? `Mermaid 图：${toPreviewText(mermaid, 180)}`
      : `Mermaid: ${toPreviewText(mermaid, 180)}`
  }
  if (action.type === 'insert_diagrams') {
    return locale.value === 'zh-CN' ? '流程图节点预览已生成。' : 'Flowchart node is ready.'
  }
  if (action.type === 'insert_echarts') {
    const chart = action.chart || {}
    const title =
      chart?.name ||
      chart?.title ||
      chart?.describe ||
      chart?.description ||
      ''
    return locale.value === 'zh-CN'
      ? `图表：${title || '已生成图表节点'}`
      : `Chart: ${title || 'Chart node is ready'}`
  }
  return ''
}

const focusPromptInput = async () => {
  await nextTick()
  const textarea =
    promptInputRef.value?.textarea ||
    promptInputRef.value?.$el?.querySelector('textarea') ||
    promptInputRef.value?.querySelector?.('textarea')
  textarea?.focus?.()
}

const localPrompt = ref('')

watch(
  () => attrs.value.prompt,
  (value) => {
    localPrompt.value = value || ''
  },
  { immediate: true },
)

const {getPos} = props

const isReadonly = computed(() => {
  return options.value.document?.readOnly || !editor.value?.isEditable
})
const statusName = computed(() => attrs.value.status || 'idle')
const isThinking = computed(() => statusName.value === 'thinking')
const isError = computed(() => statusName.value === 'error')

const title = computed(() => attrs.value.title || t('node.ai.title'))
const contextText = computed(() => {
  if (attrs.value.contextText) {
    return attrs.value.contextText
  }
  return locale.value === 'zh-CN'
    ? '当前没有可用上下文。'
    : 'No context is available.'
})
const responseText = computed(() => {
  if (isError.value) {
    return attrs.value.error || t('node.ai.error')
  }
  return attrs.value.response || ''
})
const previewText = computed(() => {
  if (!Array.isArray(attrs.value.actions) || attrs.value.actions.length === 0) {
    return ''
  }
  return attrs.value.actions
    .map((action) => getActionPreviewText(action))
    .filter(Boolean)
    .join('\n\n')
})
const statusLabel = computed(() => {
  if (isThinking.value) {
    return t('node.ai.thinking')
  }
  if (isError.value) {
    return t('node.ai.failed')
  }
  if (statusName.value === 'done') {
    return t('node.ai.done')
  }
  return t('node.ai.idle')
})
const submitLabel = computed(() => {
  return statusName.value === 'done'
    ? t('node.ai.regenerate')
    : t('node.ai.generate')
})
const inputPlaceholder = computed(() => {
  if (isReadonly.value) {
    return locale.value === 'zh-CN'
      ? '当前文档为只读，无法应用 AI 修改。'
      : 'The document is read-only, so AI changes cannot be applied.'
  }
  return t('node.ai.placeholder')
})
const canSubmit = computed(() => {
  return (
    !!localPrompt.value.trim() &&
    !isReadonly.value &&
    !isThinking.value &&
    aiOptions.value.enabled &&
    typeof aiOptions.value.onChat === 'function'
  )
})
const showDecisionActions = computed(() => {
  return (
    statusName.value === 'done' &&
    Array.isArray(attrs.value.actions) &&
    attrs.value.actions.length > 0
  )
})

const actionLabels = computed(() => {
  if (!Array.isArray(attrs.value.actions)) {
    return []
  }
  return attrs.value.actions.map((action, index) => {
    let label = t('node.ai.action.other')
    if (action?.type === 'insert_echarts') {
      label = t('node.ai.action.chart')
    } else if (action?.type === 'patch') {
      label = t('node.ai.action.rewrite')
    } else if (action?.type === 'insert_math') {
      label = t('node.ai.action.math')
    } else if (action?.type === 'insert_mermaid') {
      label = t('node.ai.action.mermaid')
    } else if (action?.type === 'insert_diagrams') {
      label = t('node.ai.action.flowchart')
    }
    return {
      key: `${action?.type || 'action'}-${index}`,
      label,
    }
  })
})

const createdAtText = computed(() => {
  if (!attrs.value.createdAt) {
    return ''
  }
  const date = new Date(attrs.value.createdAt)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const nodeStyle = computed(() => {
  const { nodeAlign, margin } = attrs.value
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

const updateNodeAttrs = (nextAttrs) => {
  if (typeof props.updateAttributes === 'function') {
    props.updateAttributes(nextAttrs)
    return
  }
  editor.value?.commands.updateAiById(attrs.value.id, nextAttrs)
}

const discardNode = () => {
  if (typeof props.deleteNode === 'function') {
    props.deleteNode()
    return
  }
  editor.value?.commands.deleteAiById(attrs.value.id)
}

const handleContainerClick = (event) => {
  const target =
    event.target instanceof Element ? event.target : event.target?.parentElement
  if (
    target?.closest(
      'textarea,button,input,.t-textarea,.t-button,.umo-node-ai-input',
    )
  ) {
    return
  }
  editor.value?.commands.setNodeSelection(getPos())
}

const buildPayload = (userPrompt) => {
  return {
    prompt: userPrompt,
    scope: 'selection',
    messages: [{ role: 'user', content: userPrompt }],
    document: {
      html: editor.value?.getHTML?.() || '',
      text: editor.value?.getText?.() || '',
      json: editor.value?.getJSON?.() || null,
    },
    selection: attrs.value.selectionRange || {
      from: 0,
      to: 0,
      empty: true,
      text: '',
    },
    block: attrs.value.block || null,
    page: page.value,
    editor: {
      isEmpty: editor.value?.isEmpty,
      isEditable: editor.value?.isEditable,
    },
  }
}

const submitPrompt = async () => {
  if (!canSubmit.value || !editor.value) {
    return
  }

  const userPrompt = localPrompt.value.trim()
  updateNodeAttrs({
    prompt: userPrompt,
    response: '',
    summary: '',
    status: 'thinking',
    error: '',
    actions: [],
  })

  try {
    const response = await aiOptions.value.onChat(buildPayload(userPrompt))
    const normalized = normalizeAiResult(response, 'selection', {
      locale: options.value.locale,
      autoApply: false,
      autoSave: false,
    })

    updateNodeAttrs({
      prompt: userPrompt,
      response: normalized.message,
      summary: '',
      status: 'done',
      error: '',
      actions: normalized.actions || [],
    })
  } catch (error) {
    const errorMessage = getAiErrorMessage(error, {
      locale: options.value.locale,
    })
    updateNodeAttrs({
      prompt: userPrompt,
      response: '',
      summary: '',
      status: 'error',
      error: errorMessage,
      actions: [],
    })
  }
}

const getDecisionActions = (decision) => {
  return (attrs.value.actions || []).map((action, index) => {
    if (!action || typeof action !== 'object') {
      return action
    }

    if (action.type === 'patch') {
      return {
        ...action,
        target: 'selection',
        mode:
          decision === 'replace'
            ? index === 0
              ? 'replace'
              : 'append'
            : 'append',
      }
    }

    if (nodeInsertTypes.has(action.type)) {
      return {
        ...action,
        target: 'selection',
        position:
          decision === 'replace'
            ? index === 0
              ? 'replace'
              : 'after'
            : 'after',
      }
    }

    return action
  })
}

const applyDecision = async (decision) => {
  if (!showDecisionActions.value || !editor.value) {
    return
  }

  try {
    const result = await applyAiActions(getDecisionActions(decision), 'selection', {
      editor: editor.value,
      options: options.value,
      selectionRange: attrs.value.selectionRange,
    })
    const changed = result.some((item) => item?.changed)
    if (!changed) {
      useMessage('error', {
        attach: container,
        content: t('node.ai.apply.empty'),
      })
      return
    }

    if (aiOptions.value.autoSave === true && saveContent) {
      await saveContent(false)
    }

    useMessage('success', {
      attach: container,
      content:
        getAiApplyMeta(result, {
          locale: options.value.locale,
        }) || t('node.ai.apply.success'),
    })
    discardNode()
  } catch (error) {
    const errorMessage = getAiErrorMessage(error, {
      locale: options.value.locale,
    })
    updateNodeAttrs({
      status: 'error',
      error: errorMessage,
    })
    useMessage('error', {
      attach: container,
      content: errorMessage,
    })
  }
}

const handlePromptKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submitPrompt()
  }
}

watch(
  () => statusName.value,
  (value) => {
    if (value === 'idle') {
      focusPromptInput()
    }
  },
  { immediate: true },
)
</script>

<style lang="less">
.umo-node-view {
  .umo-node-ai {
    width: min(100%, 760px);
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
    background-color: rgba(100, 116, 139, 0.1);
    color: #475569;

    &.is-thinking {
      background-color: rgba(245, 158, 11, 0.12);
      color: #c27a00;
    }

    &.is-done {
      background-color: rgba(37, 99, 235, 0.08);
      color: var(--umo-primary-color);
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

    &.is-context {
      max-height: 140px;
      overflow: auto;
      padding: 10px 12px;
      border-radius: 12px;
      background-color: rgba(0, 0, 0, 0.03);
    }

    &.is-empty {
      color: var(--umo-text-color-light);
    }
  }

  .umo-node-ai-input {
    :deep(textarea) {
      line-height: 1.7;
    }
  }

  .umo-node-ai-toolbar {
    margin-top: 12px;
    display: flex;
    gap: 8px;
  }

  .umo-node-ai-preview {
    margin-top: 14px;
    padding: 12px;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(37, 99, 235, 0.04), rgba(37, 99, 235, 0)),
      rgba(0, 0, 0, 0.02);
  }

  .umo-node-ai-actions {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .umo-node-ai-action {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--umo-primary-color);
    background-color: rgba(37, 99, 235, 0.08);
  }

  .umo-node-ai-error {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--umo-error-color);
    background-color: rgba(214, 48, 49, 0.06);
    font-size: 12px;
    line-height: 1.6;
  }

  .umo-node-ai-decisions {
    margin-top: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .umo-node-ai-skeleton {
    display: grid;
    gap: 8px;

    .line {
      display: block;
      height: 10px;
      border-radius: 999px;
      background:
        linear-gradient(90deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.08));
      background-size: 200% 100%;
      animation: ai-skeleton 1.2s ease-in-out infinite;

      &.short {
        width: 38%;
      }

      &.medium {
        width: 72%;
      }
    }
  }
}

@keyframes ai-skeleton {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
