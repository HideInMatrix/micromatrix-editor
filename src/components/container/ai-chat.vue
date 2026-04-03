<template>
  <div v-if="isVisible" class="umo-ai-chat-overlay" @click.self="handleClose">
    <div class="umo-ai-chat-container" role="dialog" aria-modal="true">
      <div class="umo-ai-chat-header">
        <div>
          <div class="umo-ai-chat-title">{{ panelTitle }}</div>
          <div class="umo-ai-chat-subtitle">{{ panelSubtitle }}</div>
        </div>
        <button
          type="button"
          class="umo-ai-chat-close"
          :title="closeButtonText"
          :aria-label="closeButtonText"
          @click="handleClose"
        >
          <icon name="close" size="16" />
        </button>
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
        <div
          class="umo-ai-chat-composer"
          :class="{ 'has-pending': showDecisionActions }"
        >
          <div
            v-if="pendingPreviewItems.length > 0"
            class="umo-ai-chat-pending"
          >
            <div class="umo-ai-chat-pending-head">
              <span>{{ pendingTitleText }}</span>
              <span>{{ pendingCountText }}</span>
            </div>
            <div class="umo-ai-chat-pending-list umo-scrollbar">
              <div
                v-for="item in pendingPreviewItems"
                :key="item.key"
                class="umo-ai-chat-pending-item"
              >
                <div class="umo-ai-chat-pending-icon">
                  <icon :name="item.icon" size="15" />
                </div>
                <div class="umo-ai-chat-pending-main">
                  <div class="umo-ai-chat-pending-label">{{ item.label }}</div>
                  <div class="umo-ai-chat-pending-text">{{ item.text }}</div>
                </div>
              </div>
            </div>
          </div>
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
                :title="removeAttachmentText"
                :aria-label="removeAttachmentText"
                @click="removeAttachment(item.id)"
              >
                <icon name="close" size="14" />
              </button>
            </div>
          </div>
          <t-textarea
            ref="promptTextareaRef"
            v-model="prompt"
            class="umo-ai-chat-textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            :maxlength="1000"
            :disabled="isReadonly || isSubmitting"
            :placeholder="inputPlaceholder"
            @keydown="handlePromptKeydown"
          />
          <div class="umo-ai-chat-composer-footer">
            <div class="umo-ai-chat-composer-tip">{{ composerTipText }}</div>
            <div class="umo-ai-chat-composer-actions">
              <button
                type="button"
                class="umo-ai-chat-icon-button"
                :disabled="isReadonly || isSubmitting"
                :title="uploadButtonText"
                :aria-label="uploadButtonText"
                @click="openFilePicker"
              >
                <icon name="file" size="16" />
              </button>
              <button
                type="button"
                class="umo-ai-chat-icon-button"
                :disabled="isSubmitting || !canResetSession"
                :title="resetButtonText"
                :aria-label="resetButtonText"
                @click="resetSession"
              >
                <icon name="reload" size="16" />
              </button>
              <button
                v-if="showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-decision"
                :disabled="isReadonly || isSubmitting"
                :title="insertButtonText"
                :aria-label="insertButtonText"
                @click="applyDecision('append')"
              >
                <icon name="block-add" size="16" />
              </button>
              <button
                v-if="showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-decision"
                :disabled="isReadonly || isSubmitting || !canApplyReplace"
                :title="replaceButtonText"
                :aria-label="replaceButtonText"
                @click="applyDecision('replace')"
              >
                <icon name="node-switch" size="16" />
              </button>
              <button
                v-if="showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-danger"
                :disabled="isReadonly || isSubmitting"
                :title="discardButtonText"
                :aria-label="discardButtonText"
                @click="discardPendingResult"
              >
                <icon name="close" size="16" />
              </button>
              <button
                type="button"
                class="umo-ai-chat-icon-button is-primary"
                :class="{ 'is-loading': isSubmitting }"
                :disabled="!canSubmit"
                :title="sendButtonText"
                :aria-label="sendButtonText"
                @click="submitPrompt"
              >
                <icon :name="isSubmitting ? 'loading' : 'reply'" size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="umo-ai-chat-resize-handle" @mousedown="startResize"></div>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import { useMessage } from '@/composables/dialog'
import {
  useAiAttachments,
  useAiEditorSnapshot,
  useAiProgress,
  useAiSession,
} from '@/composables/ai'
import { l } from '@/composables/i18n'
import {
  applyAiActions,
  canUseAiChat,
  getAiApplyMeta,
  getAiErrorMessage,
  normalizeAiResult,
  requestAiChat,
} from '@/utils/ai-actions'

import {
  buildAiChatPayload,
  buildPendingMeta,
  formatAiChatAttachmentMeta,
  getAiChatComposerTipText,
  getAiChatLoadingMessageText,
  getAiChatPanelSubtitleText,
  getAiChatPendingCountText,
  getAiChatScopeNoticeText,
  getAiChatScopeOptions,
  getAiChatStatsText,
  getAiChatText,
  getDecisionActions,
  getPendingPreviewItems,
  normalizeScope,
  resolveSelectionContext,
} from './ai-chat.utils'

