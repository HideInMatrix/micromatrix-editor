<template>
  <node-view-wrapper class="umo-node-view" :style="nodeStyle" style="min-width: 100%;">
    <div
      class="umo-node-container umo-node-ai umo-select-outline"
      :class="{
        'umo-hover-shadow': !options.document?.readOnly,
        'is-thinking': isThinking,
        'is-error': isError,
      }"
      @click="handleContainerClick"
    >
      <input
        ref="fileInputRef"
        class="umo-node-ai-file-input"
        type="file"
        :accept="attachmentAccept"
        :multiple="allowMultipleAttachments"
        :disabled="isInteractionLocked"
        @change="handleAttachmentChange"
      />

      <div class="umo-node-ai-composer">
        <div class="umo-node-ai-composer-chips">
          <span
            v-if="statusName !== 'idle'"
            class="umo-node-ai-chip is-status"
            :class="`is-${statusName}`"
          >
            <icon :name="statusIconName" size="14" />
            <span>{{ statusLabel }}</span>
          </span>
          <div
            v-for="item in attachments"
            :key="item.id"
            class="umo-node-ai-chip is-attachment"
            :title="item.name"
          >
            <icon name="file" size="14" />
            <span class="umo-node-ai-chip-text">{{ item.name }}</span>
            <button
              type="button"
              class="umo-node-ai-chip-remove"
              :disabled="isInteractionLocked"
              @click.stop="removeAttachment(item.id)"
            >
              <icon name="close" size="12" />
            </button>
          </div>
        </div>

        <t-textarea
          ref="promptInputRef"
          v-model="localPrompt"
          class="umo-node-ai-composer-input"
          :autosize="{ minRows: 4, maxRows: 8 }"
          :maxlength="1000"
          :readonly="isInteractionLocked"
          :disabled="isReadonly"
          :placeholder="inputPlaceholder"
          @keydown="handlePromptKeydown"
        />

        <div v-if="resultGroups.length > 0" class="umo-node-ai-result-group">
          <div class="umo-node-ai-result-group-title">
            {{ t('node.ai.preview') }}
          </div>
          <div class="umo-node-ai-result-list">
            <div
              v-for="item in resultGroups"
              :key="item.key"
              class="umo-node-ai-result-card"
              :class="`is-${item.kind}`"
            >
              <div class="umo-node-ai-result-card-head">
                <span class="umo-node-ai-result-chip" :class="`is-${item.kind}`">
                  <icon :name="item.icon" size="14" />
                  <span>{{ item.label }}</span>
                </span>
              </div>
              <div class="umo-node-ai-result-card-body">
                {{ item.text }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="isError && attrs.error" class="umo-node-ai-error">
          {{ attrs.error }}
        </div>

        <div class="umo-node-ai-composer-footer">
          <div class="umo-node-ai-composer-tools">
            <button
              type="button"
              class="umo-node-ai-icon-button"
              :disabled="isInteractionLocked"
              :title="uploadButtonText"
              @click.stop="openFilePicker"
            >
              <icon name="file" size="16" />
            </button>
            <button
              type="button"
              class="umo-node-ai-icon-button"
              :disabled="isInteractionLocked"
              :title="closeNodeLabel"
              @click.stop="discardNode"
            >
              <icon name="close" size="16" />
            </button>
          </div>

          <div class="umo-node-ai-footer-actions">
            <button
              v-if="showDecisionActions"
              type="button"
              class="umo-node-ai-icon-button is-decision"
              :disabled="isInteractionLocked"
              :title="t('node.ai.apply.append')"
              @click.stop="applyDecision('append')"
            >
              <icon name="block-add" size="16" />
            </button>
            <button
              v-if="showDecisionActions"
              type="button"
              class="umo-node-ai-icon-button is-decision"
              :disabled="isInteractionLocked"
              :title="t('node.ai.apply.replace')"
              @click.stop="applyDecision('replace')"
            >
              <icon name="node-switch" size="16" />
            </button>
            <button
              v-if="showCancelAction"
              type="button"
              class="umo-node-ai-icon-button is-decision"
              :disabled="isInteractionLocked"
              :title="cancelLabel"
              @click.stop="discardNode"
            >
              <icon name="close" size="16" />
            </button>

            <button
              type="button"
              class="umo-node-ai-send"
              :class="{ 'is-disabled': !canSubmit, 'is-loading': isThinking }"
              :disabled="!canSubmit"
              :title="submitLabel"
              @click.stop="submitPrompt"
            >
              <icon
                :name="isThinking ? 'loading' : 'arrow-down'"
                size="16"
                class="umo-node-ai-send-icon"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup>
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

import { useAiAttachments } from '@/composables/ai'
import {
  applyAiActions,
  canUseAiChat,
  getAiApplyMeta,
  getAiErrorMessage,
  normalizeAiResult,
  requestAiChat,
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
const {
  attachments,
  fileInputRef,
  accept: attachmentAccept,
  multiple: allowMultipleAttachments,
  handleFileChange: handleAttachmentChange,
  openFilePicker,
  removeAttachment,
} = useAiAttachments({
  aiOptions,
})

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
      chart?.title?.text ||
      (Array.isArray(chart?.title) ? chart.title[0]?.text : chart?.title) ||
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
const isInteractionLocked = computed(() => {
  return isReadonly.value || isThinking.value
})
const statusIconName = computed(() => {
  if (isThinking.value) {
    return 'loading'
  }
  if (isError.value) {
    return 'close'
  }
  return 'ai'
})

const getActionMeta = (action) => {
  if (action?.type === 'insert_echarts') {
    return {
      kind: 'chart',
      icon: 'echarts',
      label: t('node.ai.action.chart'),
    }
  }
  if (action?.type === 'patch') {
    return {
      kind: 'rewrite',
      icon: 'ai',
      label: t('node.ai.action.rewrite'),
    }
  }
  if (action?.type === 'insert_math') {
    return {
      kind: 'math',
      icon: 'math',
      label: t('node.ai.action.math'),
    }
  }
  if (action?.type === 'insert_mermaid') {
    return {
      kind: 'mermaid',
      icon: 'mermaid',
      label: t('node.ai.action.mermaid'),
    }
  }
  if (action?.type === 'insert_diagrams') {
    return {
      kind: 'flowchart',
      icon: 'diagrams',
      label: t('node.ai.action.flowchart'),
    }
  }
  return {
    kind: 'other',
    icon: 'file',
    label: t('node.ai.action.other'),
  }
}

const resultGroups = computed(() => {
  const groups = []
  const response = `${attrs.value.response || ''}`.trim()
  if (response) {
    groups.push({
      key: 'response',
      kind: 'response',
      icon: 'ai',
      label: t('node.ai.response'),
      text: response,
    })
  }

  const actions = Array.isArray(attrs.value.actions) ? attrs.value.actions : []
  actions.forEach((action, index) => {
    const preview =
      getActionPreviewText(action) || toPreviewText(JSON.stringify(action ?? {}))
    if (!preview) {
      return
    }
    groups.push({
      key: `${action?.type || 'action'}-${index}`,
      ...getActionMeta(action),
      text: preview,
    })
  })

  return groups
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
const uploadButtonText = computed(() => {
  return locale.value === 'zh-CN' ? '上传文件' : 'Upload files'
})
const canSubmit = computed(() => {
  return (
    !!localPrompt.value.trim() &&
    !isReadonly.value &&
    !isThinking.value &&
    aiOptions.value.enabled &&
    canUseAiChat(aiOptions.value)
  )
})
const showDecisionActions = computed(() => {
  return (
    statusName.value === 'done' &&
    Array.isArray(attrs.value.actions) &&
    attrs.value.actions.length > 0
  )
})
const showCancelAction = computed(() => {
  return (
    !isReadonly.value &&
    (
      !!localPrompt.value.trim() ||
      attachments.value.length > 0 ||
      statusName.value !== 'idle' ||
      resultGroups.value.length > 0
    )
  )
})
const cancelLabel = computed(() => {
  return showDecisionActions.value
    ? t('node.ai.apply.cancel')
    : t('node.ai.discard')
})
const closeNodeLabel = computed(() => {
  return locale.value === 'zh-CN' ? '关闭 AI 节点' : 'Close AI node'
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
  if (!isInteractionLocked.value) {
    focusPromptInput()
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
    attachments: attachments.value,
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
    const response = await requestAiChat(buildPayload(userPrompt), {
      ...aiOptions.value,
      locale: options.value.locale,
    })
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
    position: relative;
    background:
      linear-gradient(180deg, rgba(37, 99, 235, 0.035), rgba(37, 99, 235, 0.01))
        padding-box,
      linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.08))
        border-box;
    border: solid 1px transparent;
    border-radius: 14px;
    padding: 16px;
    box-sizing: border-box;
    transition:
      box-shadow 0.2s ease,
      background-position 0.2s ease,
      border-color 0.2s ease;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);

    &.is-thinking {
      background:
        linear-gradient(
            180deg,
            rgba(37, 99, 235, 0.05),
            rgba(56, 189, 248, 0.015)
          )
          padding-box,
        linear-gradient(
            110deg,
            rgba(37, 99, 235, 0.18),
            rgba(56, 189, 248, 0.95),
            rgba(37, 99, 235, 0.18)
          )
          border-box;
      background-size:
        100% 100%,
        240% 100%;
      animation: ai-border-flow 2.2s linear infinite;
      box-shadow: 0 14px 36px rgba(37, 99, 235, 0.1);
    }

    &.is-error {
      background:
        linear-gradient(180deg, rgba(214, 48, 49, 0.045), rgba(214, 48, 49, 0.01))
          padding-box,
        linear-gradient(135deg, rgba(214, 48, 49, 0.2), rgba(214, 48, 49, 0.08))
          border-box;
      box-shadow: 0 14px 34px rgba(214, 48, 49, 0.08);
    }
  }

  .umo-node-ai-composer {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .umo-node-ai-composer-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .umo-node-ai-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 0 7px;
    height: 24px;
    border-radius: 7px;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background-color: rgba(255, 255, 255, 0.88);
    color: var(--umo-text-color);
    box-sizing: border-box;
    font-size: 12px;
    line-height: 1;
    backdrop-filter: blur(8px);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease;

    .umo-icon {
      flex: none;
      font-size: 12px;
      color: #6b7280;
    }

    &.is-action {
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: rgba(37, 99, 235, 0.22);
        background-color: rgba(37, 99, 235, 0.06);
        color: var(--umo-primary-color);
      }
    }

    &.is-static,
    &.is-attachment {
      max-width: 100%;
    }

    &.is-status {
      border-color: rgba(37, 99, 235, 0.14);
      background-color: rgba(37, 99, 235, 0.06);
      color: var(--umo-primary-color);
    }

    &.is-status.is-thinking {
      border-color: rgba(56, 189, 248, 0.24);
      background-color: rgba(56, 189, 248, 0.1);
      color: #0369a1;

      .umo-icon {
        animation: ai-spin 1s linear infinite;
      }
    }

    &.is-status.is-error {
      border-color: rgba(214, 48, 49, 0.22);
      background-color: rgba(214, 48, 49, 0.08);
      color: var(--umo-error-color);
    }

    &.is-attachment {
      border-color: rgba(15, 23, 42, 0.08);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .umo-node-ai-chip-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .umo-node-ai-chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    padding: 0;
    border: none;
    background: transparent;
    color: #6b7280;
    cursor: pointer;
    border-radius: 999px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--umo-text-color);
    }
  }

  .umo-node-ai-composer-input {
    :deep(.t-textarea),
    :deep(.umo-textarea) {
      border: none;
      box-shadow: none;
      background: transparent;
      border-radius: 12px;
    }

    :deep(.t-textarea__inner),
    :deep(.umo-textarea__inner),
    :deep(textarea) {
      border: none;
      box-shadow: none;
      padding: 6px 2px 0;
      min-height: 120px;
      background: transparent;
      font-size: 14px;
      line-height: 1.7;
      resize: none;
      color: var(--umo-text-color);
    }

    :deep(textarea[readonly]) {
      cursor: default;
    }

    :deep(textarea::placeholder) {
      color: var(--umo-text-color-light);
    }
  }

  .umo-node-ai-result-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    background:
      linear-gradient(180deg, rgba(37, 99, 235, 0.045), rgba(37, 99, 235, 0.012)),
      rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(37, 99, 235, 0.08);
  }

  .umo-node-ai-result-group-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--umo-text-color-light);
    letter-spacing: 0.02em;
  }

  .umo-node-ai-result-list {
    display: grid;
    gap: 10px;
  }

  .umo-node-ai-result-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.03);

    &.is-response {
      border-color: rgba(37, 99, 235, 0.14);
    }

    &.is-rewrite {
      border-color: rgba(37, 99, 235, 0.14);
    }

    &.is-chart {
      border-color: rgba(14, 165, 233, 0.16);
    }

    &.is-math {
      border-color: rgba(16, 185, 129, 0.18);
    }

    &.is-mermaid,
    &.is-flowchart {
      border-color: rgba(249, 115, 22, 0.18);
    }
  }

  .umo-node-ai-result-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .umo-node-ai-result-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: 100%;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    line-height: 1;
    border: 1px solid transparent;
    background-color: rgba(15, 23, 42, 0.05);
    color: var(--umo-text-color-light);

    &.is-response,
    &.is-rewrite {
      background-color: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.14);
      color: var(--umo-primary-color);
    }

    &.is-chart {
      background-color: rgba(14, 165, 233, 0.08);
      border-color: rgba(14, 165, 233, 0.14);
      color: #0284c7;
    }

    &.is-math {
      background-color: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.14);
      color: #047857;
    }

    &.is-mermaid,
    &.is-flowchart {
      background-color: rgba(249, 115, 22, 0.09);
      border-color: rgba(249, 115, 22, 0.15);
      color: #c2410c;
    }
  }

  .umo-node-ai-result-card-body {
    font-size: 13px;
    line-height: 1.75;
    color: var(--umo-text-color);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .umo-node-ai-composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .umo-node-ai-composer-tools {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .umo-node-ai-footer-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .umo-node-ai-icon-button,
  .umo-node-ai-send {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--umo-text-color);
    cursor: pointer;
    flex: none;
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      opacity 0.2s ease;

    &:hover:not(:disabled) {
      background-color: rgba(37, 99, 235, 0.08);
      color: var(--umo-primary-color);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.48;
    }
  }

  .umo-node-ai-icon-button.is-decision {
    background-color: rgba(15, 23, 42, 0.035);
  }

  .umo-node-ai-send {
    width: 28px;
    height: 28px;
    background-color: var(--umo-primary-color);
    color: #fff;
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);

    &:hover:not(:disabled) {
      color: #fff;
      opacity: 0.92;
    }

    &.is-disabled {
      background-color: rgba(37, 99, 235, 0.36);
      color: rgba(255, 255, 255, 0.86);
    }

    &.is-loading:disabled {
      opacity: 1;
    }
  }

  .umo-node-ai-file-input {
    display: none;
  }

  .umo-node-ai-error {
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--umo-error-color);
    background-color: rgba(214, 48, 49, 0.06);
    font-size: 12px;
    line-height: 1.6;
  }

  .umo-node-ai-send-icon {
    transform: rotate(180deg);
  }

  .umo-node-ai-send.is-loading {
    .umo-node-ai-send-icon {
      transform: none;
      animation: ai-spin 1s linear infinite;
    }
  }
}

@keyframes ai-border-flow {
  0% {
    background-position:
      0 0,
      200% 0;
  }

  100% {
    background-position:
      0 0,
      -40% 0;
  }
}

@keyframes ai-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
