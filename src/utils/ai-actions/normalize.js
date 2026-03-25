import {
  CHART_ACTION_TYPES,
  CITATION_FOOTNOTE_ACTION_TYPES,
  DIAGRAM_ACTION_TYPES,
  FLOWCHART_ACTION_TYPES,
  FOOTNOTE_ACTION_TYPES,
  MATH_ACTION_TYPES,
  MERMAID_ACTION_TYPES,
  getActionType,
  getLocale,
  getPatchContent,
  getPlainTextFromHtml,
  inferPatchFormat,
  looksLikeDataUrl,
  looksLikeMermaidSource,
  looksLikePlainMathExpression,
  looksLikeSvgMarkup,
  unwrapMathDelimiters,
} from './shared'

const extractStandaloneMath = (content, format = 'text') => {
  if (content === undefined || content === null || content === '') {
    return null
  }

  const rawValue = `${content}`.trim()
  if (!rawValue) {
    return null
  }

  const candidate =
    format === 'html' || rawValue.startsWith('<')
      ? getPlainTextFromHtml(rawValue)
      : rawValue
  const normalized = candidate.trim()
  if (!normalized) {
    return null
  }

  const wrappedMath = unwrapMathDelimiters(normalized)
  if (wrappedMath) {
    return wrappedMath
  }

  if (looksLikePlainMathExpression(normalized)) {
    return {
      latex: normalized,
      displayMode: true,
    }
  }

  return null
}

const normalizeActionTarget = (target, fallbackScope = 'document') => {
  const normalized = `${target || fallbackScope}`.trim().toLowerCase()
  const map = {
    document: 'document',
    doc: 'document',
    page: 'document',
    full: 'document',
    full_document: 'document',
    selection: 'selection',
    selected: 'selection',
    selected_text: 'selection',
    range: 'selection',
    cursor: 'selection',
    caret: 'selection',
    block: 'selection',
    current: 'selection',
    current_block: 'selection',
    currentblock: 'selection',
  }
  return map[normalized] || fallbackScope
}

const inferActionTypeFromPayload = (action) => {
  if (!action || typeof action !== 'object') {
    return ''
  }
  const stringCandidate =
    typeof action.content === 'string'
      ? action.content
      : typeof action.code === 'string'
        ? action.code
        : typeof action.source === 'string'
          ? action.source
          : ''

  if (
    action.chart ||
    action.echarts ||
    action.chartNode ||
    action.chartOptions ||
    action.options ||
    action.option
  ) {
    return 'insert_echarts'
  }
  if (
    action.math !== undefined ||
    action.formula !== undefined ||
    action.equation !== undefined ||
    action.latex !== undefined
  ) {
    return 'insert_math'
  }
  if (
    action.mermaid !== undefined ||
    action.mermaidCode !== undefined ||
    action.diagramType === 'mermaid' ||
    action.language === 'mermaid'
  ) {
    return 'insert_mermaid'
  }
  if (
    action.flowchart !== undefined ||
    action.diagram !== undefined ||
    action.diagrams !== undefined
  ) {
    const flowchartValue =
      typeof action.flowchart === 'string' ? action.flowchart : stringCandidate
    if (
      action.diagramType === 'mermaid' ||
      action.language === 'mermaid' ||
      looksLikeMermaidSource(flowchartValue)
    ) {
      return 'insert_mermaid'
    }
    return 'insert_diagrams'
  }
  if (
    stringCandidate &&
    !looksLikeDataUrl(stringCandidate) &&
    !looksLikeSvgMarkup(stringCandidate) &&
    looksLikeMermaidSource(stringCandidate)
  ) {
    return 'insert_mermaid'
  }
  if (action.src || action.image || action.svg || action.svgData) {
    return 'insert_diagrams'
  }
  if (
    (action.citation !== undefined ||
      action.bodyCitation !== undefined ||
      action.sourceCitation !== undefined ||
      action.quote !== undefined) &&
    (action.footnote !== undefined ||
      action.footnoteNode !== undefined ||
      action.footnoteText !== undefined ||
      action.source !== undefined ||
      action.reference !== undefined)
  ) {
    return 'insert_citation_with_footnote'
  }
  if (
    action.footnote !== undefined ||
    action.footnoteNode !== undefined ||
    action.footnoteText !== undefined ||
    action.referenceType === 'footnote'
  ) {
    return 'insert_footnote'
  }
  return ''
}

const normalizePatchAction = (patch, fallbackScope) => {
  if (!patch || typeof patch !== 'object') {
    return null
  }
  const format = inferPatchFormat(patch)
  const target = normalizeActionTarget(patch.target, fallbackScope)
  const mode = patch.mode || 'replace'
  const standaloneMath =
    target === 'selection' && mode === 'replace'
      ? extractStandaloneMath(getPatchContent(patch, format), format)
      : null

  if (standaloneMath) {
    return {
      type: 'insert_math',
      target,
      position: 'replace',
      math: standaloneMath,
    }
  }

  return {
    type: 'patch',
    target,
    mode,
    format,
    content: getPatchContent(patch, format),
  }
}

