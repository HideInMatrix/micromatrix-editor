import {
  clampPosition,
  contentTransform,
  getLocale,
  getPatchContent,
  inferPatchFormat,
  isZh,
  looksLikePlainMathExpression,
  looksLikeSvgMarkup,
  normalizeObjectInput,
  normalizePatchContent,
  resolveValue,
  shortId,
  svgToDataURL,
  toPositiveNumber,
  unwrapMathDelimiters,
} from './shared'

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
  const insertionTargetText =
    result.target === 'selection'
      ? locale === 'zh-CN'
        ? '当前内容后'
        : 'after the current content'
      : locale === 'zh-CN'
        ? '文档中'
        : 'into the document'
  if (result.mode === 'insert_echarts') {
    return locale === 'zh-CN'
      ? `已在${insertionTargetText}插入图表节点`
      : `Inserted a chart node ${insertionTargetText}`
  }
  if (result.mode === 'insert_math') {
    return locale === 'zh-CN'
      ? `已在${insertionTargetText}插入公式节点`
      : `Inserted a math node ${insertionTargetText}`
  }
  if (result.mode === 'insert_mermaid') {
    return locale === 'zh-CN'
      ? `已在${insertionTargetText}插入 Mermaid 节点`
      : `Inserted a Mermaid node ${insertionTargetText}`
  }
  if (result.mode === 'insert_diagrams') {
    return locale === 'zh-CN'
      ? `已在${insertionTargetText}插入流程图节点`
      : `Inserted a flowchart node ${insertionTargetText}`
  }
  if (result.mode === 'insert_footnote') {
    return locale === 'zh-CN'
      ? `已在${insertionTargetText}插入脚注`
      : `Inserted a footnote ${insertionTargetText}`
  }
  if (result.mode === 'insert_citation_with_footnote') {
    return locale === 'zh-CN'
      ? `已在${insertionTargetText}插入正文引用与脚注`
      : `Inserted a citation with footnote ${insertionTargetText}`
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
  const looksLikeEchartsOption =
    normalizedChart &&
    typeof normalizedChart === 'object' &&
    !Array.isArray(normalizedChart) &&
    !!(
      normalizedChart.series ||
      normalizedChart.xAxis ||
      normalizedChart.yAxis ||
      normalizedChart.dataset ||
      normalizedChart.legend ||
      normalizedChart.tooltip ||
      normalizedChart.grid ||
      normalizedChart.radar ||
      normalizedChart.polar ||
      normalizedChart.geo ||
      normalizedChart.angleAxis ||
      normalizedChart.radiusAxis ||
      normalizedChart.parallel ||
      normalizedChart.singleAxis ||
      normalizedChart.calendar ||
      normalizedChart.visualMap ||
      normalizedChart.graphic ||
      normalizedChart.title ||
      normalizedChart.toolbox
    )
  const chartOptions =
    normalizedChart.chartOptions ||
    normalizedChart.options ||
    normalizedChart.option ||
    (looksLikeEchartsOption ? normalizedChart : null)
  const chartConfig = normalizedChart.chartConfig || null
  const normalizedChartOptions = normalizeObjectInput(chartOptions)
  const normalizedChartConfig = normalizeObjectInput(chartConfig)
  const mode = normalizedChart.mode === 1 || normalizedChartConfig ? 1 : 0
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
    name:
      normalizedChart.name ||
      normalizedChart.title?.text ||
      (Array.isArray(normalizedChart.title)
        ? normalizedChart.title[0]?.text || ''
        : normalizedChart.title || ''),
    width: Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : 640,
    height:
      Number.isFinite(parsedHeight) && parsedHeight >= 200 ? parsedHeight : 360,
    mode,
    chartOptions: mode === 0 ? normalizedChartOptions : null,
    chartConfig: mode === 1 ? normalizedChartConfig : null,
    src: normalizedChart.src || '',
    describe: normalizedChart.describe || normalizedChart.description || '',
    nodeAlign: normalizedChart.nodeAlign || 'center',
    margin:
      normalizedChart.margin && typeof normalizedChart.margin === 'object'
        ? normalizedChart.margin
        : {},
  }
}

