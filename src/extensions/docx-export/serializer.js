import { createNodeSerializers } from './serializers'
import { cmToPixels } from '@/extensions/pages/utils'
import { loadResource } from '@/utils/load-resource'
import {
  calbaseConfigData,
  calbaseConfigOptions,
} from '@/extensions/echarts/cal-service'

let docxLoader = null
let echartsLoader = null
let katexLoader = null
let domToImageLoader = null
let mathConverterLoader = null

const DEFAULT_TEXT_COLOR = '333639'
const DEFAULT_FONT_SIZE = 21
const DEFAULT_IMAGE_WIDTH = 480
const DEFAULT_IMAGE_HEIGHT = 320
const DEFAULT_PAGE_MARGIN_CM = {
  top: 2.54,
  right: 3.18,
  bottom: 2.54,
  left: 3.18,
}
const DEFAULT_PAGE_SIZE_CM = {
  width: 21,
  height: 29.7,
}

const loadDocx = async () => {
  if (!docxLoader) {
    docxLoader = import('docx')
  }
  return await docxLoader
}

const loadKatex = async () => {
  if (!katexLoader) {
    katexLoader = import('katex').then((module) => module.default || module)
  }
  return await katexLoader
}

const loadDomToImage = async () => {
  if (!domToImageLoader) {
    domToImageLoader = import('dom-to-image-more').then(
      (module) => module.default || module,
    )
  }
  return await domToImageLoader
}

const loadMathConverter = async () => {
  if (!mathConverterLoader) {
    mathConverterLoader = import('@micromatrix.org/docx-math-converter')
      .then(async (module) => {
        if (typeof module?.mathJaxReady === 'function') {
          await module.mathJaxReady()
        }
        return module
      })
      .catch((error) => {
        mathConverterLoader = null
        throw error
      })
  }
  return await mathConverterLoader
}

const ensureArray = (value) => {
  return Array.isArray(value) ? value : []
}

const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max)
}

const cmToTwip = (value) => {
  const numeric = Number.parseFloat(`${value || 0}`)
  if (!Number.isFinite(numeric)) {
    return undefined
  }
  return Math.round(numeric * 567)
}

const pxToTwip = (value) => {
  const numeric = Number.parseFloat(`${value || 0}`)
  if (!Number.isFinite(numeric)) {
    return undefined
  }
  return Math.round(numeric * 15)
}

const fontSizeToHalfPoints = (value) => {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }

  const text = `${value}`.trim()
  if (!text) {
    return undefined
  }

  if (text.endsWith('pt')) {
    const point = Number.parseFloat(text)
    return Number.isFinite(point) ? Math.round(point * 2) : undefined
  }

  if (text.endsWith('px')) {
    const pixel = Number.parseFloat(text)
    return Number.isFinite(pixel) ? Math.round(pixel * 1.5) : undefined
  }

  const numeric = Number.parseFloat(text)
  return Number.isFinite(numeric) ? Math.round(numeric) : undefined
}

const parseColorToHex = (value) => {
  if (!value || typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  if (!normalized || normalized === 'transparent') {
    return undefined
  }

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1)
    if (hex.length === 3) {
      return hex
        .split('')
        .map((item) => item + item)
        .join('')
        .toUpperCase()
    }
    if (hex.length === 6) {
      return hex.toUpperCase()
    }
    return undefined
  }

  const rgbMatch = normalized.match(
    /rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+)?\s*\)/i,
  )
  if (!rgbMatch) {
    return undefined
  }

  return rgbMatch
    .slice(1, 4)
    .map((item) => {
      const value = clamp(Number.parseInt(item, 10), 0, 255)
      return value.toString(16).padStart(2, '0')
    })
    .join('')
    .toUpperCase()
}

const pickFirstText = (node, keys = []) => {
  for (const key of keys) {
    const value = node?.attrs?.[key]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }
  return ''
}

const extractCellText = (node) => {
  const target = `${node?.attrs?.target || 'checkbox'}`.toLowerCase()
  return ensureArray(node?.attrs?.items)
    .map((item) => {
      const checked =
        target === 'radio'
          ? item?.checked
            ? '(*)'
            : '( )'
          : item?.checked
            ? '[x]'
            : '[ ]'
      return `${checked} ${item?.label || ''}`.trim()
    })
    .join(' ')
}