const normalizeChartAction = (action, fallbackScope) => {
  return {
    type: 'insert_echarts',
    target: normalizeActionTarget(action.target, fallbackScope),
    position: action.position || 'after',
    chart:
      action.chart ||
      action.echarts ||
      action.chartNode ||
      action.content ||
      null,
  }
}

const normalizeMathAction = (action, fallbackScope) => {
  const hasStructuredMath =
    action.math !== undefined ||
    action.formula !== undefined ||
    action.equation !== undefined
  return {
    type: 'insert_math',
    target: normalizeActionTarget(action.target, fallbackScope),
    position: action.position || 'after',
    math: hasStructuredMath
      ? (action.math ?? action.formula ?? action.equation)
      : {
          latex: action.latex ?? action.content ?? action.code ?? '',
          displayMode: action.displayMode,
          mode: action.mode,
          block: action.block,
          inline: action.inline,
        },
  }
}

const normalizeMermaidAction = (action, fallbackScope) => {
  const hasStructuredMermaid =
    action.mermaid !== undefined || action.mermaidNode !== undefined
  return {
    type: 'insert_mermaid',
    target: normalizeActionTarget(action.target, fallbackScope),
    position: action.position || 'after',
    mermaid: hasStructuredMermaid
      ? (action.mermaid ?? action.mermaidNode)
      : {
          content:
            action.content ??
            action.code ??
            action.source ??
            action.mermaidCode ??
            '',
          config: action.config,
          theme: action.theme,
          src: action.src ?? action.svg ?? action.svgData ?? action.image,
          width: action.width,
          height: action.height,
        },
  }
}

const normalizeDiagramsAction = (action, fallbackScope) => {
  const hasStructuredDiagram =
    action.diagram !== undefined ||
    action.diagrams !== undefined ||
    action.flowchart !== undefined
  return {
    type: 'insert_diagrams',
    target: normalizeActionTarget(action.target, fallbackScope),
    position: action.position || 'after',
    diagram: hasStructuredDiagram
      ? (action.diagram ?? action.diagrams ?? action.flowchart)
      : {
          src: action.src ?? action.image ?? action.svg ?? action.svgData,
          content:
            action.content ??
            action.data ??
            action.source ??
            action.xml ??
            action.src,
          width: action.width,
          height: action.height,
        },
  }
}

const normalizeFootnoteAction = (action, fallbackScope) => {
  const hasStructuredFootnote =
    action.footnote !== undefined || action.footnoteNode !== undefined
  return {
    type: 'insert_footnote',
    target: normalizeActionTarget(action.target, fallbackScope),
    position: action.position || 'after',
    footnote: hasStructuredFootnote
      ? (action.footnote ?? action.footnoteNode)
      : {
          content:
            action.content ??
            action.html ??
            action.text ??
            action.json ??
            action.note ??
            action.footnoteText ??
            '',
          format: action.format,
          caption: action.caption,
        },
  }
}

const normalizeCitationWithFootnoteAction = (action, fallbackScope) => {
  const hasStructuredCitation =
    action.citation !== undefined ||
    action.bodyCitation !== undefined ||
    action.sourceCitation !== undefined
  const hasStructuredFootnote =
    action.footnote !== undefined ||
    action.footnoteNode !== undefined ||
    action.reference !== undefined ||
    action.source !== undefined

  return {
    type: 'insert_citation_with_footnote',
    target: normalizeActionTarget(action.target, fallbackScope),
    position: action.position || 'after',
    citation: hasStructuredCitation
      ? (action.citation ?? action.bodyCitation ?? action.sourceCitation)
      : {
          content:
            action.content ??
            action.html ??
            action.text ??
            action.json ??
            action.quote ??
            '',
          format: action.format,
        },
    footnote: hasStructuredFootnote
      ? (action.footnote ??
        action.footnoteNode ??
        action.reference ??
        action.source)
      : {
          content: action.note ?? action.footnoteText ?? action.caption ?? '',
          format: action.footnoteFormat,
          caption: action.caption,
        },
  }
}

const normalizeFlowchartAction = (action, fallbackScope) => {
  const flowchartPayload =
    action.flowchart ??
    action.diagram ??
    action.diagrams ??
    action.content ??
    action.code ??
    ''
  const flowchartText =
    typeof flowchartPayload === 'string'
      ? flowchartPayload
      : flowchartPayload?.content ||
        flowchartPayload?.code ||
        flowchartPayload?.source ||
        ''

  if (
    action.diagramType === 'mermaid' ||
    action.language === 'mermaid' ||
    looksLikeMermaidSource(flowchartText)
  ) {
    return normalizeMermaidAction(
      {
        ...action,
        mermaid: action.mermaid ?? flowchartPayload,
      },
      fallbackScope,
    )
  }

  return normalizeDiagramsAction(
    {
      ...action,
      diagram: action.diagram ?? action.diagrams ?? action.flowchart,
    },
    fallbackScope,
  )
}