const normalizeMathPayload = (math) => {
  if (typeof math === 'string') {
    const latex = math.trim()
    return latex ? { latex, displayMode: null } : null
  }
  const normalizedMath = normalizeObjectInput(math)
  if (!normalizedMath) {
    return null
  }
  const latex = `${
    normalizedMath.latex ??
    normalizedMath.content ??
    normalizedMath.formula ??
    normalizedMath.equation ??
    ''
  }`.trim()
  if (!latex) {
    return null
  }

  let displayMode = null
  if (typeof normalizedMath.displayMode === 'boolean') {
    ;({ displayMode } = normalizedMath)
  } else if (typeof normalizedMath.block === 'boolean') {
    displayMode = normalizedMath.block
  } else if (typeof normalizedMath.inline === 'boolean') {
    displayMode = !normalizedMath.inline
  } else if (
    ['block', 'display'].includes(normalizedMath.mode) ||
    normalizedMath.type === 'block'
  ) {
    displayMode = true
  } else if (
    normalizedMath.mode === 'inline' ||
    normalizedMath.type === 'inline'
  ) {
    displayMode = false
  }

  return { latex, displayMode }
}

const getBlockMathDescriptor = (value = '') => {
  const wrappedMath = unwrapMathDelimiters(value)
  if (wrappedMath?.displayMode !== false) {
    return wrappedMath
  }
  if (looksLikePlainMathExpression(value)) {
    return {
      latex: value.trim(),
      displayMode: true,
    }
  }
  return null
}

const migrateAiMathBlocks = (editor) => {
  const blockMath = editor?.schema?.nodes?.blockMath
  if (!editor || !blockMath) {
    return false
  }

  const replacements = []
  editor.state.doc.descendants((node, pos) => {
    if (
      node.type.name !== 'paragraph' ||
      node.childCount !== 1 ||
      !node.firstChild?.isText
    ) {
      return
    }

    const descriptor = getBlockMathDescriptor(node.textContent || '')
    if (!descriptor?.latex) {
      return
    }

    replacements.push({
      from: pos,
      to: pos + node.nodeSize,
      latex: descriptor.latex,
    })
  })

  if (replacements.length === 0) {
    return false
  }

  const { tr } = editor.state
  replacements
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to, latex }) => {
      const $from = tr.doc.resolve(from)
      const { parent } = $from
      const index = $from.index()
      if (!parent.canReplaceWith(index, index + 1, blockMath)) {
        return
      }
      tr.replaceWith(from, to, blockMath.create({ latex }))
    })

  if (!tr.docChanged) {
    return false
  }

  tr.setMeta('addToHistory', false)
  editor.view.dispatch(tr)
  return true
}

const findInlineMathMatches = (text = '') => {
  const matches = []

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '$') {
      continue
    }
    if (text[start - 1] === '$' || text[start + 1] === '$') {
      continue
    }

    let end = start + 1
    while (end < text.length) {
      if (text[end] === '$' && text[end - 1] !== '$' && text[end + 1] !== '$') {
        const latex = text.slice(start + 1, end).trim()
        if (latex) {
          matches.push({
            start,
            end: end + 1,
            latex,
          })
        }
        start = end
        break
      }
      end += 1
    }
  }

  return matches
}

const migrateAiInlineMath = (editor) => {
  const inlineMath = editor?.schema?.nodes?.inlineMath
  if (!editor || !inlineMath) {
    return false
  }

  const replacements = []
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text || !node.text.includes('$')) {
      return
    }

    findInlineMathMatches(node.text).forEach((match) => {
      replacements.push({
        from: pos + match.start,
        to: pos + match.end,
        latex: match.latex,
      })
    })
  })

  if (replacements.length === 0) {
    return false
  }

  const { tr } = editor.state
  replacements
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to, latex }) => {
      const $from = tr.doc.resolve(from)
      const { parent } = $from
      const index = $from.index()
      if (!parent.canReplaceWith(index, index + 1, inlineMath)) {
        return
      }
      tr.replaceWith(from, to, inlineMath.create({ latex }))
    })

  if (!tr.docChanged) {
    return false
  }

  tr.setMeta('addToHistory', false)
  editor.view.dispatch(tr)
  return true
}

const migrateAiMathContent = (editor) => {
  if (!editor?.schema?.nodes?.inlineMath || !editor?.schema?.nodes?.blockMath) {
    return false
  }

  const blockChanged = migrateAiMathBlocks(editor)
  const inlineChanged = migrateAiInlineMath(editor)
  return blockChanged || inlineChanged
}

