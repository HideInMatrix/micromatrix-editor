import prettyBytes from 'pretty-bytes'

const NODE_INSERT_TYPES = new Set([
  'insert_echarts',
  'insert_math',
  'insert_mermaid',
  'insert_diagrams',
  'insert_citation_with_footnote',
  'insert_footnote',
])

export { NODE_INSERT_TYPES }

const resolveLocaleText = (isZhLocale, zhText, enText) => {
  return isZhLocale ? zhText : enText
}

const AI_CHAT_TEXT = {
  assistantTitle: {
    zh: 'AI 助手',
    en: 'AI Assistant',
  },
  panelSubtitleReady: {
    zh: '建议已生成，确认后再写入文档。',
    en: 'Suggestions are ready. Confirm before writing to the document.',
  },
  panelSubtitleReadonly: {
    zh: '当前为只读模式，仅可查看对话。',
    en: 'Read-only mode is enabled, so the chat is view-only.',
  },
  panelSubtitleSelection: {
    zh: '可以基于当前选区或全文修改文档',
    en: 'Revise the current selection or the full document',
  },
  panelSubtitleDocument: {
    zh: '当前未选中文本，默认会修改全文',
    en: 'No text selected, so revisions default to the full document',
  },
  loadingStream: {
    zh: 'AI 正在流式生成修改建议...',
    en: 'AI is streaming draft changes...',
  },
  loadingDefault: {
    zh: 'AI 正在生成修改建议...',
    en: 'AI is drafting changes...',
  },
  sendButton: {
    zh: '发送对话',
    en: 'Send prompt',
  },
  resetButton: {
    zh: '清空对话',
    en: 'Clear chat',
  },
  uploadButton: {
    zh: '上传文件',
    en: 'Upload files',
  },
  insertButton: {
    zh: '插入建议',
    en: 'Insert suggestion',
  },
  replaceButton: {
    zh: '替换内容',
    en: 'Replace content',
  },
  discardButton: {
    zh: '丢弃建议',
    en: 'Discard suggestion',
  },
  closeButton: {
    zh: '关闭 AI 面板',
    en: 'Close AI panel',
  },
  removeAttachment: {
    zh: '移除附件',
    en: 'Remove attachment',
  },
  pendingTitle: {
    zh: '待确认建议',
    en: 'Pending suggestion',
  },
  composerTipReady: {
    zh: '建议已准备好，选择插入、替换或丢弃。',
    en: 'The suggestion is ready. Choose insert, replace, or discard.',
  },
  composerTipInsertOnly: {
    zh: '当前建议更适合插入，无法直接执行替换。',
    en: 'This suggestion is better suited for insertion and cannot directly replace the document.',
  },
  configTip: {
    zh: '默认会请求 ai.apiUrl 对应的 AI 服务生成结构化建议；生成后由你手动决定插入、替换或丢弃，也可以通过 ai.onChat 完全自定义流程。',
    en: 'The editor will request the AI service at ai.apiUrl to generate structured suggestions. After the response, you decide whether to insert, replace, or discard, and you can still fully customize the flow with ai.onChat.',
  },
  scopeAuto: {
    zh: '自动',
    en: 'Auto',
  },
  scopeSelection: {
    zh: '选区',
    en: 'Selection',
  },
  scopeDocument: {
    zh: '全文',
    en: 'Document',
  },
  scopeDocumentContext: {
    zh: '全文上下文',
    en: 'Document context',
  },
  scopeCurrentSelection: {
    zh: '当前选区',
    en: 'Current selection',
  },
  scopeNoticeDefault: {
    zh: '当前没有选区，AI 将默认基于全文进行修改。',
    en: 'There is no active selection, so AI will revise the full document by default.',
  },
  pendingAttachment: {
    zh: '待上传附件',
    en: 'Pending attachment',
  },
}

export const getAiChatText = (key, isZhLocale = true) => {
  const text = AI_CHAT_TEXT[key]
  if (!text) {
    return ''
  }
  return resolveLocaleText(isZhLocale, text.zh, text.en)
}

export const getAiChatPanelSubtitleText = ({
  isZhLocale = true,
  showDecisionActions = false,
  isReadonly = false,
  hasSelection = false,
} = {}) => {
  if (showDecisionActions) {
    return getAiChatText('panelSubtitleReady', isZhLocale)
  }
  if (isReadonly) {
    return getAiChatText('panelSubtitleReadonly', isZhLocale)
  }
  if (hasSelection) {
    return getAiChatText('panelSubtitleSelection', isZhLocale)
  }
  return getAiChatText('panelSubtitleDocument', isZhLocale)
}

export const getAiChatLoadingMessageText = ({
  isZhLocale = true,
  outputMode = '',
} = {}) => {
  return getAiChatText(
    outputMode === 'stream' ? 'loadingStream' : 'loadingDefault',
    isZhLocale,
  )
}

