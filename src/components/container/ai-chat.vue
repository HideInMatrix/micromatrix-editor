<template>
  <div class="umo-ai-chat-container">
    <div class="umo-ai-chat-header">
      <div>
        <div class="umo-ai-chat-title">{{ panelTitle }}</div>
        <div class="umo-ai-chat-subtitle">{{ panelSubtitle }}</div>
      </div>
    </div>
    <div ref="messageListRef" class="umo-ai-chat-messages umo-scrollbar">
      <div v-if="scopeNotice" class="umo-ai-chat-notice">
        {{ scopeNotice }}
      </div>
      <div
        v-for="item in messages"
        :key="item.id"
        class="umo-ai-chat-message"
        :class="[`is-${item.role}`, { 'is-error': item.status === 'error' }]"
      >
        <div class="umo-ai-chat-message-role">
          {{ item.role === 'assistant' ? assistantName : userName }}
        </div>
        <div class="umo-ai-chat-message-body">{{ item.content }}</div>
        <div v-if="item.meta" class="umo-ai-chat-message-meta">
          {{ item.meta }}
        </div>
      </div>
      <div v-if="isSubmitting" class="umo-ai-chat-message is-assistant">
        <div class="umo-ai-chat-message-role">{{ assistantName }}</div>
        <div class="umo-ai-chat-message-body is-progress">
          <div class="umo-ai-chat-progress-head">
            <span>{{ loadingMessage }}</span>
            <span>{{ requestProgress }}%</span>
          </div>
          <div class="umo-ai-chat-progress-track">
            <span :style="{ width: `${requestProgress}%` }"></span>
          </div>
        </div>
      </div>
    </div>
    <div class="umo-ai-chat-toolbar">
      <div class="umo-ai-chat-scope">
        <button
          v-for="item in scopeOptions"
          :key="item.value"
          type="button"
          class="umo-ai-chat-scope-button"
          :class="{
            active: currentScope === item.value,
            disabled: item.value === 'selection' && !hasSelection,
          }"
          :disabled="item.value === 'selection' && !hasSelection"
          @click="currentScope = item.value"
        >
          {{ item.label }}
        </button>
      </div>
      <div class="umo-ai-chat-stats">{{ statsText }}</div>
    </div>
    <div v-if="showConfigTip" class="umo-ai-chat-tip">
      {{ configTipText }}
    </div>
    <div class="umo-ai-chat-input">
      <input
        ref="fileInputRef"
        class="umo-ai-chat-file-input"
        type="file"
        :accept="attachmentAccept"
        :multiple="allowMultipleAttachments"
        :disabled="isReadonly || isSubmitting"
        @change="handleAttachmentChange"
      />
      <t-textarea
        v-model="prompt"
        :autosize="{ minRows: 4, maxRows: 8 }"
        :maxlength="1000"
        :disabled="isReadonly || isSubmitting"
        :placeholder="inputPlaceholder"
        @keydown="handlePromptKeydown"
      />
      <div v-if="attachments.length > 0" class="umo-ai-chat-attachments">
        <div
          v-for="item in attachments"
          :key="item.id"
          class="umo-ai-chat-attachment"
        >
          <div class="umo-ai-chat-attachment-main">
            <div class="umo-ai-chat-attachment-name" :title="item.name">
              {{ item.name }}
            </div>
            <div class="umo-ai-chat-attachment-meta">
              {{ formatAttachmentMeta(item) }}
            </div>
          </div>
          <button
            type="button"
            class="umo-ai-chat-attachment-remove"
            :disabled="isSubmitting"
            @click="removeAttachment(item.id)"
          >
            <icon name="close" size="14" />
          </button>
        </div>
      </div>
      <div class="umo-ai-chat-actions">
        <t-button
          variant="outline"
          :disabled="isReadonly || isSubmitting"
          @click="openFilePicker"
        >
          {{ uploadButtonText }}
        </t-button>
        <div class="umo-ai-chat-action-buttons">
          <t-button
            variant="outline"
            :disabled="isSubmitting || messages.length <= 1"
            @click="resetSession"
          >
            {{ resetButtonText }}
          </t-button>
          <t-button
            theme="primary"
            :loading="isSubmitting"
            :disabled="!canSubmit"
            @click="submitPrompt"
          >
            {{ submitButtonText }}
          </t-button>
        </div>
      </div>
    </div>
    <div class="umo-ai-chat-resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<script setup>
import prettyBytes from 'pretty-bytes'

import {
  useAiAttachments,
  useAiEditorSnapshot,
  useAiProgress,
  useAiRequest,
  useAiSession,
} from '@/composables/ai'
import { l } from '@/composables/i18n'

