import { contentTransform } from '@/utils/content-transform'
import { shortId } from '@/utils/short-id'

const resolveValue = (value) => value?.value ?? value

const getLocale = (config = {}) => {
  if (config.locale) {
    return config.locale
  }
  const options = resolveValue(config.options)
  return options?.locale || 'zh-CN'
}

const isZh = (config = {}) => getLocale(config) === 'zh-CN'

const clampPosition = (editor, position) => {
  const max = editor?.state?.doc?.content?.size ?? 0
  const next = Number(position)
  if (!Number.isFinite(next)) {
    return 0
  }
  return Math.min(Math.max(next, 0), max)
}

const normalizeObjectInput = (value) => {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  if (typeof value === 'object') {
    return value
  }
  return null
}

const inferPatchFormat = (patch) => {
  if (patch?.format) {
    return patch.format
  }
  if (patch?.html !== undefined) {
    return 'html'
  }
  if (patch?.json !== undefined) {
    return 'json'
  }
  if (patch?.text !== undefined) {
    return 'text'
  }
  if (typeof patch?.content === 'string') {
    return patch.content.trim().startsWith('<') ? 'html' : 'text'
  }
  if (patch?.content && typeof patch.content === 'object') {
    return 'json'
  }
  return 'text'
}

const getPatchContent = (patch, format) => {
  if (patch?.content !== undefined) {
    return patch.content
  }
  return patch?.[format]
}

const normalizePatchContent = (content, format, target) => {
  if (format === 'json') {
    return content
  }
  const stringContent = `${content ?? ''}`
  if (format === 'html') {
    return contentTransform(stringContent)
  }
  if (target === 'selection' && !stringContent.includes('\n')) {
    return stringContent
  }
  return contentTransform(stringContent)
}

const normalizePatchAction = (patch, fallbackScope) => {
  if (!patch || typeof patch !== 'object') {
    return null
  }
  const format = inferPatchFormat(patch)
  return {
    type: 'patch',
    target: patch.target || fallbackScope,
    mode: patch.mode || 'replace',
    format,
    content: getPatchContent(patch, format),
  }
}

const normalizeChartAction = (action, fallbackScope) => {
  return {
    type: 'insert_echarts',
    target: action.target || fallbackScope,
    position: action.position || 'after',
    chart:
      action.chart ||
      action.echarts ||
      action.chartNode ||
      action.content ||
      null,
  }
}

const normalizeTextAction = (action, fallbackScope) => {
  const type = action.type || action.kind || 'patch'
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
  return {
    type: 'patch',
    target: action.target || targetMap[type] || fallbackScope,
    mode: action.mode || modeMap[type] || 'replace',
    format,
    content: action.content,
  }
}