const normalizeSvgSource = (value) => {
  if (typeof value !== 'string') {
    return { source: '', svg: '' }
  }
  const normalized = value.trim()
  if (!normalized) {
    return { source: '', svg: '' }
  }
  if (looksLikeSvgMarkup(normalized)) {
    return {
      source: svgToDataURL(normalized),
      svg: normalized,
    }
  }
  return { source: normalized, svg: '' }
}

const getSvgDimensions = (svgCode = '') => {
  if (!svgCode) {
    return { width: null, height: null }
  }

  const width = toPositiveNumber(
    svgCode.match(/\bwidth=["']([^"']+)["']/i)?.[1],
  )
  const height = toPositiveNumber(
    svgCode.match(/\bheight=["']([^"']+)["']/i)?.[1],
  )
  if (width && height) {
    return { width, height }
  }

  const viewBox = svgCode.match(/\bviewBox=["']([^"']+)["']/i)?.[1]
  if (!viewBox) {
    return { width, height }
  }

  const [, , viewBoxWidth, viewBoxHeight] = viewBox
    .trim()
    .split(/\s+/)
    .map((item) => Number.parseFloat(item))

  return {
    width: width || (Number.isFinite(viewBoxWidth) ? viewBoxWidth : null),
    height: height || (Number.isFinite(viewBoxHeight) ? viewBoxHeight : null),
  }
}

const normalizeMermaidPayload = (mermaid) => {
  if (typeof mermaid === 'string') {
    const content = mermaid.trim()
    return content
      ? {
          content,
          src: '',
          config: {},
          width: null,
          height: null,
        }
      : null
  }

  const normalizedMermaid = normalizeObjectInput(mermaid)
  if (!normalizedMermaid) {
    return null
  }

  const content = `${
    normalizedMermaid.content ??
    normalizedMermaid.code ??
    normalizedMermaid.source ??
    normalizedMermaid.mermaid ??
    normalizedMermaid.text ??
    ''
  }`.trim()
  const rawSource =
    normalizedMermaid.src ||
    normalizedMermaid.data ||
    normalizedMermaid.image ||
    normalizedMermaid.svg ||
    normalizedMermaid.svgData ||
    ''
  const { source: src, svg } = normalizeSvgSource(rawSource)
  const svgDimensions = getSvgDimensions(svg)
  const config =
    normalizeObjectInput(normalizedMermaid.config) ||
    (normalizedMermaid.theme ? { theme: normalizedMermaid.theme } : {})

  if (!content && !src) {
    return null
  }

  return {
    content,
    src,
    config: config || {},
    width: toPositiveNumber(normalizedMermaid.width) || svgDimensions.width,
    height: toPositiveNumber(normalizedMermaid.height) || svgDimensions.height,
  }
}

const normalizeDiagramsPayload = (diagram) => {
  if (typeof diagram === 'string') {
    const { source: src, svg } = normalizeSvgSource(diagram)
    if (!src) {
      return null
    }
    const svgDimensions = getSvgDimensions(svg)
    return {
      src,
      content: diagram,
      width: svgDimensions.width,
      height: svgDimensions.height,
    }
  }

  const normalizedDiagram = normalizeObjectInput(diagram)
  if (!normalizedDiagram) {
    return null
  }

  const rawSource =
    normalizedDiagram.src ||
    normalizedDiagram.data ||
    normalizedDiagram.image ||
    normalizedDiagram.preview ||
    normalizedDiagram.svg ||
    normalizedDiagram.svgData ||
    normalizedDiagram.content ||
    ''
  const { source: src, svg } = normalizeSvgSource(rawSource)
  if (!src) {
    return null
  }
  const svgDimensions = getSvgDimensions(svg)

  return {
    src,
    content:
      normalizedDiagram.content ||
      normalizedDiagram.data ||
      normalizedDiagram.source ||
      normalizedDiagram.xml ||
      rawSource,
    width: toPositiveNumber(normalizedDiagram.width) || svgDimensions.width,
    height: toPositiveNumber(normalizedDiagram.height) || svgDimensions.height,
  }
}

const normalizeFootnoteText = (value = '') => {
  return `${value || ''}`.replace(/\s+/g, ' ').trim()
}

const getPlainTextFromAnyHtml = (value = '') => {
  if (!value || typeof value !== 'string') {
    return ''
  }
  if (typeof DOMParser === 'undefined') {
    return normalizeFootnoteText(value)
  }
  try {
    const doc = new DOMParser().parseFromString(value, 'text/html')
    return normalizeFootnoteText(doc.body?.textContent || '')
  } catch {
    return normalizeFootnoteText(value)
  }
}