const container = inject('container')
const editor = inject('editor')
const options = inject('options')
const page = inject('page')
const saveContent = inject('saveContent', null)

const {
  aiOptions,
  locale,
  assistantName,
  userName,
  isReadonly,
  inputPlaceholder,
  prompt,
  messages,
  isSubmitting,
  messageListRef,
  createMessageId,
  resetMessages,
  pushMessage,
} = useAiSession({
  options,
  editor,
})
const {
  documentText,
  selectionText,
  hasSelection,
  syncEditorSnapshot,
  getDocumentSnapshot,
  getSelectionSnapshot,
} = useAiEditorSnapshot({
  editor,
})
const {
  attachments,
  fileInputRef,
  accept: attachmentAccept,
  multiple: allowMultipleAttachments,
  handleFileChange: handleAttachmentChange,
  openFilePicker,
  removeAttachment,
  clearAttachments,
} = useAiAttachments({
  aiOptions,
})
const {
  progress: requestProgress,
  start: startRequestProgress,
  pulse: pulseRequestProgress,
  finish: finishRequestProgress,
  fail: failRequestProgress,
  reset: resetRequestProgress,
} = useAiProgress()

const panelTitle = computed(() => {
  return (
    l(aiOptions.value.title) ||
    (locale.value === 'zh-CN' ? 'AI 助手' : 'AI Assistant')
  )
})
const loadingMessage = computed(() =>
  locale.value === 'zh-CN'
    ? aiOptions.value.outputMode === 'stream'
      ? 'AI 正在流式生成修改建议...'
      : 'AI 正在生成修改建议...'
    : aiOptions.value.outputMode === 'stream'
      ? 'AI is streaming draft changes...'
      : 'AI is drafting changes...',
)
const submitButtonText = computed(() =>
  locale.value === 'zh-CN' ? '发送并修改' : 'Send and apply',
)
const resetButtonText = computed(() =>
  locale.value === 'zh-CN' ? '清空对话' : 'Clear chat',
)
const uploadButtonText = computed(() =>
  locale.value === 'zh-CN' ? '上传文件' : 'Upload files',
)
const configTipText = computed(() => {
  return locale.value === 'zh-CN'
    ? '默认会请求 ai.apiUrl 对应的 AI 服务并自动写回文档；可通过 ai.outputMode 配置同步输出或流式输出，如需完全自定义流程，也可以提供 ai.onChat。'
    : 'The editor will request the AI service at ai.apiUrl and apply the result automatically. Use ai.outputMode to switch between sync and streaming output, or provide ai.onChat for a fully custom flow.'
})
const showConfigTip = computed(() => aiOptions.value.showConfigTip !== false)
const panelSubtitle = computed(() => {
  if (isReadonly.value) {
    return locale.value === 'zh-CN'
      ? '当前为只读模式，仅可查看对话。'
      : 'Read-only mode is enabled, so the chat is view-only.'
  }
  if (hasSelection.value) {
    return locale.value === 'zh-CN'
      ? '可以基于当前选区或全文修改文档'
      : 'Revise the current selection or the full document'
  }
  return locale.value === 'zh-CN'
    ? '当前未选中文本，默认会修改全文'
    : 'No text selected, so revisions default to the full document'
})

let currentScope = $ref('auto')
const canSubmit = computed(() => {
  return (
    !!prompt.value.trim() &&
    !!editor.value &&
    !isReadonly.value &&
    !isSubmitting.value
  )
})