const getNodeText = (node) => {
  if (!node) {
    return ''
  }

  switch (node.type) {
    case 'text':
      return node.text || ''
    case 'inlineMath':
    case 'blockMath':
      return node?.attrs?.latex || ''
    case 'optionBox':
      return extractCellText(node)
    case 'footnoteReference':
      return `[${node?.attrs?.referenceNumber || '?'}]`
    case 'mention':
      return `@${node?.attrs?.label || node?.attrs?.id || ''}`
    case 'datetime':
    case 'tag':
      return node?.attrs?.text || ''
    case 'image':
    case 'echarts':
    case 'file':
    case 'audio':
    case 'video':
    case 'iframe':
      return pickFirstText(node, [
        'describe',
        'name',
        'label',
        'content',
        'src',
      ])
    default:
      return ensureArray(node.content)
        .map((item) => getNodeText(item))
        .join('')
  }
}

const readMarginSpacing = (margin) => {
  if (!margin || typeof margin !== 'object') {
    return {}
  }

  return {
    before: pxToTwip(margin.top),
    after: pxToTwip(margin.bottom),
  }
}

const getParagraphSpacing = (attrs = {}, lineRuleType) => {
  const spacing = readMarginSpacing(attrs.margin)
  const lineHeight = Number.parseFloat(`${attrs.lineHeight || ''}`)
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    spacing.line = Math.round(lineHeight * 240)
    spacing.lineRule = lineRuleType.AUTO
  }

  Object.keys(spacing).forEach((key) => {
    if (spacing[key] === undefined) {
      delete spacing[key]
    }
  })

  return spacing
}

const getParagraphAlignment = (value, alignmentType) => {
  switch (value) {
    case 'center':
      return alignmentType.CENTER
    case 'right':
      return alignmentType.RIGHT
    case 'justify':
    case 'distributed':
      return alignmentType.JUSTIFIED
    default:
      return alignmentType.LEFT
  }
}

const createBorder = (borderStyle, color, size = 8, space = 1) => {
  return {
    color,
    size,
    space,
    style: borderStyle,
  }
}

const arrayBufferToUint8Array = (value) => {
  if (value instanceof Uint8Array) {
    return value
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }
  return new Uint8Array(0)
}

const blobToDataUrl = async (blob) => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result || '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

const dataUrlToUint8Array = (value) => {
  const [, data] = `${value}`.split(',')
  if (!data) {
    return new Uint8Array(0)
  }
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const loadImage = async (src) => {
  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = (error) => reject(error)
    image.src = src
  })
}

const getImageNaturalDimensions = async (src) => {
  try {
    const image = await loadImage(src)
    const width = Number(image?.naturalWidth || image?.width || 0)
    const height = Number(image?.naturalHeight || image?.height || 0)
    return {
      width: width > 0 ? width : undefined,
      height: height > 0 ? height : undefined,
    }
  } catch {
    return {}
  }
}

const rasterizeSvg = async (src, width, height) => {
  const image = await loadImage(src)
  const canvas = document.createElement('canvas')
  const exportWidth = Math.max(
    1,
    Math.round(width || image.naturalWidth || DEFAULT_IMAGE_WIDTH),
  )
  const exportHeight = Math.max(
    1,
    Math.round(height || image.naturalHeight || DEFAULT_IMAGE_HEIGHT),
  )

  canvas.width = exportWidth
  canvas.height = exportHeight

  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  context.clearRect(0, 0, exportWidth, exportHeight)
  context.drawImage(image, 0, 0, exportWidth, exportHeight)
  return canvas.toDataURL('image/png')
}

const resolveImageData = async (src, width, height) => {
  if (!src || typeof src !== 'string') {
    return null
  }

  const naturalSize =
    width && height
      ? {}
      : await getImageNaturalDimensions(src).catch(() => ({}))

  if (src.startsWith('data:image/svg+xml')) {
    const png = await rasterizeSvg(src, width, height)
    if (!png) {
      return null
    }
    return {
      data: dataUrlToUint8Array(png),
      type: 'png',
      width: width || naturalSize.width,
      height: height || naturalSize.height,
    }
  }

  if (src.startsWith('data:image/')) {
    const type = src.match(/^data:image\/([^;]+)/i)?.[1] || 'png'
    return {
      data: dataUrlToUint8Array(src),
      type,
      width: width || naturalSize.width,
      height: height || naturalSize.height,
    }
  }

  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`Failed to load image source: ${response.status}`)
  }

  const blob = await response.blob()
  const type = blob.type.split('/')[1] || 'png'
  if (blob.type === 'image/svg+xml') {
    const svgDataUrl = await blobToDataUrl(blob)
    const png = await rasterizeSvg(svgDataUrl, width, height)
    if (!png) {
      return null
    }
    return {
      data: dataUrlToUint8Array(png),
      type: 'png',
      width: width || naturalSize.width,
      height: height || naturalSize.height,
    }
  }

  return {
    data: arrayBufferToUint8Array(await blob.arrayBuffer()),
    type,
    width: width || naturalSize.width,
    height: height || naturalSize.height,
  }
}