const getPlainTextFromJsonContent = (value, seen = new Set()) => {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'string') {
    return normalizeFootnoteText(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return normalizeFootnoteText(`${value}`)
  }
  if (Array.isArray(value)) {
    return normalizeFootnoteText(
      value
        .map((item) => getPlainTextFromJsonContent(item, seen))
        .filter(Boolean)
        .join(' '),
    )
  }
  if (typeof value !== 'object' || seen.has(value)) {
    return ''
  }

  seen.add(value)
  return normalizeFootnoteText(
    [value.text, value.content, value.caption, value.message, value.children]
      .map((item) => getPlainTextFromJsonContent(item, seen))
      .filter(Boolean)
      .join(' '),
  )
}

const normalizeFootnotePayload = (footnote) => {
  if (typeof footnote === 'string') {
    const caption = normalizeFootnoteText(footnote)
    if (!caption) {
      return null
    }
    return {
      id: shortId(10),
      caption,
      content: contentTransform(caption),
      hasExplicitContent: true,
    }
  }

  const normalizedFootnote = normalizeObjectInput(footnote)
  if (!normalizedFootnote) {
    return null
  }

  const rawContent =
    normalizedFootnote.content ??
    normalizedFootnote.html ??
    normalizedFootnote.text ??
    normalizedFootnote.json ??
    normalizedFootnote.body ??
    normalizedFootnote.note ??
    normalizedFootnote.value
  const format =
    normalizedFootnote.format ||
    (normalizedFootnote.html !== undefined
      ? 'html'
      : normalizedFootnote.json !== undefined ||
          (rawContent && typeof rawContent === 'object')
        ? 'json'
        : 'text')

  let normalizedContent = null
  if (rawContent !== undefined && rawContent !== null && rawContent !== '') {
    if (format === 'json') {
      if (Array.isArray(rawContent)) {
        normalizedContent = rawContent
      } else if (
        rawContent?.type === 'doc' &&
        Array.isArray(rawContent.content)
      ) {
        normalizedContent = rawContent.content
      } else {
        normalizedContent = rawContent
      }
    } else if (format === 'html') {
      normalizedContent = `${rawContent}`.trim()
    } else {
      const textContent = `${rawContent}`.trim()
      normalizedContent = textContent ? contentTransform(textContent) : ''
    }
  }

  const caption =
    normalizeFootnoteText(normalizedFootnote.caption) ||
    (format === 'html'
      ? getPlainTextFromAnyHtml(`${rawContent || ''}`)
      : format === 'json'
        ? getPlainTextFromJsonContent(rawContent)
        : normalizeFootnoteText(`${rawContent || ''}`))

  if (!caption && !normalizedContent) {
    return null
  }

  return {
    id: normalizedFootnote.id || shortId(10),
    caption,
    content: normalizedContent || contentTransform(caption),
    hasExplicitContent:
      normalizedContent !== null &&
      normalizedContent !== undefined &&
      normalizedContent !== '',
  }
}

const normalizeCitationPayload = (citation) => {
  if (typeof citation === 'string') {
    const content = citation.trim()
    if (!content) {
      return null
    }
    return {
      content,
      format: content.startsWith('<') ? 'html' : 'text',
    }
  }

  const normalizedCitation = normalizeObjectInput(citation)
  if (!normalizedCitation) {
    return null
  }

  const content =
    normalizedCitation.content ??
    normalizedCitation.html ??
    normalizedCitation.text ??
    normalizedCitation.json ??
    normalizedCitation.body ??
    normalizedCitation.quote ??
    normalizedCitation.value
  if (content === undefined || content === null || content === '') {
    return null
  }

  const format =
    normalizedCitation.format ||
    (normalizedCitation.html !== undefined
      ? 'html'
      : normalizedCitation.json !== undefined ||
          (content && typeof content === 'object')
        ? 'json'
        : typeof content === 'string' && content.trim().startsWith('<')
          ? 'html'
          : 'text')

  return {
    content,
    format,
  }
}

const resolveCitationPatchMode = (action, selectionRange) => {
  const normalized = `${action?.position || action?.mode || 'after'}`
    .trim()
    .toLowerCase()
  if (
    normalized === 'replace' &&
    selectionRange &&
    selectionRange.from !== undefined &&
    selectionRange.to !== undefined &&
    selectionRange.from !== selectionRange.to
  ) {
    return 'replace'
  }
  if (['before', 'start', 'prepend'].includes(normalized)) {
    return 'prepend'
  }
  return 'append'
}

