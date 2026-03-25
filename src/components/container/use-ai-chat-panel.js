import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import prettyBytes from 'pretty-bytes'

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
  getDecisionActions,
  getPendingPreviewItems,
  normalizeScope,
  resolveSelectionContext,
  truncateText,
} from './ai-chat.utils'

export const useAiChatPanel = () => {
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
      (isZhLocale.value ? 'AI 助手' : 'AI Assistant')
    )
  })
  const panelSubtitle = computed(() => {
    if (showDecisionActions.value) {
      return isZhLocale.value
        ? '建议已生成，确认后再写入文档。'
        : 'Suggestions are ready. Confirm before writing to the document.'
    }
    if (isReadonly.value) {
      return isZhLocale.value
        ? '当前为只读模式，仅可查看对话。'
        : 'Read-only mode is enabled, so the chat is view-only.'
    }
    if (hasSelection.value) {
      return isZhLocale.value
        ? '可以基于当前选区或全文修改文档'
        : 'Revise the current selection or the full document'
    }
    return isZhLocale.value
      ? '当前未选中文本，默认会修改全文'
      : 'No text selected, so revisions default to the full document'
  })
  const loadingMessage = computed(() =>
    isZhLocale.value
      ? aiOptions.value.outputMode === 'stream'
        ? 'AI 正在流式生成修改建议...'
        : 'AI 正在生成修改建议...'
      : aiOptions.value.outputMode === 'stream'
        ? 'AI is streaming draft changes...'
        : 'AI is drafting changes...',
  )
  const sendButtonText = computed(() =>
    isZhLocale.value ? '发送对话' : 'Send prompt',
  )
  const resetButtonText = computed(() =>
    isZhLocale.value ? '清空对话' : 'Clear chat',
  )
  const uploadButtonText = computed(() =>
    isZhLocale.value ? '上传文件' : 'Upload files',
  )
  const insertButtonText = computed(() =>
    isZhLocale.value ? '插入建议' : 'Insert suggestion',
  )
  const replaceButtonText = computed(() =>
    isZhLocale.value ? '替换内容' : 'Replace content',
  )
  const discardButtonText = computed(() =>
    isZhLocale.value ? '丢弃建议' : 'Discard suggestion',
  )
  const closeButtonText = computed(() =>
    isZhLocale.value ? '关闭 AI 面板' : 'Close AI panel',
  )
  const removeAttachmentText = computed(() =>
    isZhLocale.value ? '移除附件' : 'Remove attachment',
  )
  const pendingTitleText = computed(() =>
    isZhLocale.value ? '待确认建议' : 'Pending suggestion',
  )
  const composerTipText = computed(() => {
    if (showDecisionActions.value) {
      return canApplyReplace.value
        ? isZhLocale.value
          ? '建议已准备好，选择插入、替换或丢弃。'
          : 'The suggestion is ready. Choose insert, replace, or discard.'
        : isZhLocale.value
          ? '当前建议更适合插入，无法直接执行替换。'
          : 'This suggestion is better suited for insertion and cannot directly replace the document.'
    }
    return isZhLocale.value
      ? 'Enter 发送，Shift + Enter 换行。'
      : 'Press Enter to send, Shift + Enter for a new line.'
  })
  const configTipText = computed(() => {
    return isZhLocale.value
      ? '默认会请求 ai.apiUrl 对应的 AI 服务生成结构化建议；生成后由你手动决定插入、替换或丢弃，也可以通过 ai.onChat 完全自定义流程。'
      : 'The editor will request the AI service at ai.apiUrl to generate structured suggestions. After the response, you decide whether to insert, replace, or discard, and you can still fully customize the flow with ai.onChat.'
  })
  const scopeOptions = computed(() => {
    return [
      { label: isZhLocale.value ? '自动' : 'Auto', value: 'auto' },
      { label: isZhLocale.value ? '选区' : 'Selection', value: 'selection' },
      { label: isZhLocale.value ? '全文' : 'Document', value: 'document' },
    ]
  })
  const pendingPreviewItems = computed(() =>
    getPendingPreviewItems(
      pendingResult.value?.actions || [],
      isZhLocale.value,
    ),
  )
  const pendingCountText = computed(() => {
    const count = pendingPreviewItems.value.length
    return isZhLocale.value ? `${count} 项` : `${count} items`
  })
  const scopeNotice = computed(() => {
    if (hasSelection.value) {
      const label =
        currentScope.value === 'document'
          ? isZhLocale.value
            ? '全文上下文'
            : 'Document context'
          : isZhLocale.value
            ? '当前选区'
            : 'Current selection'
      return `${label}: ${truncateText(selectionText.value)}`
    }
    return isZhLocale.value
      ? '当前没有选区，AI 将默认基于全文进行修改。'
      : 'There is no active selection, so AI will revise the full document by default.'
  })
  const statsText = computed(() => {
    const totalChars = documentCharacters.value
    const selectionChars = selectionCharacters.value
    if (isZhLocale.value) {
      return `选区 ${selectionChars} 字 / 全文 ${totalChars} 字`
    }
    return `Selection ${selectionChars} chars / Document ${totalChars} chars`
  })

  const formatAttachmentMeta = (item) => {
    const parts = []
    if (item.type) {
      parts.push(item.type)
    }
    if (Number.isFinite(item.size) && item.size > 0) {
      parts.push(prettyBytes(item.size))
    }
    if (!parts.length) {
      return isZhLocale.value ? '待上传附件' : 'Pending attachment'
    }
    return parts.join(' / ')
  }

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
        meta: buildPendingMeta(
          normalized.actions?.length || 0,
          isZhLocale.value,
        ),
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

  return {
    assistantName,
    allowMultipleAttachments,
    attachmentAccept,
    attachments,
    canApplyReplace,
    canResetSession,
    canSubmit,
    closeButtonText,
    composerTipText,
    configTipText,
    currentScope,
    discardButtonText,
    discardPendingResult,
    fileInputRef,
    formatAttachmentMeta,
    handleAttachmentChange,
    handleClose,
    handlePromptKeydown,
    hasSelection,
    insertButtonText,
    inputPlaceholder,
    isReadonly,
    isSubmitting,
    isVisible,
    loadingMessage,
    messageListRef,
    messages,
    openFilePicker,
    panelSubtitle,
    panelTitle,
    pendingCountText,
    pendingPreviewItems,
    pendingTitleText,
    prompt,
    promptTextareaRef,
    removeAttachment,
    removeAttachmentText,
    replaceButtonText,
    requestProgress,
    resetButtonText,
    resetSession,
    scopeNotice,
    scopeOptions,
    sendButtonText,
    showConfigTip,
    showDecisionActions,
    startResize,
    statsText,
    submitPrompt,
    uploadButtonText,
    userName,
    applyDecision,
  }
}
