import {
  buildAiPrompt,
  buildAiSystemPrompt,
  resolveAiOutputSchema,
} from './prompts'
import {
  DEFAULT_AI_API_URL,
  DEFAULT_AI_MAX_OUTPUT_TOKENS,
  getAiAttachments,
  isZh,
  parseAiJson,
  resolveAiEndpoint,
  resolveAiOptionValue,
  resolveAiOutputMode,
  shouldUseAiStream,
  stripCodeFence,
  toFiniteNumber,
  tryParseJson,
} from './shared'

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
  const hasSelection =
    payload.selection?.empty === false || !!payload.selection?.text?.trim()
  return payload.scope === 'selection' && hasSelection
    ? 'selection'
    : 'document'
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
  return !!(value.chart || value.chartOptions || value.options || value.option)
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
          type:
            scope === 'selection' ? 'replace_selection' : 'replace_document',
          content: value.content ?? value.html ?? value.text,
          format: value.format || (value.html !== undefined ? 'html' : 'text'),
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
  const structuredResponse =
    rawResponse?.object && typeof rawResponse.object === 'object'
      ? rawResponse.object
      : rawResponse?.output && typeof rawResponse.output === 'object'
        ? rawResponse.output
        : rawResponse

  if (
    structuredResponse &&
    typeof structuredResponse === 'object' &&
    !Array.isArray(structuredResponse)
  ) {
    const directResponse = toStructuredAiResponse(
      structuredResponse,
      scope,
      config,
    )
    if (directResponse) {
      return directResponse
    }
  }

  const rawText =
    typeof structuredResponse === 'string'
      ? structuredResponse
      : typeof structuredResponse?.text === 'string'
        ? structuredResponse.text
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
  const prompt = resolveAiOptionValue(
    config.prompt,
    payload,
    buildAiPrompt(payload),
  )
  const system = resolveAiOptionValue(
    config.system,
    payload,
    buildAiSystemPrompt(),
  )
  const outputSchema = resolveAiOutputSchema(config, payload)

  return {
    prompt: typeof prompt === 'string' ? prompt : `${prompt ?? ''}`,
    system: typeof system === 'string' ? system : `${system ?? ''}`,
    maxOutputTokens:
      toFiniteNumber(config.maxOutputTokens) ?? DEFAULT_AI_MAX_OUTPUT_TOKENS,
    outputMode: resolveAiOutputMode(config),
    stream: shouldUseAiStream(config),
    outputSchema,
  }
}

const buildAiRequestInit = (payload, config = {}) => {
  const body = buildAiRequestBody(payload, config)
  const attachments = getAiAttachments(payload)

  if (!attachments.length) {
    return {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  }

  const formData = new FormData()
  formData.append('prompt', body.prompt)
  formData.append('system', body.system)
  formData.append('maxOutputTokens', `${body.maxOutputTokens}`)
  formData.append('outputMode', body.outputMode)
  formData.append('stream', `${body.stream}`)
  if (body.outputSchema) {
    formData.append(
      'outputSchema',
      typeof body.outputSchema === 'string'
        ? body.outputSchema
        : JSON.stringify(body.outputSchema),
    )
  }

  attachments.forEach((attachment) => {
    if (!attachment.file) {
      return
    }
    formData.append('files', attachment.file, attachment.name)
  })

  return {
    headers: {},
    body: formData,
  }
}

const readResponseChunk = async (reader, decoder) => {
  const { done, value } = await reader.read()
  if (done) {
    return {
      done: true,
      chunk: decoder.decode(),
    }
  }
  return {
    done: false,
    chunk: decoder.decode(value, { stream: true }),
  }
}

const emitAiStreamText = async (handlers, text, delta) => {
  if (typeof handlers?.onText !== 'function' || !delta) {
    return
  }
  await handlers.onText(text, delta)
}

const isEventStreamResponse = (response) => {
  const contentType = response.headers.get('content-type') || ''
  return (
    contentType.includes('text/event-stream') ||
    response.headers.get('x-vercel-ai-ui-message-stream') === 'v1'
  )
}

const extractTextDeltaFromStreamPayload = (payload) => {
  if (!payload) {
    return ''
  }
  if (payload === '[DONE]') {
    return ''
  }

  const parsed = tryParseJson(payload)
  if (!parsed) {
    return payload
  }

  if (typeof parsed === 'string') {
    return parsed
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => extractTextDeltaFromStreamPayload(item))
      .join('')
  }

  if (typeof parsed.delta === 'string') {
    return parsed.delta
  }
  if (typeof parsed.text === 'string') {
    return parsed.text
  }
  if (typeof parsed.content === 'string') {
    return parsed.content
  }
  if (typeof parsed.token === 'string') {
    return parsed.token
  }
  if (typeof parsed.outputText === 'string') {
    return parsed.outputText
  }
  if (typeof parsed.response === 'string') {
    return parsed.response
  }
  if (Array.isArray(parsed.content)) {
    return parsed.content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        return item?.text || item?.content || item?.delta || item?.token || ''
      })
      .join('')
  }
  if (Array.isArray(parsed.choices)) {
    return parsed.choices
      .map((choice) => {
        if (typeof choice?.text === 'string') {
          return choice.text
        }
        if (typeof choice?.delta?.content === 'string') {
          return choice.delta.content
        }
        if (Array.isArray(choice?.delta?.content)) {
          return choice.delta.content
            .map((item) => item?.text || item?.content || '')
            .join('')
        }
        return ''
      })
      .join('')
  }
  return ''
}