const buildImageTransformation = (attrs = {}) => {
  const width = Number.parseFloat(`${attrs.width || ''}`)
  const height = Number.parseFloat(`${attrs.height || ''}`)
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : undefined,
    height:
      Number.isFinite(height) && height > 0 ? Math.round(height) : undefined,
  }
}

const fitImageToPage = (width, height, maxWidth) => {
  let nextWidth = Number.parseFloat(`${width || ''}`)
  let nextHeight = Number.parseFloat(`${height || ''}`)

  if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
    nextWidth = DEFAULT_IMAGE_WIDTH
  }
  if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
    nextHeight = DEFAULT_IMAGE_HEIGHT
  }

  if (Number.isFinite(maxWidth) && maxWidth > 0 && nextWidth > maxWidth) {
    const ratio = maxWidth / nextWidth
    nextWidth = Math.max(1, Math.round(nextWidth * ratio))
    nextHeight = Math.max(1, Math.round(nextHeight * ratio))
  }

  return {
    width: nextWidth,
    height: nextHeight,
  }
}

const getPageContentWidthPx = (page = {}) => {
  const size = page.size || DEFAULT_PAGE_SIZE_CM
  const margin = page.margin || DEFAULT_PAGE_MARGIN_CM
  const isLandscape = page.orientation === 'landscape'
  const widthCm = Number.parseFloat(
    `${isLandscape ? size.height || DEFAULT_PAGE_SIZE_CM.height : size.width || DEFAULT_PAGE_SIZE_CM.width}`,
  )
  const leftCm = Number.parseFloat(
    `${margin.left || DEFAULT_PAGE_MARGIN_CM.left}`,
  )
  const rightCm = Number.parseFloat(
    `${margin.right || DEFAULT_PAGE_MARGIN_CM.right}`,
  )

  return cmToPixels(Math.max(1, widthCm - leftCm - rightCm))
}

const loadEcharts = async (editor) => {
  if (typeof document === 'undefined') {
    return null
  }

  if (globalThis.echarts) {
    return globalThis.echarts
  }

  if (!echartsLoader) {
    const cdnUrl = editor?.storage?.options?.cdnUrl
    if (!cdnUrl) {
      return null
    }

    echartsLoader = loadResource(`${cdnUrl}/libs/echarts/echarts.min.js`)
      .then(() => globalThis.echarts || null)
      .catch(() => null)
  }

  return await echartsLoader
}

const getChartOptions = (node, editor) => {
  const attrs = node?.attrs || {}
  if (attrs.mode === 1 && attrs.chartConfig) {
    const data = calbaseConfigData(attrs.chartConfig.data)
    return calbaseConfigOptions(
      data,
      attrs.chartConfig.config,
      editor?.storage?.options || {},
    )
  }

  return attrs.chartOptions || null
}

const resolveChartData = async (node, editor, maxWidth) => {
  const echarts = await loadEcharts(editor)
  const chartOptions = getChartOptions(node, editor)
  if (!echarts || !chartOptions || typeof document === 'undefined') {
    return null
  }

  const fitted = fitImageToPage(
    node?.attrs?.width,
    node?.attrs?.height,
    maxWidth,
  )
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-100000px'
  container.style.top = '0'
  container.style.width = `${fitted.width}px`
  container.style.height = `${fitted.height}px`
  container.style.background = '#ffffff'
  container.style.pointerEvents = 'none'
  document.body.appendChild(container)

  let chart = null

  try {
    chart = echarts.init(container)
    chart.setOption(chartOptions, true)
    chart.resize({
      width: fitted.width,
      height: fitted.height,
    })

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })

    const dataUrl = chart.getDataURL({
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })

    return {
      data: dataUrlToUint8Array(dataUrl),
      type: 'png',
      width: fitted.width,
      height: fitted.height,
    }
  } catch {
    return null
  } finally {
    chart?.dispose()
    container.remove()
  }
}