const findNodeByAttr = (doc, nodeType, attrName, attrValue) => {
  let matched = null
  doc?.descendants((node, pos) => {
    if (
      node.type.name === nodeType &&
      (attrName === undefined || node.attrs?.[attrName] === attrValue)
    ) {
      matched = { node, pos }
      return false
    }
  })
  return matched
}

const focusInsertTarget = (editor, target, position, selectionRange) => {
  if (target === 'selection' && selectionRange) {
    const from = clampPosition(editor, selectionRange.from)
    const to = clampPosition(editor, selectionRange.to)
    const start = Math.min(from, to)
    const end = Math.max(from, to)

    if (position === 'replace' && end > start) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: start, to: end })
        .setTextSelection(start)
        .run()
      if (start <= 0) {
        return editor.chain().focus('start', { scrollIntoView: true })
      }
      return editor.chain().focus().setTextSelection(start)
    }

    const insertPosition =
      position === 'before' || position === 'start' ? start : end
    if (insertPosition <= 0) {
      return editor.chain().focus('start', { scrollIntoView: true })
    }
    return editor.chain().focus().setTextSelection(insertPosition)
  }

  const focusPosition =
    position === 'before' || position === 'start' ? 'start' : 'end'
  return editor.chain().focus(focusPosition, { scrollIntoView: true })
}

const focusFootnoteInsertTarget = (
  editor,
  target,
  position,
  selectionRange,
) => {
  if (target === 'selection') {
    return focusInsertTarget(editor, target, position, selectionRange)
  }

  if (position === 'before' || position === 'start') {
    return focusInsertTarget(editor, 'document', 'start', selectionRange)
  }

  const footnotesNode = findNodeByAttr(editor?.state?.doc, 'footnotes')
  if (!footnotesNode) {
    return focusInsertTarget(editor, 'document', 'end', selectionRange)
  }

  const insertPosition = clampPosition(editor, footnotesNode.pos)
  return editor.chain().focus().setTextSelection(insertPosition)
}

const resolveActionSelectionRange = (context = {}) => {
  return context.selectionAnchor || context.selectionRange || null
}

const resolveInsertPosition = (editor, target, position, selectionRange) => {
  if (target === 'selection' && selectionRange) {
    const from = clampPosition(editor, selectionRange.from)
    const to = clampPosition(editor, selectionRange.to)
    const start = Math.min(from, to)
    const end = Math.max(from, to)

    if (position === 'replace' && end > start) {
      return { from: start, to: end }
    }

    return position === 'before' || position === 'start' ? start : end
  }

  if (position === 'before' || position === 'start') {
    return 0
  }

  return clampPosition(editor, editor?.state?.doc?.content?.size ?? 0)
}

const insertNodeAtResolvedPosition = (
  editor,
  nodeContent,
  target,
  position,
  selectionRange,
) => {
  const insertPosition = resolveInsertPosition(
    editor,
    target,
    position,
    selectionRange,
  )
  return editor
    .chain()
    .focus()
    .insertContentAt(insertPosition, nodeContent)
    .run()
}

const renderMermaidAsset = async (content, config = {}) => {
  const mermaidLib = globalThis?.mermaid
  if (!mermaidLib?.render || !content) {
    return null
  }

  try {
    mermaidLib.initialize({
      darkMode: false,
      startOnLoad: false,
      fontSize: 12,
      securityLevel: 'loose',
      ...config,
    })
    const renderResult = await mermaidLib.render(
      `ai-mermaid-${shortId(10)}`,
      content,
    )
    const svg =
      typeof renderResult === 'string' ? renderResult : renderResult?.svg
    if (!svg) {
      return null
    }
    const { width, height } = getSvgDimensions(svg)
    return {
      src: svgToDataURL(svg),
      width,
      height,
    }
  } catch {
    return null
  }
}

const applyEchartsAction = (action, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }
  const target = action.target || fallbackScope
  const actionSelectionRange = resolveActionSelectionRange(context)
  const attrs = normalizeEchartsAttrs(action.chart)
  if (!attrs) {
    return { changed: false, target, mode: 'insert_echarts' }
  }

  const position = action.position || 'after'
  const changed =
    target === 'selection' && context.selectionAnchor?.isNodeSelection
      ? insertNodeAtResolvedPosition(
          editor,
          {
            type: 'echarts',
            attrs,
          },
          target,
          position,
          actionSelectionRange,
        )
      : (focusInsertTarget(
          editor,
          target,
          position,
          actionSelectionRange,
        ).run(),
        editor.commands.setEcharts(attrs))
  return {
    changed: !!changed,
    target,
    mode: 'insert_echarts',
  }
}

