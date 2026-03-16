import { computed, nextTick, ref, unref, watch, onUnmounted } from 'vue'

import { l } from '@/composables/i18n'
import {
  applyAiActions,
  getAiApplyMeta,
  getAiErrorMessage,
  normalizeAiResult,
} from '@/utils/ai-actions'
import { getSelectionText } from '@/utils/selection'

const resolveParam = (value, context) => {
  return typeof value === 'function' ? value(context) : value
}

const resolveValue = (value) => {
  return typeof value === 'function' ? value() : unref(value)
}

export const useAiSession = ({
  options,
  editor,
  getWelcomeContent,
  getInputPlaceholder,
  getMaxMessages,
}) => {
  const aiOptions = computed(() => options.value.ai || {})
  const locale = computed(() => options.value.locale || 'zh-CN')
  const assistantName = computed(() =>
    locale.value === 'zh-CN' ? 'AI 助手' : 'AI Assistant',
  )
  const userName = computed(() => {
    if (options.value.user?.label) {
      return options.value.user.label
    }
    return locale.value === 'zh-CN' ? '你' : 'You'
  })
  const isReadonly = computed(() => {
    return options.value.document?.readOnly || !editor.value?.isEditable
  })
  const prompt = ref('')
  const messages = ref([])
  const isSubmitting = ref(false)
  const messageListRef = ref(null)

  const inputPlaceholder = computed(() => {
    if (isReadonly.value) {
      return locale.value === 'zh-CN'
        ? '当前文档为只读，无法应用 AI 修改。'
        : 'The document is read-only, so AI changes cannot be applied.'
    }

    const custom = resolveParam(getInputPlaceholder, {
      aiOptions: aiOptions.value,
      locale: locale.value,
      options: options.value,
    })
    if (custom) {
      return custom
    }

    return (
      l(aiOptions.value.placeholder) ||
      'Describe how AI should revise the document...'
    )
  })

  const createMessageId = () => {
    return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  const buildWelcomeMessage = () => {
    const custom = resolveParam(getWelcomeContent, {
      aiOptions: aiOptions.value,
      locale: locale.value,
      options: options.value,
    })
    return {
      id: createMessageId(),
      role: 'assistant',
      content:
        custom ||
        l(aiOptions.value.welcomeMessage) ||
        (locale.value === 'zh-CN'
          ? '告诉我你希望如何修改文档。'
          : 'Tell me how you want the document changed.'),
    }
  }

  const scrollMessagesToBottom = async () => {
    await nextTick()
    messageListRef.value?.scrollTo({
      top: messageListRef.value.scrollHeight,
      behavior: 'smooth',
    })
  }

  const resetMessages = () => {
    messages.value = [buildWelcomeMessage()]
  }

  const pushMessage = async (message) => {
    const context = {
      aiOptions: aiOptions.value,
      locale: locale.value,
      options: options.value,
    }
    const limit =
      resolveParam(getMaxMessages, context) || aiOptions.value.maxMessages || 20
    let next = [...messages.value, message]
    if (next.length > limit) {
      next = [next[0], ...next.slice(-(limit - 1))]
    }
    messages.value = next
    await scrollMessagesToBottom()
  }

  return {
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
    buildWelcomeMessage,
    resetMessages,
    pushMessage,
    scrollMessagesToBottom,
  }
}

export const useAiRequest = ({
  editor,
  options,
  aiOptions,
  saveContent,
  prompt,
  pushMessage,
  createMessageId,
  isSubmitting,
  canSubmit,
  buildRequestContext,
}) => {
  const submitPrompt = async () => {
    const editorInstance = editor.value
    if (!editorInstance || !resolveValue(canSubmit)) {
      return
    }

    const userPrompt = prompt.value.trim()
    const requestContext = await buildRequestContext({ userPrompt })
    if (!requestContext) {
      return
    }

    if (typeof requestContext.beforeSend === 'function') {
      await requestContext.beforeSend()
    }

    await pushMessage({
      id: createMessageId(),
      role: 'user',
      content: userPrompt,
    })
    prompt.value = ''
    isSubmitting.value = true

    try {
      const response = await aiOptions.value.onChat(requestContext.payload)
      const normalized = normalizeAiResult(
        response,
        requestContext.fallbackScope || 'selection',
        {
          locale: options.value.locale,
          autoApply: aiOptions.value.autoApply !== false,
          autoSave: aiOptions.value.autoSave === true,
        },
      )

      let applyResult = []
      if (normalized.autoApply && normalized.actions?.length) {
        applyResult = await applyAiActions(
          normalized.actions,
          requestContext.fallbackScope || 'selection',
          {
            editor: editorInstance,
            options: options.value,
            selectionRange: requestContext.selectionRange,
            ...requestContext.applyContext,
          },
        )

        if (
          applyResult.some((item) => item?.changed) &&
          normalized.autoSave &&
          saveContent
        ) {
          await saveContent(false)
        }
      }

      const applyMeta = getAiApplyMeta(applyResult, {
        locale: options.value.locale,
      })

      if (typeof requestContext.afterApply === 'function') {
        await requestContext.afterApply({
          applyMeta,
          applyResult,
          normalized,
          requestContext,
          userPrompt,
        })
      }

      if (typeof requestContext.onSuccess === 'function') {
        await requestContext.onSuccess({
          applyMeta,
          applyResult,
          normalized,
          requestContext,
          userPrompt,
        })
      }

      await pushMessage({
        id: createMessageId(),
        role: 'assistant',
        content: normalized.message,
        meta: applyMeta,
      })
    } catch (error) {
      const errorMessage = getAiErrorMessage(error, {
        locale: options.value.locale,
      })

      if (typeof requestContext.onError === 'function') {
        await requestContext.onError({
          error,
          errorMessage,
          requestContext,
          userPrompt,
        })
      }

      await pushMessage({
        id: createMessageId(),
        role: 'assistant',
        status: 'error',
        content: errorMessage,
      })
    } finally {
      isSubmitting.value = false
    }
  }

  const handlePromptKeydown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitPrompt()
    }
  }

  return {
    submitPrompt,
    handlePromptKeydown,
  }
}