export const getAiChatComposerTipText = ({
  isZhLocale = true,
  showDecisionActions = false,
  canApplyReplace = false,
} = {}) => {
  if (!showDecisionActions) {
    return ''
  }
  return getAiChatText(
    canApplyReplace ? 'composerTipReady' : 'composerTipInsertOnly',
    isZhLocale,
  )
}

export const getAiChatScopeOptions = (isZhLocale = true) => {
  return [
    { label: getAiChatText('scopeAuto', isZhLocale), value: 'auto' },
    { label: getAiChatText('scopeSelection', isZhLocale), value: 'selection' },
    { label: getAiChatText('scopeDocument', isZhLocale), value: 'document' },
  ]
}

export const getAiChatPendingCountText = (count = 0, isZhLocale = true) => {
  return resolveLocaleText(isZhLocale, `${count} 项`, `${count} items`)
}

export const getAiChatScopeNoticeText = ({
  isZhLocale = true,
  hasSelection = false,
  currentScope = 'auto',
  selectionText = '',
} = {}) => {
  if (hasSelection) {
    const labelKey =
      currentScope === 'document'
        ? 'scopeDocumentContext'
        : 'scopeCurrentSelection'
    return `${getAiChatText(labelKey, isZhLocale)}: ${truncateText(selectionText)}`
  }
  return getAiChatText('scopeNoticeDefault', isZhLocale)
}

export const getAiChatStatsText = ({
  isZhLocale = true,
  totalChars = 0,
  selectionChars = 0,
} = {}) => {
  return resolveLocaleText(
    isZhLocale,
    `选区 ${selectionChars} 字 / 全文 ${totalChars} 字`,
    `Selection ${selectionChars} chars / Document ${totalChars} chars`,
  )
}

export const formatAiChatAttachmentMeta = (item, isZhLocale = true) => {
  const parts = []
  if (item.type) {
    parts.push(item.type)
  }
  if (Number.isFinite(item.size) && item.size > 0) {
    parts.push(prettyBytes(item.size))
  }
  if (!parts.length) {
    return getAiChatText('pendingAttachment', isZhLocale)
  }
  return parts.join(' / ')
}

export const htmlToText = (value = '') => {
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

export const toPreviewText = (value = '', limit = 220) => {
  const normalized = `${value}`.replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) {
    return normalized
  }
  return `${normalized.slice(0, limit)}...`
}