const applyMathAction = (action, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }

  const target = action.target || fallbackScope
  const actionSelectionRange = resolveActionSelectionRange(context)
  const math = normalizeMathPayload(action.math)
  if (!math) {
    return { changed: false, target, mode: 'insert_math' }
  }

  const displayMode =
    typeof math.displayMode === 'boolean'
      ? math.displayMode
      : !(target === 'selection' && action.position === 'replace')
  const position = action.position || 'after'
  const changed =
    target === 'selection' && context.selectionAnchor?.isNodeSelection
      ? insertNodeAtResolvedPosition(
          editor,
          {
            type: displayMode ? 'blockMath' : 'inlineMath',
            attrs: {
              latex: math.latex,
            },
          },
          target,
          position,
          actionSelectionRange,
        )
      : displayMode
        ? focusInsertTarget(editor, target, position, actionSelectionRange)
            .insertBlockMath({ latex: math.latex })
            .run()
        : focusInsertTarget(editor, target, position, actionSelectionRange)
            .insertInlineMath({ latex: math.latex })
            .run()

  return {
    changed: !!changed,
    target,
    mode: 'insert_math',
  }
}

const applyMermaidAction = async (action, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }

  const target = action.target || fallbackScope
  const actionSelectionRange = resolveActionSelectionRange(context)
  const mermaid = normalizeMermaidPayload(action.mermaid)
  if (!mermaid) {
    return { changed: false, target, mode: 'insert_mermaid' }
  }

  const rendered =
    !mermaid.src && mermaid.content
      ? await renderMermaidAsset(mermaid.content, mermaid.config)
      : null
  const src = mermaid.src || rendered?.src || ''
  if (!src) {
    return { changed: false, target, mode: 'insert_mermaid' }
  }

  const imageAttrs = {
    id: shortId(10),
    type: 'mermaid',
    src,
    config: JSON.stringify(mermaid.config || {}),
    content: mermaid.content,
    width: mermaid.width || rendered?.width || 640,
    height: mermaid.height || rendered?.height || 360,
    equalProportion: false,
  }
  const position = action.position || 'after'
  const changed =
    target === 'selection' && context.selectionAnchor?.isNodeSelection
      ? insertNodeAtResolvedPosition(
          editor,
          {
            type: 'image',
            attrs: imageAttrs,
          },
          target,
          position,
          actionSelectionRange,
        )
      : focusInsertTarget(editor, target, position, actionSelectionRange)
          .setImage(imageAttrs)
          .run()

  return {
    changed: !!changed,
    target,
    mode: 'insert_mermaid',
  }
}

const applyDiagramsAction = (action, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }

  const target = action.target || fallbackScope
  const actionSelectionRange = resolveActionSelectionRange(context)
  const diagram = normalizeDiagramsPayload(action.diagram)
  if (!diagram) {
    return { changed: false, target, mode: 'insert_diagrams' }
  }

  const imageAttrs = {
    id: shortId(10),
    type: 'diagrams',
    src: diagram.src,
    content: diagram.content || diagram.src,
    width: diagram.width || 640,
    height: diagram.height || 360,
    equalProportion: false,
  }
  const position = action.position || 'after'
  const changed =
    target === 'selection' && context.selectionAnchor?.isNodeSelection
      ? insertNodeAtResolvedPosition(
          editor,
          {
            type: 'image',
            attrs: imageAttrs,
          },
          target,
          position,
          actionSelectionRange,
        )
      : focusInsertTarget(editor, target, position, actionSelectionRange)
          .setImage(imageAttrs)
          .run()

  return {
    changed: !!changed,
    target,
    mode: 'insert_diagrams',
  }
}