const waitForRenderFrame = async () => {
  await new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 16)
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(resolve)
    })
  })
}

const resolveMathData = async (latex, options = {}) => {
  const text = `${latex || ''}`.trim()
  if (!text || typeof document === 'undefined') {
    return null
  }

  const [katex, domToImage] = await Promise.all([
    loadKatex().catch(() => null),
    loadDomToImage().catch(() => null),
  ])
  if (!katex || typeof domToImage?.toPng !== 'function') {
    return null
  }

  const container = document.createElement(options.displayMode ? 'div' : 'span')
  container.style.position = 'fixed'
  container.style.left = '-100000px'
  container.style.top = '0'
  container.style.pointerEvents = 'none'
  container.style.display = options.displayMode ? 'block' : 'inline-block'
  container.style.whiteSpace = 'nowrap'
  container.style.background = 'transparent'
  container.style.padding = options.displayMode ? '8px 0' : '0'
  container.style.lineHeight = '1'
  container.style.fontSize = `${Math.max(
    12,
    Number.parseFloat(`${options.fontSizePx || 14}`) || 14,
  )}px`
  container.style.color = '#111827'
  document.body.appendChild(container)

  try {
    katex.render(text, container, {
      displayMode: Boolean(options.displayMode),
      output: 'html',
      strict: 'ignore',
      throwOnError: false,
    })

    if (document.fonts?.ready) {
      await Promise.race([
        document.fonts.ready.catch(() => null),
        new Promise((resolve) => {
          setTimeout(resolve, 60)
        }),
      ])
    }
    await waitForRenderFrame()

    const rect = container.getBoundingClientRect()
    const width = Math.max(1, Math.ceil(rect.width))
    const height = Math.max(1, Math.ceil(rect.height))
    const dataUrl = await domToImage.toPng(container, {
      bgcolor: 'transparent',
      quality: 1,
      scale: 2,
      width,
      height,
    })

    return {
      data: dataUrlToUint8Array(dataUrl),
      type: 'png',
      width,
      height,
    }
  } catch {
    return null
  } finally {
    container.remove()
  }
}

const resolveDocxMath = async (latex) => {
  const text = `${latex || ''}`.trim()
  if (!text) {
    return null
  }

  try {
    const converter = await loadMathConverter()
    if (typeof converter?.convertLatex2Math !== 'function') {
      return null
    }
    return converter.convertLatex2Math(text) || null
  } catch {
    return null
  }
}

const getDocumentContent = (json) => {
  return Array.isArray(json) ? json : ensureArray(json?.content)
}

const normalizeBookmarkName = (value, fallback = 'bookmark') => {
  const text = `${value || ''}`.trim()
  const normalized = (text || fallback)
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^([^A-Za-z_]+)/, 'b_$1')
    .replace(/^$/, fallback)
  return normalized.slice(0, 40)
}

const normalizeFootnoteCaption = (value) => {
  return `${value || ''}`.replace(/\s+/g, ' ').trim()
}

const getOrderedListFormat = (docx, value) => {
  switch (`${value || ''}`.toLowerCase()) {
    case 'lower-alpha':
    case 'lower-latin':
      return docx.LevelFormat.LOWER_LETTER
    case 'upper-alpha':
    case 'upper-latin':
      return docx.LevelFormat.UPPER_LETTER
    case 'lower-roman':
      return docx.LevelFormat.LOWER_ROMAN
    case 'upper-roman':
      return docx.LevelFormat.UPPER_ROMAN
    case 'decimal-leading-zero':
      return docx.LevelFormat.DECIMAL_ZERO
    case 'decimal':
    default:
      return docx.LevelFormat.DECIMAL
  }
}

const getOrderedListText = (value, level) => {
  const marker = `%${level + 1}`
  switch (`${value || ''}`.toLowerCase()) {
    case 'decimal-leading-zero':
      return `${marker}.`
    case 'lower-alpha':
    case 'lower-latin':
    case 'upper-alpha':
    case 'upper-latin':
    case 'lower-roman':
    case 'upper-roman':
    case 'decimal':
    default:
      return `${marker}.`
  }
}