export const useAiEditorSnapshot = ({ editor }) => {
  const documentHtml = ref('')
  const documentText = ref('')
  const documentJson = ref(null)
  const selectionText = ref('')
  const selectionRange = ref({
    from: 0,
    to: 0,
    empty: true,
  })
  const hasSelection = computed(() => !!selectionText.value.trim())

  const syncEditorSnapshot = () => {
    if (!editor.value) {
      return
    }
    documentHtml.value = editor.value.getHTML()
    documentText.value = editor.value.getText()
    documentJson.value = editor.value.getJSON()
    selectionText.value = getSelectionText(editor.value)
    const { from, to, empty } = editor.value.state.selection
    selectionRange.value = { from, to, empty }
  }

  let removeEditorListeners = () => {}
  watch(
    () => editor.value,
    (instance) => {
      removeEditorListeners()
      if (!instance) {
        return
      }

      const onEditorChange = () => {
        syncEditorSnapshot()
      }

      instance.on('selectionUpdate', onEditorChange)
      instance.on('update', onEditorChange)
      instance.on('focus', onEditorChange)
      syncEditorSnapshot()

      removeEditorListeners = () => {
        instance.off('selectionUpdate', onEditorChange)
        instance.off('update', onEditorChange)
        instance.off('focus', onEditorChange)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    removeEditorListeners()
  })

  const getDocumentSnapshot = () => {
    return {
      html: documentHtml.value,
      text: documentText.value,
      json: documentJson.value,
    }
  }

  const getSelectionSnapshot = () => {
    return {
      ...selectionRange.value,
      text: selectionText.value,
    }
  }

  return {
    documentHtml,
    documentText,
    documentJson,
    selectionText,
    selectionRange,
    hasSelection,
    syncEditorSnapshot,
    getDocumentSnapshot,
    getSelectionSnapshot,
  }
}