const applyFootnoteAction = (action, fallbackScope, context) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }
  if (
    !editor.schema?.nodes?.footnoteReference ||
    !editor.schema?.nodes?.footnote
  ) {
    return {
      changed: false,
      target: action.target || fallbackScope,
      mode: 'insert_footnote',
    }
  }

  const target = action.target || fallbackScope
  const actionSelectionRange = resolveActionSelectionRange(context)
  const footnote = normalizeFootnotePayload(action.footnote)
  if (!footnote) {
    return { changed: false, target, mode: 'insert_footnote' }
  }

  const insertChain = focusFootnoteInsertTarget(
    editor,
    target,
    action.position || 'after',
    actionSelectionRange,
  )
  const changed = insertChain
    .insertContent({
      type: 'footnoteReference',
      attrs: {
        'data-fn-id': footnote.id,
        caption: footnote.caption,
      },
    })
    .run()

  if (!changed) {
    return { changed: false, target, mode: 'insert_footnote' }
  }

  const footnoteNode = findNodeByAttr(
    editor.state.doc,
    'footnote',
    'data-fn-id',
    footnote.id,
  )

  if (footnoteNode?.node && footnote.hasExplicitContent) {
    const from = footnoteNode.pos + 1
    const to = footnoteNode.pos + footnoteNode.node.nodeSize - 1
    editor.chain().insertContentAt({ from, to }, footnote.content).run()
  }

  return {
    changed: true,
    target,
    mode: 'insert_footnote',
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
    migrateAiMathContent(editor)
    return { changed: true, target, mode }
  }

  const range = resolveActionSelectionRange(context)
  if (!range || range.from === undefined || range.to === undefined) {
    return applyAiPatch({ ...patch, target: 'document' }, 'document', context)
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

  migrateAiMathContent(editor)
  return { changed: true, target, mode }
}

const applyCitationWithFootnoteAction = async (
  action,
  fallbackScope,
  context,
) => {
  const editor = resolveValue(context.editor)
  if (!editor) {
    return { changed: false }
  }

  const target = action.target || fallbackScope
  const citation = normalizeCitationPayload(action.citation)
  const footnote = normalizeFootnotePayload(action.footnote)
  if (!citation && !footnote) {
    return { changed: false, target, mode: 'insert_citation_with_footnote' }
  }

  let citationChanged = false
  if (citation) {
    const actionSelectionRange = resolveActionSelectionRange(context)
    const citationPatch = {
      type: 'patch',
      target,
      mode: resolveCitationPatchMode(action, actionSelectionRange),
      format: citation.format,
      content: citation.content,
    }
    const citationResult = applyAiPatch(citationPatch, fallbackScope, context)
    citationChanged = !!citationResult?.changed
  }

  let footnoteChanged = false
  if (footnote) {
    const currentSelectionRange = getSelectionSnapshot(
      editor,
      context.selectionRange,
    )
    const footnoteResult = applyFootnoteAction(
      {
        type: 'insert_footnote',
        target: citationChanged ? 'selection' : target,
        position: citationChanged ? 'after' : action.position,
        footnote,
      },
      citationChanged ? 'selection' : fallbackScope,
      {
        ...context,
        selectionRange: currentSelectionRange,
        selectionAnchor: citationChanged ? null : context.selectionAnchor,
      },
    )
    footnoteChanged = !!footnoteResult?.changed
  }

  return {
    changed: citationChanged || footnoteChanged,
    target,
    mode: 'insert_citation_with_footnote',
  }
}

const applyAiAction = async (action, fallbackScope, context) => {
  if (!action || typeof action !== 'object') {
    return { changed: false }
  }
  if (action.type === 'insert_echarts') {
    return applyEchartsAction(action, fallbackScope, context)
  }
  if (action.type === 'insert_math') {
    return applyMathAction(action, fallbackScope, context)
  }
  if (action.type === 'insert_mermaid') {
    return applyMermaidAction(action, fallbackScope, context)
  }
  if (action.type === 'insert_diagrams') {
    return applyDiagramsAction(action, fallbackScope, context)
  }
  if (action.type === 'insert_citation_with_footnote') {
    return applyCitationWithFootnoteAction(action, fallbackScope, context)
  }
  if (action.type === 'insert_footnote') {
    return applyFootnoteAction(action, fallbackScope, context)
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
  let currentSelectionAnchor = context.selectionAnchor || null

  for (const action of actions) {
    const result = await applyAiAction(action, fallbackScope, {
      ...context,
      selectionRange: currentSelectionRange,
      selectionAnchor: currentSelectionAnchor,
    })
    results.push(result)

    if (result?.changed && action?.target !== 'document' && editor) {
      currentSelectionRange = getSelectionSnapshot(
        editor,
        currentSelectionRange,
      )
      currentSelectionAnchor = null
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