const readTextStreamResponse = async (response, handlers = {}) => {
  if (!response.body) {
    return await response.text()
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''

  while (true) {
    const { done, chunk } = await readResponseChunk(reader, decoder)
    if (chunk) {
      text += chunk
      await emitAiStreamText(handlers, text, chunk)
    }
    if (done) {
      break
    }
  }

  return text
}

const flushSseEvent = async (lines, state, handlers = {}) => {
  if (!lines.length) {
    return
  }

  const eventName =
    lines
      .filter((line) => line.startsWith('event:'))
      .map((line) => line.slice(6).trim())
      .pop() || 'message'
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!data || data === '[DONE]') {
    return
  }

  const parsed = tryParseJson(data)

  if (eventName === 'error') {
    const message =
      parsed && typeof parsed === 'object'
        ? parsed.message || parsed.error
        : data
    state.error = message || data
    return
  }

  if (eventName === 'partial-object') {
    state.object = parsed?.data ?? parsed ?? state.object
    return
  }

  if (eventName === 'done') {
    if (parsed && typeof parsed === 'object' && parsed.output !== undefined) {
      state.object = parsed.output
    }
    return
  }

  const delta = extractTextDeltaFromStreamPayload(
    parsed?.text !== undefined ? parsed.text : (parsed ?? data),
  )
  if (!delta) {
    return
  }

  state.text += delta
  await emitAiStreamText(handlers, state.text, delta)
}

const readSseStreamResponse = async (response, handlers = {}) => {
  if (!response.body) {
    return await response.text()
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const state = { text: '', object: null, error: '' }
  let buffer = ''
  let eventLines = []

  while (true) {
    const { done, chunk } = await readResponseChunk(reader, decoder)
    if (chunk) {
      buffer += chunk
      let newlineIndex = buffer.indexOf('\n')
      while (newlineIndex !== -1) {
        const rawLine = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        const line = rawLine.replace(/\r$/, '')

        if (!line) {
          await flushSseEvent(eventLines, state, handlers)
          eventLines = []
        } else {
          eventLines.push(line)
        }

        newlineIndex = buffer.indexOf('\n')
      }
    }

    if (done) {
      break
    }
  }

  if (buffer) {
    eventLines.push(buffer.replace(/\r$/, ''))
  }
  await flushSseEvent(eventLines, state, handlers)

  if (state.error) {
    throw new Error(state.error)
  }

  return state.object ?? state.text
}

const readAiResponseText = async (response, config = {}, handlers = {}) => {
  if (!response.body) {
    return await response.text()
  }

  const prefersStream = shouldUseAiStream(config)
  if (!prefersStream && !isEventStreamResponse(response)) {
    return await response.text()
  }

  if (isEventStreamResponse(response)) {
    return await readSseStreamResponse(response, handlers)
  }

  return await readTextStreamResponse(response, handlers)
}

export const canUseAiChat = (config = {}) => {
  if (typeof config?.onChat === 'function') {
    return true
  }
  const apiUrl = resolveAiEndpoint(config)
  return apiUrl.length > 0
}

export const callLocalAiService = async (
  payload,
  config = {},
  handlers = {},
) => {
  const apiUrl = resolveAiEndpoint(config)
  const requestInit = buildAiRequestInit(payload, config)
  const response = await fetch(apiUrl || DEFAULT_AI_API_URL, {
    method: 'POST',
    ...requestInit,
  })

  if (!response.ok) {
    throw new Error(await parseAiError(response))
  }

  const rawResponse = await readAiResponseText(response, config, handlers)
  const parsedResponse =
    typeof rawResponse === 'string'
      ? (parseAiJson(rawResponse) ?? tryParseJson(rawResponse))
      : rawResponse

  return normalizeAiServiceResponse(
    parsedResponse ?? rawResponse,
    payload,
    config,
  )
}

export const requestAiChat = async (payload, config = {}, handlers = {}) => {
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
  return await callLocalAiService(payload, config, handlers)
}