const normalizeTextAction = (action, fallbackScope) => {
  const type = getActionType(action) || 'patch'
  const targetMap = {
    replace_document: 'document',
    replace_document_html: 'document',
    append_document: 'document',
    prepend_document: 'document',
    replace_selection: 'selection',
    replace_selection_html: 'selection',
    append_selection: 'selection',
    prepend_selection: 'selection',
  }
  const modeMap = {
    replace_document: 'replace',
    replace_document_html: 'replace',
    append_document: 'append',
    prepend_document: 'prepend',
    replace_selection: 'replace',
    replace_selection_html: 'replace',
    append_selection: 'append',
    prepend_selection: 'prepend',
  }
  const format =
    action.format ||
    (typeof action.content === 'string' && action.content.trim().startsWith('<')
      ? 'html'
      : 'text')
  const target = normalizeActionTarget(
    action.target || targetMap[type],
    fallbackScope,
  )
  const mode = action.mode || modeMap[type] || 'replace'
  const standaloneMath =
    target === 'selection' && mode === 'replace'
      ? extractStandaloneMath(action.content, format)
      : null

  if (standaloneMath) {
    return {
      type: 'insert_math',
      target,
      position: 'replace',
      math: standaloneMath,
    }
  }

  return {
    type: 'patch',
    target,
    mode,
    format,
    content: action.content,
  }
}

const normalizeStructuredAction = (action, fallbackScope) => {
  if (!action || typeof action !== 'object') {
    return null
  }
  const type = getActionType(action) || inferActionTypeFromPayload(action)
  if (CHART_ACTION_TYPES.has(type)) {
    return normalizeChartAction(action, fallbackScope)
  }
  if (MATH_ACTION_TYPES.has(type)) {
    return normalizeMathAction(action, fallbackScope)
  }
  if (MERMAID_ACTION_TYPES.has(type)) {
    return normalizeMermaidAction(action, fallbackScope)
  }
  if (DIAGRAM_ACTION_TYPES.has(type)) {
    return normalizeDiagramsAction(action, fallbackScope)
  }
  if (CITATION_FOOTNOTE_ACTION_TYPES.has(type)) {
    return normalizeCitationWithFootnoteAction(action, fallbackScope)
  }
  if (FOOTNOTE_ACTION_TYPES.has(type)) {
    return normalizeFootnoteAction(action, fallbackScope)
  }
  if (FLOWCHART_ACTION_TYPES.has(type)) {
    return normalizeFlowchartAction(action, fallbackScope)
  }
  return normalizeTextAction(action, fallbackScope)
}

const normalizeAiActions = (response, patch, fallbackScope) => {
  const rawActions = Array.isArray(response?.actions)
    ? response.actions
    : Array.isArray(response?.action)
      ? response.action
      : response?.action
        ? [response.action]
        : []
  const normalizedActions = rawActions
    .map((action) => normalizeStructuredAction(action, fallbackScope))
    .filter(Boolean)

  if (normalizedActions.length > 0) {
    return normalizedActions
  }

  const directActionType =
    getActionType(response) || inferActionTypeFromPayload(response)
  if (directActionType) {
    const directAction = normalizeStructuredAction(
      {
        ...response,
        type: directActionType,
      },
      fallbackScope,
    )
    return directAction ? [directAction] : []
  }

  const normalizedPatchAction = normalizePatchAction(patch, fallbackScope)
  return normalizedPatchAction ? [normalizedPatchAction] : []
}

export const normalizeAiResult = (
  response,
  fallbackScope = 'document',
  config = {},
) => {
  const locale = getLocale(config)
  if (typeof response === 'string') {
    return {
      message: response,
      patch: null,
      actions: [],
      autoApply: false,
      autoSave: false,
      locale,
    }
  }
  if (!response || typeof response !== 'object') {
    return {
      message:
        locale === 'zh-CN'
          ? 'AI 没有返回可用内容。'
          : 'AI did not return usable content.',
      patch: null,
      actions: [],
      autoApply: false,
      autoSave: false,
      locale,
    }
  }

  const applyValue =
    typeof response.apply === 'boolean' ? response.apply : response.autoApply
  const patchCandidate =
    response.patch ||
    (response.apply && typeof response.apply === 'object'
      ? response.apply
      : null)
  const patch =
    patchCandidate ||
    (response.content !== undefined ||
    response.html !== undefined ||
    response.text !== undefined ||
    response.json !== undefined
      ? {
          content:
            response.content ?? response.html ?? response.text ?? response.json,
          format:
            response.format ||
            (response.html !== undefined
              ? 'html'
              : response.json !== undefined
                ? 'json'
                : 'text'),
          mode: response.mode || response.operation || response.applyMode,
          target: response.target || fallbackScope,
        }
      : null)

  return {
    message:
      response.message ||
      response.reply ||
      response.answer ||
      (locale === 'zh-CN'
        ? '已根据你的要求生成修改。'
        : 'The requested revision is ready.'),
    patch,
    actions: normalizeAiActions(response, patch, fallbackScope),
    autoApply: applyValue ?? config.autoApply ?? true,
    autoSave: response.autoSave ?? config.autoSave ?? false,
    locale,
  }
}