const container = inject('container')
const editor = inject('editor')
const options = inject('options')
const page = inject('page')
const saveContent = inject('saveContent', null)
const aiChat = inject(
  'aiChat',
  ref({ visible: false, scope: 'auto', focusToken: 0 }),
)
const closeAiChat = inject('closeAiChat', null)
const promptTextareaRef = ref(null)
const pendingResult = ref(null)
const currentScope = ref('auto')

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
  documentCharacters,
  selectionText,
  selectionCharacters,
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

const isZhLocale = computed(() => locale.value === 'zh-CN')
const isVisible = computed(() => !!aiChat.value?.visible)
const showConfigTip = computed(() => aiOptions.value.showConfigTip !== false)
const showDecisionActions = computed(
  () => !!pendingResult.value?.actions?.length,
)
const canSubmit = computed(() => {
  return (
    !!prompt.value.trim() &&
    !!editor.value &&
    !isReadonly.value &&
    !isSubmitting.value &&
    aiOptions.value.enabled !== false &&
    canUseAiChat(aiOptions.value)
  )
})
const canResetSession = computed(() => {
  return (
    messages.value.length > 1 ||
    !!prompt.value.trim() ||
    attachments.value.length > 0 ||
    !!pendingResult.value
  )
})
const canApplyReplace = computed(() => {
  const pending = pendingResult.value
  if (!pending?.actions?.length) {
    return false
  }
  const activeSelection =
    pending.selectionAnchor || pending.selectionRange || null
  if (pending.scope === 'document') {
    return pending.actions.some((action) => action?.type === 'patch')
  }
  return !activeSelection?.empty
})

const panelTitle = computed(() => {
  return (
    l(aiOptions.value.title) ||
    getAiChatText('assistantTitle', isZhLocale.value)
  )
})
const panelSubtitle = computed(() => {
  return getAiChatPanelSubtitleText({
    isZhLocale: isZhLocale.value,
    showDecisionActions: showDecisionActions.value,
    isReadonly: isReadonly.value,
    hasSelection: hasSelection.value,
  })
})
const loadingMessage = computed(() =>
  getAiChatLoadingMessageText({
    isZhLocale: isZhLocale.value,
    outputMode: aiOptions.value.outputMode,
  }),
)
const sendButtonText = computed(() =>
  getAiChatText('sendButton', isZhLocale.value),
)
const resetButtonText = computed(() =>
  getAiChatText('resetButton', isZhLocale.value),
)
const uploadButtonText = computed(() =>
  getAiChatText('uploadButton', isZhLocale.value),
)
const insertButtonText = computed(() =>
  getAiChatText('insertButton', isZhLocale.value),
)
const replaceButtonText = computed(() =>
  getAiChatText('replaceButton', isZhLocale.value),
)
const discardButtonText = computed(() =>
  getAiChatText('discardButton', isZhLocale.value),
)
const closeButtonText = computed(() =>
  getAiChatText('closeButton', isZhLocale.value),
)
const removeAttachmentText = computed(() =>
  getAiChatText('removeAttachment', isZhLocale.value),
)
const pendingTitleText = computed(() =>
  getAiChatText('pendingTitle', isZhLocale.value),
)
const composerTipText = computed(() => {
  return getAiChatComposerTipText({
    isZhLocale: isZhLocale.value,
    showDecisionActions: showDecisionActions.value,
    canApplyReplace: canApplyReplace.value,
  })
})
const configTipText = computed(() =>
  getAiChatText('configTip', isZhLocale.value),
)
const scopeOptions = computed(() => getAiChatScopeOptions(isZhLocale.value))
const pendingPreviewItems = computed(() =>
  getPendingPreviewItems(pendingResult.value?.actions || [], isZhLocale.value),
)
const pendingCountText = computed(() => {
  return getAiChatPendingCountText(
    pendingPreviewItems.value.length,
    isZhLocale.value,
  )
})
const scopeNotice = computed(() => {
  return getAiChatScopeNoticeText({
    isZhLocale: isZhLocale.value,
    hasSelection: hasSelection.value,
    currentScope: currentScope.value,
    selectionText: selectionText.value,
  })
})
const statsText = computed(() => {
  return getAiChatStatsText({
    isZhLocale: isZhLocale.value,
    totalChars: documentCharacters.value,
    selectionChars: selectionCharacters.value,
  })
})

const formatAttachmentMeta = (item) =>
  formatAiChatAttachmentMeta(item, isZhLocale.value)

const resolveScope = (scope = currentScope.value) => {
  const normalized = normalizeScope(scope)
  if (normalized === 'auto') {
    return hasSelection.value ? 'selection' : 'document'
  }
  if (normalized === 'selection' && !hasSelection.value) {
    return 'document'
  }
  return normalized
}