const normalizeAiActions = (response, patch, fallbackScope) => {
  const rawActions = Array.isArray(response?.actions)
    ? response.actions
    : response?.action
      ? [response.action]
      : []
  const normalizedActions = rawActions
    .map((action) => {
      if (!action || typeof action !== 'object') {
        return null
      }
      const type = action.type || action.kind
      if (['insert_echarts', 'insert_chart'].includes(type)) {
        return normalizeChartAction(action, fallbackScope)
      }
      return normalizeTextAction(action, fallbackScope)
    })
    .filter(Boolean)

  if (normalizedActions.length > 0) {
    return normalizedActions
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
            response.content ??
            response.html ??
            response.text ??
            response.json,
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

const getSelectionSnapshot = (editor, fallback = {}) => {
  const selection = editor?.state?.selection
  if (!selection) {
    return fallback
  }
  const text = selection.empty
    ? ''
    : editor.state.doc.textBetween(selection.from, selection.to, '')
  return {
    from: selection.from,
    to: selection.to,
    empty: selection.empty,
    text: text || fallback.text || '',
  }
}

export const getAiApplyMeta = (result, config = {}) => {
  const locale = getLocale(config)
  const results = Array.isArray(result)
    ? result.filter((item) => item?.changed)
    : []

  if (Array.isArray(result)) {
    if (results.length === 0) {
      return ''
    }
    if (results.length === 1) {
      return getAiApplyMeta(results[0], config)
    }
    return locale === 'zh-CN'
      ? `已执行 ${results.length} 项修改`
      : `Applied ${results.length} changes`
  }
  if (!result?.changed) {
    return ''
  }
  if (result.mode === 'insert_echarts') {
    const targetText =
      result.target === 'selection'
        ? locale === 'zh-CN'
          ? '当前内容后'
          : 'after the current content'
        : locale === 'zh-CN'
          ? '文档中'
          : 'into the document'
    return locale === 'zh-CN'
      ? `已在${targetText}插入图表节点`
      : `Inserted a chart node ${targetText}`
  }
  const targetText =
    result.target === 'selection'
      ? locale === 'zh-CN'
        ? '当前内容'
        : 'current content'
      : locale === 'zh-CN'
        ? '全文'
        : 'document'
  if (locale === 'zh-CN') {
    const modeTextMap = {
      replace: '替换',
      append: '追加',
      prepend: '前置插入',
      insert: '插入',
    }
    const modeText = modeTextMap[result.mode] || modeTextMap.replace
    return `已将内容${modeText}到${targetText}`
  }
  return `Updated ${targetText}`
}

const normalizeEchartsAttrs = (chart) => {
  const normalizedChart = normalizeObjectInput(chart)
  if (!normalizedChart) {
    return null
  }
  const chartOptions =
    normalizedChart.chartOptions ||
    normalizedChart.options ||
    normalizedChart.option ||
    null
  const chartConfig = normalizedChart.chartConfig || null
  const normalizedChartOptions = normalizeObjectInput(chartOptions)
  const normalizedChartConfig = normalizeObjectInput(chartConfig)
  const mode =
    normalizedChart.mode === 1 || normalizedChartConfig ? 1 : 0
  const parsedWidth = Number(normalizedChart.width)
  const parsedHeight = Number(normalizedChart.height)

  if (mode === 0 && !normalizedChartOptions) {
    return null
  }
  if (mode === 1 && !normalizedChartConfig) {
    return null
  }

  return {
    vnode: true,
    id: normalizedChart.id || shortId(),
    name: normalizedChart.name || normalizedChart.title || '',
    width:
      Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : 640,
    height:
      Number.isFinite(parsedHeight) && parsedHeight >= 200
        ? parsedHeight
        : 360,
    mode,
    chartOptions: mode === 0 ? normalizedChartOptions : null,
    chartConfig: mode === 1 ? normalizedChartConfig : null,
    src: normalizedChart.src || '',
    describe:
      normalizedChart.describe || normalizedChart.description || '',
    nodeAlign: normalizedChart.nodeAlign || 'center',
    margin:
      normalizedChart.margin && typeof normalizedChart.margin === 'object'
        ? normalizedChart.margin
        : {},
  }
}

const applyEchartsAction = (action, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }
  const target = action.target || fallbackScope
  const attrs = normalizeEchartsAttrs(action.chart)
  if (!attrs) {
    return { changed: false, target, mode: 'insert_echarts' }
  }

  if (target === 'selection' && context.selectionRange) {
    const insertPosition =
      action.position === 'before'
        ? context.selectionRange.from
        : context.selectionRange.to
    if (insertPosition <= 0) {
      editor.chain().focus('start', { scrollIntoView: true }).run()
    } else {
      editor
        .chain()
        .focus()
        .setTextSelection(clampPosition(editor, insertPosition))
        .run()
    }
  } else {
    const focusPosition = action.position === 'start' ? 'start' : 'end'
    editor.chain().focus(focusPosition, { scrollIntoView: true }).run()
  }

  editor.commands.setEcharts(attrs)
  return {
    changed: true,
    target,
    mode: 'insert_echarts',
  }
}

const applyAiPatch = (patch, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor || !patch) {
    return { changed: false }
  }
  const target = patch.target || fallbackScope
  const mode = patch.mode || 'replace'
  const format = inferPatchFormat(patch)
  const content = getPatchContent(patch, format)
  if (content === undefined || content === null || content === '') {
    return { changed: false, target, mode }
  }

  const normalizedContent = normalizePatchContent(content, format, target)

  if (target === 'document') {
    const chain = editor.chain()
    if (mode === 'replace') {
      chain
        .setContent(normalizedContent, { emitUpdate: true })
        .focus('start', { scrollIntoView: true })
        .run()
    } else if (mode === 'prepend') {
      chain
        .focus('start', { scrollIntoView: true })
        .insertContent(normalizedContent)
        .run()
    } else {
      chain
        .focus('end', { scrollIntoView: true })
        .insertContent(normalizedContent)
        .run()
    }
    return { changed: true, target, mode }
  }

  const range = context.selectionRange
  if (
    !range ||
    range.from === undefined ||
    range.to === undefined
  ) {
    return applyAiPatch(
      { ...patch, target: 'document' },
      'document',
      context,
    )
  }

  const from = clampPosition(editor, range.from)
  const to = clampPosition(editor, range.to)
  const chain = editor.chain().focus()

  if (mode === 'replace') {
    chain
      .insertContentAt(
        {
          from: Math.min(from, to),
          to: Math.max(from, to),
        },
        normalizedContent,
      )
      .run()
  } else if (mode === 'prepend') {
    chain.insertContentAt(from, normalizedContent).run()
  } else if (mode === 'append') {
    chain.insertContentAt(to, normalizedContent).run()
  } else {
    chain.insertContent(normalizedContent).run()
  }

  return { changed: true, target, mode }
}

const applyAiAction = (action, fallbackScope, context) => {
  if (!action || typeof action !== 'object') {
    return { changed: false }
  }
  if (action.type === 'insert_echarts') {
    return applyEchartsAction(action, fallbackScope, context)
  }
  return applyAiPatch(action, fallbackScope, context)
}

export const applyAiActions = async (
  actions = [],
  fallbackScope = 'document',
  context = {},
) => {
  const editor = resolveValue(context.editor)
  const results = []
  let currentSelectionRange = context.selectionRange

  for (const action of actions) {
    const result = await applyAiAction(action, fallbackScope, {
      ...context,
      selectionRange: currentSelectionRange,
    })
    results.push(result)

    if (
      result?.changed &&
      action?.target !== 'document' &&
      action?.type !== 'insert_echarts' &&
      editor
    ) {
      currentSelectionRange = getSelectionSnapshot(editor, currentSelectionRange)
    }
  }

  return results
}

export const getAiErrorMessage = (error, config = {}) => {
  if (error?.message) {
    return error.message
  }
  return isZh(config)
    ? 'AI 修改失败，请稍后重试。'
    : 'AI revision failed. Please try again later.'
}
