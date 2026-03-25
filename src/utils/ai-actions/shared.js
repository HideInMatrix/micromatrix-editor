import { contentTransform } from '@/utils/content-transform'
import { svgToDataURL } from '@/utils/file'
import { shortId } from '@/utils/short-id'

export { contentTransform, shortId, svgToDataURL }

export const CHART_ACTION_TYPES = new Set(['insert_echarts', 'insert_chart'])
export const MATH_ACTION_TYPES = new Set([
  'insert_math',
  'insert_formula',
  'insert_equation',
])
export const MERMAID_ACTION_TYPES = new Set(['insert_mermaid'])
export const DIAGRAM_ACTION_TYPES = new Set([
  'insert_diagrams',
  'insert_diagram',
])
export const CITATION_FOOTNOTE_ACTION_TYPES = new Set([
  'insert_citation_with_footnote',
  'insert_citation_footnote',
  'insert_source_citation',
])
export const FOOTNOTE_ACTION_TYPES = new Set([
  'insert_footnote',
  'insert_footnote_reference',
])
export const FLOWCHART_ACTION_TYPES = new Set([
  'insert_flowchart',
  'insert_flow_chart',
])

export const DEFAULT_AI_API_URL = '/api/ai/generate'
export const DEFAULT_AI_MAX_OUTPUT_TOKENS = 12000
export const DEFAULT_AI_OUTPUT_MODE = 'sync'
export const ECHARTS_STAT_TRANSFORM_TYPES = [
  'regression',
  'histogram',
  'clustering',
]
export const AI_RESPONSE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    message: {
      type: 'string',
    },
    autoApply: {
      type: 'boolean',
    },
    autoSave: {
      type: 'boolean',
    },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          type: {
            type: 'string',
          },
        },
        required: ['type'],
      },
    },
  },
  required: ['message', 'actions'],
}

export const resolveValue = (value) => value?.value ?? value

export const getLocale = (config = {}) => {
  if (config.locale) {
    return config.locale
  }
  const options = resolveValue(config.options)
  return options?.locale || 'zh-CN'
}

export const resolveAiOutputMode = (config = {}) => {
  return config.outputMode === 'stream' ? 'stream' : DEFAULT_AI_OUTPUT_MODE
}

export const shouldUseAiStream = (config = {}) => {
  return resolveAiOutputMode(config) === 'stream'
}

export const resolveAiEndpoint = (config = {}) => {
  return `${config.apiUrl || config.url || DEFAULT_AI_API_URL}`.trim()
}

export const isZh = (config = {}) => getLocale(config) === 'zh-CN'

export const clampPosition = (editor, position) => {
  const max = editor?.state?.doc?.content?.size ?? 0
  const next = Number(position)
  if (!Number.isFinite(next)) {
    return 0
  }
  return Math.min(Math.max(next, 0), max)
}

export const looksLikeDataUrl = (value = '') => /^data:/i.test(value.trim())

export const looksLikeSvgMarkup = (value = '') =>
  value.trim().startsWith('<svg')

export const looksLikeMermaidSource = (value = '') => {
  return /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|sankey-beta|xychart-beta|architecture-beta|block-beta|packet-beta)\b/im.test(
    value.trim(),
  )
}

export const toPositiveNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const match = `${value}`.match(/-?\d+(\.\d+)?/)
  const next = Number.parseFloat(match?.[0] || '')
  return Number.isFinite(next) && next > 0 ? next : null
}

export const getActionType = (action) => action?.type || action?.kind || ''

export const isFileLike = (value) => {
  return typeof File !== 'undefined' && value instanceof File
}

export const normalizeAiAttachment = (attachment, index = 0) => {
  if (!attachment) {
    return null
  }

  const file = isFileLike(attachment)
    ? attachment
    : isFileLike(attachment.file)
      ? attachment.file
      : null
  const name = attachment.name || file?.name || `attachment-${index + 1}`
  const type = attachment.type || file?.type || ''
  const size = Number.isFinite(attachment.size)
    ? attachment.size
    : file?.size || 0
  const lastModified = Number.isFinite(attachment.lastModified)
    ? attachment.lastModified
    : file?.lastModified || null

  if (!file && !name) {
    return null
  }

  return {
    id: attachment.id || `attachment-${index + 1}`,
    file,
    name,
    type,
    size,
    lastModified,
  }
}

export const getAiAttachments = (payload = {}) => {
  if (!Array.isArray(payload.attachments)) {
    return []
  }
  return payload.attachments
    .map((attachment, index) => normalizeAiAttachment(attachment, index))
    .filter(Boolean)
}

export const getAiAttachmentMetas = (payload = {}) => {
  return getAiAttachments(payload).map(
    ({ id, name, type, size, lastModified }) => ({
      id,
      name,
      type,
      size,
      lastModified,
    }),
  )
}

export const formatAiAttachmentPromptLine = (attachment, index) => {
  const type = attachment.type || 'unknown'
  const size = Number.isFinite(attachment.size)
    ? `${attachment.size} bytes`
    : 'unknown size'
  return `${index + 1}. ${attachment.name}（type: ${type}, size: ${size}）`
}

export const resolveAiOptionValue = (value, payload, fallback) => {
  const next = typeof value === 'function' ? value(payload) : value
  return next ?? fallback
}

export const toFiniteNumber = (value) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

export const stripCodeFence = (value = '') => {
  return value
    .trim()
    .replace(/^```(?:json|html)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

export const isEscapedQuote = (value = '', index = 0) => {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (value[cursor] !== '\\') {
      break
    }
    slashCount += 1
  }
  return slashCount % 2 === 1
}

export const repairEchartsStatTransformType = (value = '') => {
  if (!value) {
    return value
  }

  return value.replace(
    new RegExp(
      `""\\s*ecStat"\\s*:\\s*(${ECHARTS_STAT_TRANSFORM_TYPES.join('|')})"`,
      'g',
    ),
    '"ecStat:$1"',
  )
}

export const repairJsonString = (value = '') => {
  const normalizedValue = repairEchartsStatTransformType(value)
  let result = ''
  let inString = false

  for (let index = 0; index < normalizedValue.length; index += 1) {
    const char = normalizedValue[index]
    const next = normalizedValue[index + 1]

    if (char === '"' && !isEscapedQuote(normalizedValue, index)) {
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

export const tryParseJson = (value = '') => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const parseAiJson = (value = '') => {
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

export const normalizeObjectInput = (value) => {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    return parseAiJson(value) ?? tryParseJson(repairJsonString(value))
  }
  if (typeof value === 'object') {
    return value
  }
  return null
}

export const inferPatchFormat = (patch) => {
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

export const getPatchContent = (patch, format) => {
  if (patch?.content !== undefined) {
    return patch.content
  }
  return patch?.[format]
}

export const normalizePatchContent = (content, format, target) => {
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

export const getPlainTextFromHtml = (value = '') => {
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

export const unwrapMathDelimiters = (value = '') => {
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

export const looksLikePlainMathExpression = (value = '') => {
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
