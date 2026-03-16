import { contentTransform } from '@/utils/content-transform'
import { svgToDataURL } from '@/utils/file'
import { shortId } from '@/utils/short-id'

const CHART_ACTION_TYPES = new Set(['insert_echarts', 'insert_chart'])
const MATH_ACTION_TYPES = new Set([
  'insert_math',
  'insert_formula',
  'insert_equation',
])
const MERMAID_ACTION_TYPES = new Set(['insert_mermaid'])
const DIAGRAM_ACTION_TYPES = new Set(['insert_diagrams', 'insert_diagram'])
const FLOWCHART_ACTION_TYPES = new Set([
  'insert_flowchart',
  'insert_flow_chart',
])
const NODE_INSERT_ACTION_TYPES = new Set([
  'insert_echarts',
  'insert_math',
  'insert_mermaid',
  'insert_diagrams',
])
const DEFAULT_AI_API_URL = '/api/ai/generate'
const DEFAULT_AI_TEMPERATURE = 0.6
const DEFAULT_AI_MAX_OUTPUT_TOKENS = 12000

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

const looksLikeDataUrl = (value = '') => /^data:/i.test(value.trim())

const looksLikeSvgMarkup = (value = '') => value.trim().startsWith('<svg')

const looksLikeMermaidSource = (value = '') => {
  return /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|sankey-beta|xychart-beta|architecture-beta|block-beta|packet-beta)\b/im.test(
    value.trim(),
  )
}

const toPositiveNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const match = `${value}`.match(/-?\d+(\.\d+)?/)
  const next = Number.parseFloat(match?.[0] || '')
  return Number.isFinite(next) && next > 0 ? next : null
}

const getActionType = (action) => action?.type || action?.kind || ''

export const buildAiSystemPrompt = () => {
  return [
    '你是一个富文本编辑器的文档改写助手。',
    '你的任务是根据用户要求修改文档，或者生成可以直接插入文档的节点。',
    '你必须只返回 JSON，不要返回 Markdown 代码块，不要返回解释，不要返回前后说明。',
    '返回格式必须是：{"message":"给用户的简短说明","actions":[...]}。',
    'actions 支持以下类型：',
    '1. replace_document: 用新的完整 HTML 替换全文，字段包含 type、content、format。',
    '2. replace_selection: 用 HTML 替换当前选区，字段包含 type、content、format。',
    '3. insert_echarts: 插入 ECharts 图表节点，字段包含 type、target、chart。',
    '4. insert_math: 插入公式节点，字段包含 type、target、math。math 可以是 LaTeX 字符串，或对象 { latex, displayMode }。',
    '5. insert_mermaid: 插入 Mermaid 节点，字段包含 type、target、mermaid。mermaid 可以是字符串源码，或对象 { content, config, width, height }。',
    '6. insert_diagrams: 插入流程图节点，字段包含 type、target、diagram。diagram 需要提供可直接显示的 src，建议同时提供 content、width、height。',
    '如果用户要求“生成图表/可视化/趋势图/柱状图/饼图/折线图”，优先返回 insert_echarts。',
    '如果用户要求插入公式、数学表达式、LaTeX，请返回 insert_math，并提供合法 LaTeX。',
    '不要把独立公式作为普通文本写进 replace_document 或 replace_selection 的 content 里，除非用户明确要求保留 LaTeX 原文。',
    '如果公式必须出现在文本改写内容中，行内公式请用 $...$ 包裹，独立公式请用 $$...$$ 包裹。',
    '如果用户要求插入流程图、时序图、类图、状态图、甘特图，优先返回 insert_mermaid，并提供合法 Mermaid 源码。',
    '只有当你能提供可直接渲染的 diagrams 数据时，才使用 insert_diagrams；否则优先使用 insert_mermaid。',
    '如果用户既要求改写文档又要求插入节点，可以返回多个 actions，按执行顺序排列。',
    '文本改写时保留原有标题、列表、表格、强调等结构，除非用户明确要求调整。',
    '除 JSON 外不要输出任何其他内容。',
  ].join('\n')
}