const getBulletCharacter = (value) => {
  switch (`${value || ''}`.toLowerCase()) {
    case 'circle':
      return '○'
    case 'square':
      return '■'
    case 'dash':
      return '–'
    case 'disc':
    default:
      return '•'
  }
}

const createListIndent = (level) => {
  return {
    left: 720 + level * 360,
    hanging: 260,
  }
}

const createOrderedListLevels = (docx, listType, start) => {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format: getOrderedListFormat(docx, listType),
    text: getOrderedListText(listType, level),
    alignment: docx.AlignmentType.START,
    start: level === 0 ? Math.max(1, start || 1) : 1,
    suffix: docx.LevelSuffix.SPACE,
    style: {
      paragraph: {
        indent: createListIndent(level),
      },
    },
  }))
}

const createBulletListLevels = (docx, listType) => {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format: docx.LevelFormat.BULLET,
    text: getBulletCharacter(listType),
    alignment: docx.AlignmentType.START,
    suffix: docx.LevelSuffix.SPACE,
    style: {
      run: {
        font: 'Symbol',
      },
      paragraph: {
        indent: createListIndent(level),
      },
    },
  }))
}

const buildNumberingConfig = (docx, json) => {
  const listReferences = new WeakMap()
  const bulletReferences = new Map()
  const config = []
  let orderedIndex = 0

  const registerBulletReference = (node) => {
    const listType = `${node?.attrs?.listType || 'disc'}`.toLowerCase()
    if (!bulletReferences.has(listType)) {
      const reference = `umo-bullet-${listType}`
      bulletReferences.set(listType, reference)
      config.push({
        reference,
        levels: createBulletListLevels(docx, listType),
      })
    }
    listReferences.set(node, {
      reference: bulletReferences.get(listType),
      type: 'bullet',
    })
  }

  const registerOrderedReference = (node) => {
    orderedIndex += 1
    const listType = `${node?.attrs?.listType || 'decimal'}`.toLowerCase()
    const start = Number.parseInt(`${node?.attrs?.start || 1}`, 10)
    const reference = `umo-ordered-${orderedIndex}`
    config.push({
      reference,
      levels: createOrderedListLevels(docx, listType, start),
    })
    listReferences.set(node, {
      reference,
      type: 'ordered',
    })
  }

  const registerTaskReference = (node) => {
    listReferences.set(node, {
      reference: null,
      type: 'task',
    })
  }

  const visit = (node) => {
    if (!node || typeof node !== 'object') {
      return
    }

    switch (node.type) {
      case 'bulletList':
        registerBulletReference(node)
        break
      case 'orderedList':
        registerOrderedReference(node)
        break
      case 'taskList':
        registerTaskReference(node)
        break
      default:
        break
    }
  }

  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child))
      return
    }

    if (!node || typeof node !== 'object') {
      return
    }
    visit(node)
    ensureArray(node.content).forEach((child) => walk(child))
  }

  walk(json)

  return {
    config,
    listReferences,
  }
}

const buildFootnoteState = (json) => {
  const references = new Map()
  const nodesById = new Map()
  let nextId = 1

  const rememberReference = (node) => {
    const fnId = node?.attrs?.['data-fn-id']
    if (!fnId || references.has(fnId)) {
      return
    }

    references.set(fnId, {
      id: nextId,
      caption: normalizeFootnoteCaption(node?.attrs?.caption),
    })
    nextId += 1
  }

  const walk = (node, insideFootnotes = false) => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, insideFootnotes))
      return
    }

    if (!node || typeof node !== 'object') {
      return
    }

    if (node.type === 'footnotes') {
      ensureArray(node.content).forEach((child) => walk(child, true))
      return
    }

    if (node.type === 'footnote' && insideFootnotes) {
      const fnId = node?.attrs?.['data-fn-id']
      if (fnId) {
        nodesById.set(fnId, node)
      }
    } else if (node.type === 'footnoteReference' && !insideFootnotes) {
      rememberReference(node)
    }

    ensureArray(node.content).forEach((child) => walk(child, insideFootnotes))
  }

  walk(json)

  return {
    references,
    nodesById,
  }
}

