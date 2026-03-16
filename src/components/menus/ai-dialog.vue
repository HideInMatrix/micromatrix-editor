<template>
  <modal
    :visible="visible"
    width="720px"
    destroy-on-close
    class="umo-block-ai-dialog"
    @close="emit('close')"
  >
    <template #header>
      <icon name="ai" />
      {{ t('blockMenu.aiDialog.title') }}
    </template>

    <div class="umo-block-ai-dialog-body">
      <div class="umo-block-ai-dialog-context">
        <div class="umo-block-ai-dialog-context-label">
          {{ t('blockMenu.aiDialog.context') }}
        </div>
        <div class="umo-block-ai-dialog-context-text">
          {{ contextText }}
        </div>
      </div>

      <div
        ref="messageListRef"
        class="umo-block-ai-dialog-messages umo-scrollbar"
      >
        <div
          v-for="item in messages"
          :key="item.id"
          class="umo-block-ai-dialog-message"
          :class="[
            `is-${item.role}`,
            { 'is-error': item.status === 'error' },
          ]"
        >
          <div class="umo-block-ai-dialog-message-role">
            {{ item.role === 'assistant' ? assistantName : userName }}
          </div>
          <div class="umo-block-ai-dialog-message-body">
            {{ item.content }}
          </div>
          <div v-if="item.meta" class="umo-block-ai-dialog-message-meta">
            {{ item.meta }}
          </div>
        </div>

        <div
          v-if="isSubmitting"
          class="umo-block-ai-dialog-message is-assistant"
        >
          <div class="umo-block-ai-dialog-message-role">
            {{ assistantName }}
          </div>
          <div class="umo-block-ai-dialog-message-body">
            {{ t('blockMenu.aiDialog.thinking') }}
          </div>
        </div>
      </div>

      <t-textarea
        v-model="prompt"
        class="umo-block-ai-dialog-input"
        :autosize="{ minRows: 4, maxRows: 8 }"
        :maxlength="1000"
        :disabled="isReadonly || isSubmitting"
        :placeholder="inputPlaceholder"
        @keydown="handlePromptKeydown"
      />
    </div>

    <template #footer>
      <div class="umo-block-ai-dialog-footer">
        <t-button theme="default" variant="base" @click="emit('close')">
          {{ t('dialog.cancel') }}
        </t-button>
        <t-button
          theme="primary"
          :loading="isSubmitting"
          :disabled="!canSubmit"
          @click="submitPrompt"
        >
          {{ t('blockMenu.aiDialog.send') }}
        </t-button>
      </div>
    </template>
  </modal>
</template>

<script setup>
import { getSelectionText } from '@/utils/selection'
import {
  useAiRequest,
  useAiSession,
} from '@/composables/ai'
import { shortId } from '@/utils/short-id'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  targetType: {
    type: String,
    default: 'selection',
  },
  node: {
    type: Object,
    default: null,
  },
  pos: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['close'])

const editor = inject('editor')
const options = inject('options')
const page = inject('page')
const saveContent = inject('saveContent', null)

let aiNodeId = $ref('')
let contextState = $ref({
  text: '',
  selection: {
    from: 0,
    to: 0,
    empty: true,
    text: '',
  },
  block: null,
  insertPos: 0,
})

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
  resetMessages,
  createMessageId,
  pushMessage,
  scrollMessagesToBottom,
} = useAiSession({
  options,
  editor,
  getInputPlaceholder: () => t('blockMenu.aiDialog.placeholder'),
  getWelcomeContent: ({ locale: currentLocale }) => {
    if (props.targetType === 'selection') {
      return currentLocale === 'zh-CN'
        ? '告诉我你希望如何修改当前选区内容，我会直接把结果应用到文档中。'
        : 'Tell me how you want to revise the current selection, and I will apply the result directly to the document.'
    }
    return currentLocale === 'zh-CN'
      ? '告诉我你希望如何修改当前块内容，我会把结果直接应用到文档中。'
      : 'Tell me how you want to revise the current block, and I will apply the result directly to the document.'
  },
})

const canSubmit = computed(() => {
  if (
    !prompt.value.trim() ||
    !editor.value ||
    isReadonly.value ||
    isSubmitting.value
  ) {
    return false
  }
  if (props.targetType === 'selection') {
    return !contextState.selection.empty && !!contextState.selection.text.trim()
  }
  return true
})

const contextText = computed(() => {
  if (contextState.text) {
    return contextState.text
  }
  if (props.targetType === 'selection') {
    return locale.value === 'zh-CN'
      ? '当前没有可用选区。'
      : 'There is no active text selection.'
  }
  const blockType = contextState.block?.type || props.node?.type?.name || 'paragraph'
  return locale.value === 'zh-CN'
    ? `当前块类型：${blockType}`
    : `Current block type: ${blockType}`
})

const resetDialog = () => {
  prompt.value = ''
  isSubmitting.value = false
  aiNodeId = ''
  resetMessages()
}

const getInsertPosFromResolved = ($pos) => {
  if (!$pos) {
    return 0
  }
  if ($pos.depth > 0) {
    try {
      return $pos.after($pos.depth)
    } catch {}
  }
  return $pos.pos
}