export const buildAiPrompt = ({
  prompt,
  scope,
  selection = {},
  document = {},
}) => {
  const hasSelection = !!selection.text?.trim()
  const effectiveScope = scope === 'selection' && hasSelection ? '选区' : '全文'
  return [
    `用户要求：${prompt}`,
    '',
    `修改范围：${effectiveScope}`,
    hasSelection
      ? `当前选区文本：\n${selection.text.trim()}`
      : '当前没有有效选区，请基于全文处理。',
    '',
    '请根据用户要求返回前面约定的 JSON。',
    '如果只是文本改写，请返回 replace_document 或 replace_selection。',
    '如果需要在文档中展示 ECharts 图表，请返回 insert_echarts，并提供可直接渲染的 chartOptions。',
    '如果需要插入公式，请返回 insert_math，并提供合法 LaTeX；独立公式优先使用 displayMode=true，不要把独立公式当普通文本返回。',
    '如果公式必须出现在文本内容里，行内公式请写成 $...$，独立公式请写成 $$...$$。',
    '如果需要插入流程图、时序图、类图或其他 Mermaid 图，请返回 insert_mermaid，并提供合法 Mermaid 源码。',
    '如果确实要输出 diagrams 节点，请返回 insert_diagrams，并确保 diagram.src 可直接展示；做不到时请改用 insert_mermaid。',
    '图表或图形的数据请优先从当前选区文本、全文文本、表格或列表中提取；如果数据不完整，可以做合理补全，但要保证节点可展示。',
    '如果是选区修改，只调整选区相关内容，文档其他部分保持原状。',
    '',
    '<current-document-text>',
    document.text || '',
    '</current-document-text>',
    '',
    '<current-document-html>',
    document.html || '<p></p>',
    '</current-document-html>',
  ].join('\n')
}

const resolveAiOptionValue = (value, payload, fallback) => {
  const next = typeof value === 'function' ? value(payload) : value
  return next ?? fallback
}

const toFiniteNumber = (value) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