const buildSectionProperties = (docx, page = {}) => {
  const orientation =
    page.orientation === 'landscape'
      ? docx.PageOrientation.LANDSCAPE
      : docx.PageOrientation.PORTRAIT
  const size = page.size || DEFAULT_PAGE_SIZE_CM
  const margin = page.margin || DEFAULT_PAGE_MARGIN_CM
  const baseWidth = Number.parseFloat(
    `${size.width || DEFAULT_PAGE_SIZE_CM.width}`,
  )
  const baseHeight = Number.parseFloat(
    `${size.height || DEFAULT_PAGE_SIZE_CM.height}`,
  )
  const width =
    orientation === docx.PageOrientation.LANDSCAPE ? baseHeight : baseWidth
  const height =
    orientation === docx.PageOrientation.LANDSCAPE ? baseWidth : baseHeight

  return {
    page: {
      size: {
        width: cmToTwip(width),
        height: cmToTwip(height),
        orientation,
      },
      margin: {
        top: cmToTwip(margin.top),
        right: cmToTwip(margin.right),
        bottom: cmToTwip(margin.bottom),
        left: cmToTwip(margin.left),
      },
    },
  }
}

const createContext = (docx, editor, documentJson, state, options = {}) => {
  const bookmarkAnchors = new Map()

  const getBookmarkAnchor = (value) => {
    const key = `${value || ''}`.trim()
    if (!bookmarkAnchors.has(key)) {
      bookmarkAnchors.set(key, normalizeBookmarkName(key))
    }
    return bookmarkAnchors.get(key)
  }

  return {
    docx,
    editor,
    documentJson,
    options,
    footnotes: state.footnotes,
    listReferences: state.numbering.listReferences,
    pageContentWidthPx: getPageContentWidthPx(options.page),
    defaultTextColor:
      parseColorToHex(options.defaultTextColor) || DEFAULT_TEXT_COLOR,
    defaultFontSize:
      fontSizeToHalfPoints(options.defaultFontSize) || DEFAULT_FONT_SIZE,
    getBookmarkAnchor,
    getFootnoteNode: (fnId) => {
      return state.footnotes.nodesById.get(fnId) || null
    },
    getFootnoteReference: (fnId) => {
      return state.footnotes.references.get(fnId) || null
    },
    getListReference: (node) => {
      return state.numbering.listReferences.get(node) || null
    },
    resolveInternalAnchor: (href) => {
      const target = `${href || ''}`.replace(/^#/, '').trim()
      return getBookmarkAnchor(target)
    },
  }
}

const serializerHelpers = {
  DEFAULT_IMAGE_HEIGHT,
  DEFAULT_IMAGE_WIDTH,
  buildImageTransformation,
  clamp,
  cmToPixels,
  cmToTwip,
  createBorder,
  ensureArray,
  extractCellText,
  fitImageToPage,
  fontSizeToHalfPoints,
  getDocumentContent,
  getNodeText,
  getParagraphAlignment,
  getParagraphSpacing,
  parseColorToHex,
  pickFirstText,
  pxToTwip,
  readMarginSpacing,
  resolveChartData,
  resolveDocxMath,
  resolveImageData,
  resolveMathData,
}

export const createDocxDocument = async (editor, options = {}) => {
  if (!editor) {
    throw new Error('editor is not ready!')
  }

  const docx = await loadDocx()
  const documentJson = editor.getJSON()
  const state = {
    footnotes: buildFootnoteState(documentJson),
    numbering: buildNumberingConfig(docx, documentJson),
  }
  const context = createContext(docx, editor, documentJson, state, options)
  const serializers = createNodeSerializers(context, serializerHelpers)
  const children = await serializers.serializeDocumentChildren(documentJson)
  const footnotes = await serializers.serializeFootnoteDefinitions()
  const title =
    options.title || editor.storage.options?.document?.title || 'Document'

  return new docx.Document({
    creator: 'Umo Editor',
    title,
    description: title,
    numbering:
      state.numbering.config.length > 0
        ? { config: state.numbering.config }
        : undefined,
    footnotes: Object.keys(footnotes).length > 0 ? footnotes : undefined,
    sections: [
      {
        properties: buildSectionProperties(docx, options.page),
        children: children.length > 0 ? children : [new docx.Paragraph('')],
      },
    ],
  })
}

export const createDocxBlob = async (editor, options = {}) => {
  const { Packer } = await loadDocx()
  const doc = await createDocxDocument(editor, options)
  return await Packer.toBlob(doc)
}