export const truncateText = (value = '', maxLength = 120) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength)}...`
}

const getPatchPreview = (action) => {
  const content =
    action?.content ?? action?.html ?? action?.text ?? action?.json ?? ''
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

const getActionMeta = (action, isZhLocale) => {
  if (action?.type === 'insert_echarts') {
    return {
      icon: 'echarts',
      label: resolveLocaleText(isZhLocale, '图表', 'Chart'),
    }
  }
  if (action?.type === 'patch') {
    return {
      icon: 'ai',
      label: resolveLocaleText(isZhLocale, '改写', 'Rewrite'),
    }
  }
  if (action?.type === 'insert_math') {
    return {
      icon: 'math',
      label: resolveLocaleText(isZhLocale, '公式', 'Math'),
    }
  }
  if (action?.type === 'insert_mermaid') {
    return {
      icon: 'mermaid',
      label: 'Mermaid',
    }
  }
  if (action?.type === 'insert_diagrams') {
    return {
      icon: 'diagrams',
      label: resolveLocaleText(isZhLocale, '流程图', 'Flowchart'),
    }
  }
  if (action?.type === 'insert_footnote') {
    return {
      icon: 'footnote',
      label: resolveLocaleText(isZhLocale, '脚注', 'Footnote'),
    }
  }
  if (action?.type === 'insert_citation_with_footnote') {
    return {
      icon: 'footnote',
      label: resolveLocaleText(isZhLocale, '引用与脚注', 'Citation + Footnote'),
    }
  }
  return {
    icon: 'file',
    label: resolveLocaleText(isZhLocale, '建议', 'Suggestion'),
  }
}

export const getActionPreviewText = (action, isZhLocale) => {
  if (!action || typeof action !== 'object') {
    return ''
  }
  if (action.type === 'patch') {
    return getPatchPreview(action)
  }
  if (action.type === 'insert_math') {
    const { math } = action
    const latex =
      typeof math === 'string'
        ? math
        : math?.latex || math?.content || math?.formula || ''
    return toPreviewText(latex, 180)
  }
  if (action.type === 'insert_mermaid') {
    const mermaid =
      typeof action.mermaid === 'string'
        ? action.mermaid
        : action.mermaid?.content || action.mermaid?.code || ''
    return toPreviewText(mermaid, 180)
  }
  if (action.type === 'insert_diagrams') {
    return resolveLocaleText(
      isZhLocale,
      '已准备好流程图节点。',
      'The flowchart node is ready.',
    )
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
    return (
      title ||
      resolveLocaleText(
        isZhLocale,
        '已生成图表节点。',
        'The chart node is ready.',
      )
    )
  }
  if (action.type === 'insert_footnote') {
    const footnote = action.footnote || {}
    const rawContent =
      typeof footnote === 'string'
        ? footnote
        : footnote.caption ||
          footnote.text ||
          footnote.content ||
          footnote.note ||
          ''
    return toPreviewText(
      typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
      180,
    )
  }
  if (action.type === 'insert_citation_with_footnote') {
    const citation = action.citation || {}
    const citationRaw =
      typeof citation === 'string'
        ? citation
        : citation.content ||
          citation.text ||
          citation.html ||
          citation.quote ||
          ''
    const footnote = action.footnote || {}
    const footnoteRaw =
      typeof footnote === 'string'
        ? footnote
        : footnote.caption ||
          footnote.text ||
          footnote.content ||
          footnote.note ||
          ''
    const citationText =
      typeof citationRaw === 'string'
        ? citationRaw
        : JSON.stringify(citationRaw ?? {})
    const footnoteText =
      typeof footnoteRaw === 'string'
        ? footnoteRaw
        : JSON.stringify(footnoteRaw ?? {})
    return resolveLocaleText(
      isZhLocale,
      `正文：${toPreviewText(citationText, 100)}\n脚注：${toPreviewText(footnoteText, 100)}`,
      `Citation: ${toPreviewText(citationText, 100)}\nFootnote: ${toPreviewText(footnoteText, 100)}`,
    )
  }
  return toPreviewText(JSON.stringify(action ?? {}))
}

export const getPendingPreviewItems = (actions = [], isZhLocale = true) => {
  return actions
    .map((action, index) => {
      if (!action || typeof action !== 'object') {
        return null
      }
      const meta = getActionMeta(action, isZhLocale)
      const text = getActionPreviewText(action, isZhLocale)
      if (!text) {
        return null
      }
      return {
        key: `${action?.type || 'action'}-${index}`,
        icon: meta.icon,
        label: meta.label,
        text,
      }
    })
    .filter(Boolean)
}

export const normalizeScope = (scope) => {
  if (['auto', 'selection', 'document'].includes(scope)) {
    return scope
  }
  return 'auto'
}

export const buildAiChatPayload = ({
  userPrompt,
  scope,
  messages,
  selectionSnapshot,
  documentSnapshot,
  attachments,
  page,
  editor,
  container,
}) => {
  return {
    prompt: userPrompt,
    scope,
    messages: messages.map(({ role, content }) => ({ role, content })),
    document: documentSnapshot,
    selection: {
      text: selectionSnapshot.text,
      from: selectionSnapshot.from,
      to: selectionSnapshot.to,
      empty: selectionSnapshot.empty,
    },
    attachments,
    page,
    editor: {
      isEmpty: editor?.isEmpty,
      isEditable: editor?.isEditable,
    },
    container,
  }
}

export const buildPendingMeta = (actionCount = 0, isZhLocale = true) => {
  if (!actionCount) {
    return ''
  }
  return resolveLocaleText(
    isZhLocale,
    `已生成 ${actionCount} 项建议，等待你确认。`,
    `${actionCount} suggestions are ready for confirmation.`,
  )
}

export const getDecisionActions = ({ pending, decision }) => {
  if (!pending?.actions?.length) {
    return []
  }

  const target = pending.scope === 'selection' ? 'selection' : 'document'
  const activeSelection = pending.selectionAnchor || pending.selectionRange
  const canReplaceSelection = target === 'selection' && !activeSelection?.empty

  return pending.actions.map((action, index) => {
    if (!action || typeof action !== 'object') {
      return action
    }

    if (action.type === 'patch') {
      return {
        ...action,
        target,
        mode:
          decision === 'replace'
            ? index === 0
              ? 'replace'
              : 'append'
            : 'append',
      }
    }

    if (NODE_INSERT_TYPES.has(action.type)) {
      return {
        ...action,
        target,
        position:
          decision === 'replace' && canReplaceSelection
            ? index === 0
              ? 'replace'
              : 'after'
            : 'after',
      }
    }

    return action
  })
}

export const resolveSelectionContext = ({
  selectionSnapshot,
  selectionAnchor,
}) => {
  if (!selectionAnchor) {
    return {
      selectionSnapshot,
      selectionAnchor: null,
    }
  }

  return {
    selectionSnapshot: {
      ...selectionSnapshot,
      from: selectionAnchor.from,
      to: selectionAnchor.to,
      empty: selectionAnchor.empty ?? selectionSnapshot.empty,
      isNodeSelection:
        selectionAnchor.isNodeSelection ?? selectionSnapshot.isNodeSelection,
    },
    selectionAnchor,
  }
}