const focusPromptInput = async () => {
  await nextTick()
  const textarea =
    promptTextareaRef.value?.$el?.querySelector?.('textarea') ||
    document.querySelector(`${container} .umo-ai-chat-container textarea`)
  textarea?.focus?.()
}

const clearPendingResult = () => {
  pendingResult.value = null
}

const resetSession = () => {
  prompt.value = ''
  resetMessages()
  clearAttachments()
  clearPendingResult()
  resetRequestProgress()
}

const submitPrompt = async () => {
  const editorInstance = editor.value
  if (!editorInstance || !canSubmit.value) {
    return
  }

  const userPrompt = prompt.value.trim()
  const scope = resolveScope()
  const { selectionSnapshot, selectionAnchor } = resolveSelectionContext({
    selectionSnapshot: getSelectionSnapshot(),
    selectionAnchor: aiChat.value?.selectionAnchor
      ? { ...aiChat.value.selectionAnchor }
      : null,
  })
  const documentSnapshot = getDocumentSnapshot()
  const requestPayload = buildAiChatPayload({
    userPrompt,
    scope,
    messages: messages.value,
    selectionSnapshot,
    documentSnapshot,
    attachments: attachments.value,
    page: page.value,
    editor: editorInstance,
    container,
  })

  await pushMessage({
    id: createMessageId(),
    role: 'user',
    content: userPrompt,
  })
  prompt.value = ''
  clearPendingResult()
  isSubmitting.value = true
  startRequestProgress()

  try {
    const response = await requestAiChat(
      requestPayload,
      {
        ...aiOptions.value,
        locale: options.value.locale,
      },
      {
        onText: async () => {
          pulseRequestProgress()
        },
      },
    )
    const normalized = normalizeAiResult(response, scope, {
      locale: options.value.locale,
      autoApply: false,
      autoSave: false,
    })

    pendingResult.value =
      normalized.actions?.length > 0
        ? {
            ...normalized,
            scope,
            selectionRange: { ...selectionSnapshot },
            selectionAnchor,
          }
        : null

    await finishRequestProgress()
    await pushMessage({
      id: createMessageId(),
      role: 'assistant',
      content: normalized.message,
      meta: buildPendingMeta(normalized.actions?.length || 0, isZhLocale.value),
    })
  } catch (error) {
    const errorMessage = getAiErrorMessage(error, {
      locale: options.value.locale,
    })

    await failRequestProgress()
    await pushMessage({
      id: createMessageId(),
      role: 'assistant',
      status: 'error',
      content: errorMessage,
    })
  } finally {
    isSubmitting.value = false
    resetRequestProgress()
  }
}

const discardPendingResult = async () => {
  if (!pendingResult.value) {
    return
  }
  clearPendingResult()
  await focusPromptInput()
}

const applyDecision = async (decision) => {
  if (!editor.value || !showDecisionActions.value) {
    return
  }

  try {
    const result = await applyAiActions(
      getDecisionActions({
        pending: pendingResult.value,
        decision,
      }),
      pendingResult.value?.scope || 'document',
      {
        editor: editor.value,
        selectionRange: pendingResult.value?.selectionRange,
        selectionAnchor: pendingResult.value?.selectionAnchor,
      },
    )
    const changed = result.some((item) => item?.changed)
    if (!changed) {
      useMessage('error', {
        attach: container,
        content: isZhLocale.value
          ? '当前建议没有产生可应用的变更。'
          : 'The current suggestion did not produce applicable changes.',
      })
      return
    }

    if (aiOptions.value.autoSave === true && saveContent) {
      await saveContent(false)
    }

    clearPendingResult()
    syncEditorSnapshot()
    await focusPromptInput()
    useMessage('success', {
      attach: container,
      content:
        getAiApplyMeta(result, {
          locale: options.value.locale,
        }) ||
        (isZhLocale.value
          ? '已应用 AI 建议。'
          : 'The AI suggestion was applied.'),
    })
  } catch (error) {
    const errorMessage = getAiErrorMessage(error, {
      locale: options.value.locale,
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
  () => aiOptions.value.defaultScope,
  (scope) => {
    currentScope.value = normalizeScope(scope)
  },
  { immediate: true },
)

watch(
  () => aiChat.value,
  async (state) => {
    if (!state?.visible) {
      return
    }
    currentScope.value = normalizeScope(state.scope)
    await focusPromptInput()
  },
  { deep: true },
)

const handleClose = () => {
  stopResize()
  closeAiChat?.()
}

const handleWindowKeydown = (event) => {
  if (event.key === 'Escape' && isVisible.value) {
    handleClose()
  }
}

onMounted(() => {
  resetSession()
  window.addEventListener('keydown', handleWindowKeydown)
})
onUnmounted(() => {
  stopResize()
  window.removeEventListener('keydown', handleWindowKeydown)
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

<style src="./ai-chat.less" lang="less"></style>
