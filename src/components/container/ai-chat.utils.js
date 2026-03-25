const NODE_INSERT_TYPES = new Set([
  'insert_echarts',
  'insert_math',
  'insert_mermaid',
  'insert_diagrams',
  'insert_citation_with_footnote',
  'insert_footnote',
])

export { NODE_INSERT_TYPES }

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
      label: isZhLocale ? '图表' : 'Chart',
    }
  }
  if (action?.type === 'patch') {
    return {
      icon: 'ai',
      label: isZhLocale ? '改写' : 'Rewrite',
    }
  }
  if (action?.type === 'insert_math') {
    return {
      icon: 'math',
      label: isZhLocale ? '公式' : 'Math',
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
      label: isZhLocale ? '流程图' : 'Flowchart',
    }
  }
  if (action?.type === 'insert_footnote') {
    return {
      icon: 'footnote',
      label: isZhLocale ? '脚注' : 'Footnote',
    }
  }
  if (action?.type === 'insert_citation_with_footnote') {
    return {
      icon: 'footnote',
      label: isZhLocale ? '引用与脚注' : 'Citation + Footnote',
    }
  }
  return {
    icon: 'file',
    label: isZhLocale ? '建议' : 'Suggestion',
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
    return isZhLocale ? '已准备好流程图节点。' : 'The flowchart node is ready.'
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
    return isZhLocale
      ? title || '已生成图表节点。'
      : title || 'The chart node is ready.'
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
    return isZhLocale
      ? `正文：${toPreviewText(citationText, 100)}\n脚注：${toPreviewText(footnoteText, 100)}`
      : `Citation: ${toPreviewText(citationText, 100)}\nFootnote: ${toPreviewText(footnoteText, 100)}`
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
  return isZhLocale
    ? `已生成 ${actionCount} 项建议，等待你确认。`
    : `${actionCount} suggestions are ready for confirmation.`
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