const stripCodeFence = (value = '') => {
  return value
    .trim()
    .replace(/^```(?:json|html)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

const isEscapedQuote = (value = '', index = 0) => {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (value[cursor] !== '\\') {
      break
    }
    slashCount += 1
  }
  return slashCount % 2 === 1
}

const repairJsonString = (value = '') => {
  let result = ''
  let inString = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const next = value[index + 1]

    if (char === '"' && !isEscapedQuote(value, index)) {
      inString = !inString
      result += char
      continue
    }

    if (!inString || char !== '\\') {
      result += char
      continue
    }

    const isValidEscape =
      next === '"' ||
      next === '\\' ||
      next === '/' ||
      next === 'b' ||
      next === 'f' ||
      next === 'n' ||
      next === 'r' ||
      next === 't' ||
      next === 'u'

    result += isValidEscape ? char : '\\\\'
  }

  return result
}

const tryParseJson = (value = '') => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const parseAiJson = (value = '') => {
  const normalized = stripCodeFence(value)
  if (!normalized) {
    return null
  }
  const attempts = [normalized]
  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    attempts.push(normalized.slice(start, end + 1))
  }
  for (const item of attempts) {
    const direct = tryParseJson(item)
    if (direct) {
      return direct
    }
    const repaired = tryParseJson(repairJsonString(item))
    if (repaired) {
      return repaired
    }
  }
  return null
}

const looksLikeAiJson = (value = '') => {
  const normalized = stripCodeFence(value)
  if (!normalized.startsWith('{')) {
    return false
  }
  return /"(message|actions|action|content|html|text)"/.test(normalized)
}

const parseAiError = async (response) => {
  try {
    const text = await response.text()
    const data = tryParseJson(text)
    if (data && typeof data === 'object') {
      return data.message || data.error || text || `HTTP ${response.status}`
    }
    return text || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

const resolveAiScope = (payload = {}) => {
  const hasSelection = !!payload.selection?.text?.trim()
  return payload.scope === 'selection' && hasSelection ? 'selection' : 'document'
}

const getAiSuccessMessage = (scope, config = {}) => {
  return isZh(config)
    ? scope === 'selection'
      ? '已通过本地 AI 服务完成选区修改。'
      : '已通过本地 AI 服务完成全文修改。'
    : scope === 'selection'
      ? 'Updated the current selection with the AI service.'
      : 'Updated the full document with the AI service.'
}

const hasChartPayload = (value = {}) => {
  return !!(
    value.chart ||
    value.chartOptions ||
    value.options ||
    value.option
  )
}

const hasStructuredTextPayload = (value = {}) => {
  return (
    value.text !== undefined &&
    (value.message ||
      value.reply ||
      value.answer ||
      value.format ||
      value.target ||
      value.mode ||
      value.operation ||
      value.applyMode ||
      value.apply !== undefined ||
      value.autoApply !== undefined)
  )
}

const toStructuredAiResponse = (value, scope, config = {}) => {
  if (!value || typeof value !== 'object') {
    return null
  }

  if (Array.isArray(value.actions) || value.action) {
    return value
  }

  if (hasChartPayload(value)) {
    return {
      message:
        value.message ||
        (scope === 'selection'
          ? isZh(config)
            ? '已根据当前选区插入图表。'
            : 'Inserted a chart for the current selection.'
          : isZh(config)
            ? '已在文档中插入图表。'
            : 'Inserted a chart into the document.'),
      actions: [
        {
          type: 'insert_echarts',
          target: scope,
          chart: value.chart || value,
        },
      ],
    }
  }

  if (
    value.content !== undefined ||
    value.html !== undefined ||
    hasStructuredTextPayload(value)
  ) {
    return {
      message: value.message || getAiSuccessMessage(scope, config),
      actions: [
        {
          type: scope === 'selection' ? 'replace_selection' : 'replace_document',
          content: value.content ?? value.html ?? value.text,
          format:
            value.format ||
            (value.html !== undefined ? 'html' : 'text'),
        },
      ],
    }
  }

  return null
}

const buildAiFallbackResponse = (content, scope, config = {}) => {
  if (!content) {
    return {
      message: isZh(config)
        ? 'AI 没有返回可用内容。'
        : 'AI did not return usable content.',
      actions: [],
    }
  }

  return {
    message: getAiSuccessMessage(scope, config),
    actions: [
      {
        type: scope === 'selection' ? 'replace_selection' : 'replace_document',
        content,
        format: content.startsWith('<') ? 'html' : 'text',
      },
    ],
  }
}

const normalizeAiServiceResponse = (rawResponse, payload, config = {}) => {
  const scope = resolveAiScope(payload)

  if (
    rawResponse &&
    typeof rawResponse === 'object' &&
    !Array.isArray(rawResponse)
  ) {
    const directResponse = toStructuredAiResponse(rawResponse, scope, config)
    if (directResponse) {
      return directResponse
    }
  }

  const rawText =
    typeof rawResponse === 'string'
      ? rawResponse
      : typeof rawResponse?.text === 'string'
        ? rawResponse.text
        : ''
  const parsed = parseAiJson(rawText)

  if (parsed && typeof parsed === 'object') {
    const directResponse = toStructuredAiResponse(parsed, scope, config)
    if (directResponse) {
      return directResponse
    }

    if (
      parsed.text &&
      typeof parsed.text === 'string' &&
      parsed.text !== rawText
    ) {
      return normalizeAiServiceResponse(parsed.text, payload, config)
    }

    return parsed
  }

  const content = stripCodeFence(rawText)
  if (looksLikeAiJson(content)) {
    throw new Error(
      isZh(config)
        ? 'AI 返回了无法解析的 JSON，请重试。'
        : 'AI returned malformed JSON. Please try again.',
    )
  }

  return buildAiFallbackResponse(content, scope, config)
}

const buildAiRequestBody = (payload, config = {}) => {
  const prompt = resolveAiOptionValue(config.prompt, payload, buildAiPrompt(payload))
  const system = resolveAiOptionValue(
    config.system,
    payload,
    buildAiSystemPrompt(),
  )

  return {
    prompt: typeof prompt === 'string' ? prompt : `${prompt ?? ''}`,
    system: typeof system === 'string' ? system : `${system ?? ''}`,
    temperature:
      toFiniteNumber(config.temperature) ?? DEFAULT_AI_TEMPERATURE,
    maxOutputTokens:
      toFiniteNumber(config.maxOutputTokens) ?? DEFAULT_AI_MAX_OUTPUT_TOKENS,
  }
}

export const canUseAiChat = (config = {}) => {
  if (typeof config?.onChat === 'function') {
    return true
  }
  const apiUrl = `${config?.apiUrl || config?.url || DEFAULT_AI_API_URL}`.trim()
  return apiUrl.length > 0
}

export const callLocalAiService = async (payload, config = {}) => {
  const apiUrl = `${config.apiUrl || config.url || DEFAULT_AI_API_URL}`.trim()
  const response = await fetch(apiUrl || DEFAULT_AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildAiRequestBody(payload, config)),
  })

  if (!response.ok) {
    throw new Error(await parseAiError(response))
  }

  const rawResponse = await response.text()
  const parsedResponse = parseAiJson(rawResponse) ?? tryParseJson(rawResponse)

  return normalizeAiServiceResponse(
    parsedResponse ?? rawResponse,
    payload,
    config,
  )
}

export const requestAiChat = async (payload, config = {}) => {
  if (typeof config?.onChat === 'function') {
    return await config.onChat(payload)
  }
  if (!canUseAiChat(config)) {
    throw new Error(
      isZh(config)
        ? 'AI 服务未配置，请设置 ai.apiUrl 或 ai.onChat。'
        : 'AI service is not configured. Please set ai.apiUrl or ai.onChat.',
    )
  }
  return await callLocalAiService(payload, config)
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

const getPlainTextFromHtml = (value = '') => {
  if (!value || typeof value !== 'string') {
    return ''
  }
  if (typeof DOMParser === 'undefined') {
    return ''
  }

  try {
    const doc = new DOMParser().parseFromString(value, 'text/html')
    const { body } = doc
    if (!body) {
      return ''
    }
    const elements = Array.from(body.children)
    if (elements.length > 1) {
      return ''
    }
    if (elements.length === 1 && elements[0].children.length > 0) {
      return ''
    }
    return body.textContent?.trim() || ''
  } catch {
    return ''
  }
}

const unwrapMathDelimiters = (value = '') => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const matchers = [
    {
      regex: /^\$\$([\s\S]+)\$\$$/,
      displayMode: true,
    },
    {
      regex: /^\\\[([\s\S]+)\\\]$/,
      displayMode: true,
    },
    {
      regex: /^\$([^$]+)\$$/,
      displayMode: false,
    },
    {
      regex: /^\\\(([\s\S]+)\\\)$/,
      displayMode: false,
    },
  ]

  for (const { regex, displayMode } of matchers) {
    const match = trimmed.match(regex)
    if (match?.[1]?.trim()) {
      return {
        latex: match[1].trim(),
        displayMode,
      }
    }
  }

  return null
}

const looksLikePlainMathExpression = (value = '') => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 240) {
    return false
  }
  if (/[。！？；，、]/.test(trimmed)) {
    return false
  }
  if (/^(https?:\/\/|\/|[A-Za-z]:\\)/.test(trimmed)) {
    return false
  }

  const hasLatexCommand = /\\[A-Za-z]+/.test(trimmed)
  const operatorCount = (trimmed.match(/[=+\-*/^_<>]/g) || []).length
  const hasMathStructure = /[{}[\]^_]/.test(trimmed)
  const hasIdentifier = /[\dA-Za-z\u03B1-\u03C9\u0391-\u03A9]/.test(trimmed)
  const cleanedWords = trimmed.replace(/\\[A-Za-z]+/g, ' ')
  const longWords = cleanedWords.match(/[A-Za-z]{4,}/g) || []

  if (!hasIdentifier || longWords.length >= 2) {
    return false
  }

  return (
    (hasLatexCommand && (operatorCount >= 1 || hasMathStructure)) ||
    ((hasMathStructure || trimmed.includes('=')) && operatorCount >= 2)
  )
}

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
  return ''
}

const normalizePatchAction = (patch, fallbackScope) => {
  if (!patch || typeof patch !== 'object') {
    return null
  }
  const format = inferPatchFormat(patch)
  const target = patch.target || fallbackScope
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

const normalizeMathAction = (action, fallbackScope) => {
  const hasStructuredMath =
    action.math !== undefined ||
    action.formula !== undefined ||
    action.equation !== undefined
  return {
    type: 'insert_math',
    target: action.target || fallbackScope,
    position: action.position || 'after',
    math: hasStructuredMath
      ? action.math ?? action.formula ?? action.equation
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
    target: action.target || fallbackScope,
    position: action.position || 'after',
    mermaid: hasStructuredMermaid
      ? action.mermaid ?? action.mermaidNode
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
    target: action.target || fallbackScope,
    position: action.position || 'after',
    diagram: hasStructuredDiagram
      ? action.diagram ?? action.diagrams ?? action.flowchart
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
  const target = action.target || targetMap[type] || fallbackScope
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
    ({ displayMode } = normalizedMath)
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

  const {tr} = editor.state
  replacements
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to, latex }) => {
      const $from = tr.doc.resolve(from)
      const {parent} = $from
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
      if (
        text[end] === '$' &&
        text[end - 1] !== '$' &&
        text[end + 1] !== '$'
      ) {
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

  const {tr} = editor.state
  replacements
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to, latex }) => {
      const $from = tr.doc.resolve(from)
      const {parent} = $from
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
    height:
      toPositiveNumber(normalizedDiagram.height) || svgDimensions.height,
  }
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
    const svg = typeof renderResult === 'string' ? renderResult : renderResult?.svg
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
  const attrs = normalizeEchartsAttrs(action.chart)
  if (!attrs) {
    return { changed: false, target, mode: 'insert_echarts' }
  }

  focusInsertTarget(
    editor,
    target,
    action.position || 'after',
    context.selectionRange,
  ).run()

  const changed = editor.commands.setEcharts(attrs)
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
  const math = normalizeMathPayload(action.math)
  if (!math) {
    return { changed: false, target, mode: 'insert_math' }
  }

  const displayMode =
    typeof math.displayMode === 'boolean'
      ? math.displayMode
      : !(target === 'selection' && action.position === 'replace')
  const changed = displayMode
    ? focusInsertTarget(
        editor,
        target,
        action.position || 'after',
        context.selectionRange,
      )
        .insertBlockMath({ latex: math.latex })
        .run()
    : focusInsertTarget(
        editor,
        target,
        action.position || 'after',
        context.selectionRange,
      )
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

  const changed = focusInsertTarget(
    editor,
    target,
    action.position || 'after',
    context.selectionRange,
  )
    .setImage({
      id: shortId(10),
      type: 'mermaid',
      src,
      config: JSON.stringify(mermaid.config || {}),
      content: mermaid.content,
      width: mermaid.width || rendered?.width || 640,
      height: mermaid.height || rendered?.height || 360,
      equalProportion: false,
    })
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
  const diagram = normalizeDiagramsPayload(action.diagram)
  if (!diagram) {
    return { changed: false, target, mode: 'insert_diagrams' }
  }

  const changed = focusInsertTarget(
    editor,
    target,
    action.position || 'after',
    context.selectionRange,
  )
    .setImage({
      id: shortId(10),
      type: 'diagrams',
      src: diagram.src,
      content: diagram.content || diagram.src,
      width: diagram.width || 640,
      height: diagram.height || 360,
      equalProportion: false,
    })
    .run()

  return {
    changed: !!changed,
    target,
    mode: 'insert_diagrams',
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

  migrateAiMathContent(editor)
  return { changed: true, target, mode }
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
      !NODE_INSERT_ACTION_TYPES.has(action?.type) &&
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