const truncateText = (value = '', maxLength = 120) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength)}...`
}

const formatAttachmentMeta = (item) => {
  const parts = []
  if (item.type) {
    parts.push(item.type)
  }
  if (Number.isFinite(item.size) && item.size > 0) {
    parts.push(prettyBytes(item.size))
  }
  if (!parts.length) {
    return locale.value === 'zh-CN' ? '待上传附件' : 'Pending attachment'
  }
  return parts.join(' / ')
}

const scopeOptions = computed(() => {
  const isZh = locale.value === 'zh-CN'
  return [
    { label: isZh ? '自动' : 'Auto', value: 'auto' },
    { label: isZh ? '选区' : 'Selection', value: 'selection' },
    { label: isZh ? '全文' : 'Document', value: 'document' },
  ]
})

const scopeNotice = computed(() => {
  if (hasSelection.value) {
    const label =
      currentScope === 'document'
        ? locale.value === 'zh-CN'
          ? '全文上下文'
          : 'Document context'
        : locale.value === 'zh-CN'
          ? '当前选区'
          : 'Current selection'
    return `${label}: ${truncateText(selectionText.value)}`
  }
  return locale.value === 'zh-CN'
    ? '当前没有选区，AI 将默认基于全文进行修改。'
    : 'There is no active selection, so AI will revise the full document by default.'
})

const statsText = computed(() => {
  const totalChars = documentText.value.replace(/\s/g, '').length
  const selectionChars = selectionText.value.replace(/\s/g, '').length
  if (locale.value === 'zh-CN') {
    return `选区 ${selectionChars} 字 / 全文 ${totalChars} 字`
  }
  return `Selection ${selectionChars} chars / Document ${totalChars} chars`
})

const normalizeScope = (scope) => {
  if (['auto', 'selection', 'document'].includes(scope)) {
    return scope
  }
  return 'auto'
}

watch(
  () => aiOptions.value.defaultScope,
  (scope) => {
    currentScope = normalizeScope(scope)
  },
  { immediate: true },
)

const resetSession = () => {
  prompt.value = ''
  resetMessages()
  clearAttachments()
}

onMounted(() => {
  resetSession()
})
onUnmounted(() => {
  stopResize()
})

const resolveScope = (scope = currentScope) => {
  const normalized = normalizeScope(scope)
  if (normalized === 'auto') {
    return hasSelection.value ? 'selection' : 'document'
  }
  if (normalized === 'selection' && !hasSelection.value) {
    return 'document'
  }
  return normalized
}

const buildPayload = (userPrompt, scope, selectionSnapshot, documentSnapshot) => {
  return {
    prompt: userPrompt,
    scope,
    messages: messages.value.map(({ role, content }) => ({ role, content })),
    document: documentSnapshot,
    selection: {
      text: selectionSnapshot.text,
      from: selectionSnapshot.from,
      to: selectionSnapshot.to,
      empty: selectionSnapshot.empty,
    },
    attachments: attachments.value,
    page: page.value,
    editor: {
      isEmpty: editor.value?.isEmpty,
      isEditable: editor.value?.isEditable,
    },
    container,
  }
}

const { submitPrompt, handlePromptKeydown } = useAiRequest({
  editor,
  options,
  aiOptions,
  saveContent,
  prompt,
  pushMessage,
  createMessageId,
  isSubmitting,
  canSubmit,
  progress: {
    start: startRequestProgress,
    pulse: pulseRequestProgress,
    finish: finishRequestProgress,
    fail: failRequestProgress,
    reset: resetRequestProgress,
  },
  buildRequestContext: async ({ userPrompt }) => {
    const scope = resolveScope()
    const selectionSnapshot = getSelectionSnapshot()
    const documentSnapshot = getDocumentSnapshot()

    return {
      payload: buildPayload(
        userPrompt,
        scope,
        selectionSnapshot,
        documentSnapshot,
      ),
      fallbackScope: scope,
      selectionRange: selectionSnapshot,
      afterApply: async () => {
        syncEditorSnapshot()
      },
    }
  },
})

const basePanelWidth = 320
const isResizing = ref(false)
const startX = ref(0)
const initialWidth = ref(basePanelWidth)
const getPageContainer = () => {
  return document.querySelector(`${container} .umo-main-container`)
}
const startResize = (event) => {
  const umoPageContainer = getPageContainer()
  if (!umoPageContainer) {
    return
  }
  isResizing.value = true
  startX.value = event.clientX
  const panel = umoPageContainer.querySelector('.umo-ai-chat-container')
  if (!panel) {
    return
  }
  initialWidth.value = parseInt(getComputedStyle(panel).width, 10)
  umoPageContainer.addEventListener('mousemove', resize)
  umoPageContainer.addEventListener('mouseup', stopResize)
}

const resize = (event) => {
  if (!isResizing.value) {
    return
  }
  const umoPageContainer = getPageContainer()
  if (!umoPageContainer) {
    return
  }
  const offsetX = event.clientX - startX.value
  const newWidth = initialWidth.value - offsetX
  const minWidth = basePanelWidth / 1.5
  const maxWidth = basePanelWidth * 2
  if (newWidth >= minWidth && newWidth <= maxWidth) {
    const panel = umoPageContainer.querySelector('.umo-ai-chat-container')
    if (panel) {
      panel.style.width = `${newWidth}px`
    }
  }
}

const stopResize = () => {
  isResizing.value = false
  const umoPageContainer = getPageContainer()
  umoPageContainer?.removeEventListener('mousemove', resize)
  umoPageContainer?.removeEventListener('mouseup', stopResize)
}
</script>

<style lang="less">
.umo-ai-chat-container {
  width: 320px;
  min-width: 213px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--umo-color-white);
  .umo-ai-chat-header {
    padding: 14px 16px 10px;
    border-bottom: solid 1px var(--umo-border-color-light);
  }
  .umo-ai-chat-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--umo-text-color);
  }
  .umo-ai-chat-subtitle {
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
    color: var(--umo-text-color-light);
  }
  .umo-ai-chat-messages {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  .umo-ai-chat-notice {
    font-size: 12px;
    line-height: 1.6;
    color: var(--umo-text-color-light);
    padding: 10px 12px;
    border-radius: var(--umo-radius);
    background-color: rgba(0, 0, 0, 0.03);
  }
  .umo-ai-chat-message {
    display: flex;
    flex-direction: column;
    gap: 6px;
    &.is-user {
      align-items: flex-end;
    }
    &.is-error .umo-ai-chat-message-body {
      border-color: rgba(214, 48, 49, 0.18);
      background-color: rgba(214, 48, 49, 0.06);
      color: var(--umo-error-color);
    }
  }
  .umo-ai-chat-message-role {
    font-size: 12px;
    color: var(--umo-text-color-light);
  }
  .umo-ai-chat-message-body {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border-radius: 12px;
    border: solid 1px rgba(0, 0, 0, 0.05);
    background-color: rgba(0, 0, 0, 0.025);
    line-height: 1.7;
    font-size: 13px;
    color: var(--umo-text-color);
    white-space: pre-wrap;
    word-break: break-word;

    &.is-progress {
      display: flex;
      flex-direction: column;
      gap: 10px;
      white-space: normal;
    }
  }
  .umo-ai-chat-progress-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--umo-text-color-light);
  }
  .umo-ai-chat-progress-track {
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.08);

    span {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.2s ease;
      background: linear-gradient(
        90deg,
        var(--umo-primary-color),
        rgba(56, 189, 248, 0.9)
      );
    }
  }
  .is-user .umo-ai-chat-message-body {
    background-color: var(--umo-button-hover-background);
    border-color: rgba(0, 0, 0, 0.06);
  }
  .umo-ai-chat-message-meta {
    font-size: 12px;
    color: var(--umo-primary-color);
  }
  .umo-ai-chat-toolbar {
    padding: 0 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .umo-ai-chat-scope {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .umo-ai-chat-scope-button {
    border: solid 1px var(--umo-border-color);
    background-color: var(--umo-color-white);
    border-radius: var(--umo-radius);
    padding: 8px 10px;
    font-size: 12px;
    color: var(--umo-text-color);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease;
    &.active {
      color: var(--umo-primary-color);
      border-color: rgba(0, 0, 0, 0.08);
      background-color: var(--umo-button-hover-background);
    }
    &.disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
  .umo-ai-chat-stats {
    font-size: 12px;
    color: var(--umo-text-color-light);
  }
  .umo-ai-chat-tip {
    margin: 0 16px 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--umo-text-color-light);
  }
  .umo-ai-chat-input {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .umo-ai-chat-file-input {
      display: none;
    }

    :deep(.umo-textarea__inner) {
      font-size: 13px;
      line-height: 1.6;
    }
  }
  .umo-ai-chat-attachments {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow: auto;
  }
  .umo-ai-chat-attachment {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background-color: rgba(0, 0, 0, 0.03);
    border: solid 1px rgba(0, 0, 0, 0.04);
  }
  .umo-ai-chat-attachment-main {
    flex: 1;
    min-width: 0;
  }
  .umo-ai-chat-attachment-name {
    font-size: 13px;
    line-height: 1.4;
    color: var(--umo-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .umo-ai-chat-attachment-meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--umo-text-color-light);
  }
  .umo-ai-chat-attachment-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 999px;
    padding: 0;
    background-color: transparent;
    color: var(--umo-text-color-light);
    cursor: pointer;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--umo-text-color);
    }
  }
  .umo-ai-chat-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .umo-ai-chat-action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .umo-ai-chat-resize-handle {
    position: absolute;
    top: 0;
    left: -2px;
    width: 3px;
    height: 100%;
    opacity: 0.5;
    background-color: transparent;
    &:hover {
      background-color: var(--umo-primary-color);
      cursor: col-resize;
    }
  }
}

.umo-editor-container.umo-skin-default {
  .umo-ai-chat-container {
    border-left: solid 1px var(--umo-border-color);
  }
}

[theme-mode='dark'] {
  .umo-ai-chat-container {
    .umo-ai-chat-notice,
    .umo-ai-chat-message-body,
    .umo-ai-chat-attachment {
      background-color: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.06);
    }
  }
}
</style>