const captureSelectionContext = () => {
  if (!editor.value) {
    return
  }
  const { selection } = editor.value.state
  const text = getSelectionText(editor.value).trim()
  const parent = selection.$from?.parent || null
  const parentPos =
    selection.$from && selection.$from.depth > 0
      ? selection.$from.before(selection.$from.depth)
      : selection.from

  contextState = {
    text,
    selection: {
      from: selection.from,
      to: selection.to,
      empty: selection.empty,
      text,
    },
    block: {
      type: parent?.type?.name || 'paragraph',
      text: parent?.textContent || '',
      pos: parentPos,
      json: null,
    },
    insertPos: getInsertPosFromResolved(selection.$to),
  }
}

const captureBlockContext = () => {
  const text = (props.node?.textContent || '').trim()
  const basePos = Number.isFinite(props.pos)
    ? props.pos
    : editor.value?.state.selection.from || 0
  const nodeSize = props.node?.nodeSize || 0
  contextState = {
    text,
    selection: {
      from: basePos,
      to: basePos + nodeSize,
      empty: !text,
      text,
    },
    block: {
      type: props.node?.type?.name || 'paragraph',
      text,
      pos: props.pos,
      json: props.node?.toJSON?.() || null,
    },
    insertPos: basePos + nodeSize,
  }
}

const captureContext = () => {
  if (props.targetType === 'selection') {
    captureSelectionContext()
    return
  }
  captureBlockContext()
}

const buildPayload = (userPrompt) => {
  return {
    prompt: userPrompt,
    scope: 'selection',
    messages: messages.value.map(({ role, content }) => ({ role, content })),
    document: {
      html: editor.value?.getHTML?.() || '',
      text: editor.value?.getText?.() || '',
      json: editor.value?.getJSON?.() || null,
    },
    selection: contextState.selection,
    block: contextState.block,
    page: page.value,
    editor: {
      isEmpty: editor.value?.isEmpty,
      isEditable: editor.value?.isEditable,
    },
  }
}

const ensureAiNode = (userPrompt) => {
  if (!editor.value) {
    return null
  }
  const id = aiNodeId || shortId(10)
  const attrs = {
    vnode: true,
    id,
    title: t('node.ai.title'),
    prompt: userPrompt,
    response: '',
    summary: t('node.ai.thinking'),
    status: 'thinking',
    error: '',
    actions: [],
    createdAt: new Date().toISOString(),
  }

  if (aiNodeId) {
    const updated = editor.value.commands.updateAiById(aiNodeId, attrs)
    if (updated) {
      return aiNodeId
    }
  }

  const inserted = editor.value.commands.setAi(
    attrs,
    Math.max(contextState.insertPos || 0, 0),
  )
  if (!inserted) {
    return null
  }
  aiNodeId = id
  return id
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
  buildRequestContext: async ({ userPrompt }) => {
    const currentAiNodeId = ensureAiNode(userPrompt)
    return {
      payload: buildPayload(userPrompt),
      fallbackScope: 'selection',
      selectionRange: contextState.selection,
      onSuccess: async ({ applyMeta, normalized }) => {
        if (!currentAiNodeId) {
          return
        }
        editor.value.commands.updateAiById(currentAiNodeId, {
          title: t('node.ai.title'),
          prompt: userPrompt,
          response: normalized.message,
          summary: applyMeta,
          status: 'done',
          error: '',
          actions: normalized.actions || [],
        })
      },
      onError: async ({ errorMessage }) => {
        if (!currentAiNodeId) {
          return
        }
        editor.value.commands.updateAiById(currentAiNodeId, {
          title: t('node.ai.title'),
          prompt: userPrompt,
          response: '',
          summary: '',
          status: 'error',
          error: errorMessage,
          actions: [],
        })
      },
    }
  },
})

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    resetDialog()
    captureContext()
    await scrollMessagesToBottom()
  },
)
</script>

<style lang="less">
.umo-block-ai-dialog {
  .t-dialog {
    &__body {
      padding-top: 8px;
    }
  }
}

.umo-block-ai-dialog-body {
  display: grid;
  gap: 14px;
}

.umo-block-ai-dialog-context {
  padding: 12px 14px;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.04), rgba(37, 99, 235, 0)),
    rgba(0, 0, 0, 0.02);
}

.umo-block-ai-dialog-context-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--umo-text-color-light);
  margin-bottom: 6px;
}

.umo-block-ai-dialog-context-text {
  max-height: 120px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.7;
  color: var(--umo-text-color);
  white-space: pre-wrap;
  word-break: break-word;
}

.umo-block-ai-dialog-messages {
  max-height: 320px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.umo-block-ai-dialog-message {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.is-user {
    align-items: flex-end;
  }

  &.is-error .umo-block-ai-dialog-message-body {
    color: var(--umo-error-color);
    border-color: rgba(214, 48, 49, 0.14);
    background-color: rgba(214, 48, 49, 0.06);
  }
}

.umo-block-ai-dialog-message-role {
  font-size: 12px;
  color: var(--umo-text-color-light);
}

.umo-block-ai-dialog-message-body {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  border: solid 1px rgba(0, 0, 0, 0.06);
  background-color: rgba(0, 0, 0, 0.02);
  font-size: 13px;
  line-height: 1.7;
  color: var(--umo-text-color);
  white-space: pre-wrap;
  word-break: break-word;
}

.umo-block-ai-dialog-message-meta {
  font-size: 12px;
  color: var(--umo-text-color-light);
}

.umo-block-ai-dialog-input {
  :deep(textarea) {
    line-height: 1.7;
  }
}

.umo-block-ai-dialog-footer {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
