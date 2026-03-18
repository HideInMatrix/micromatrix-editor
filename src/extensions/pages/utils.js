import {
  CM_TO_PX,
  DEFAULT_FOOTER_HEIGHT,
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_PAGE_BREAK_BACKGROUND,
  DEFAULT_PAGE_GAP,
} from './constants'

const cmToPixels = (value) => {
  const numeric = Number.parseFloat(`${value || 0}`)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return numeric * CM_TO_PX
}

const roundCm = (value) => {
  return Number((value || 0).toFixed(2))
}

const pixelsToCm = (value) => {
  const numeric = Number.parseFloat(`${value || 0}`)
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return numeric / CM_TO_PX
}

const getPageState = (source) => {
  if (source?.value) {
    return source.value
  }
  return source || {}
}

const clonePageFormat = (pageFormat) => {
  return {
    ...pageFormat,
    margins: {
      ...pageFormat.margins,
    },
  }
}

const normalizePixels = (value, fallback = 0) => {
  const numeric = Number.parseFloat(`${value ?? fallback}`)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
}

const createPageFormat = (name, width, height, margins) => {
  return {
    id: name,
    name,
    width: cmToPixels(width),
    height: cmToPixels(height),
    margins: {
      top: cmToPixels(margins.top),
      right: cmToPixels(margins.right),
      bottom: cmToPixels(margins.bottom),
      left: cmToPixels(margins.left),
    },
  }
}

const PAGE_FORMATS = Object.freeze({
  A4: createPageFormat('A4', 21.0, 29.7, {
    top: 2.5,
    right: 2.0,
    bottom: 2.5,
    left: 2.0,
  }),
  A3: createPageFormat('A3', 29.7, 42.0, {
    top: 2.5,
    right: 2.0,
    bottom: 2.5,
    left: 2.0,
  }),
  A5: createPageFormat('A5', 14.8, 21.0, {
    top: 2.0,
    right: 1.5,
    bottom: 2.0,
    left: 1.5,
  }),
  Letter: createPageFormat('Letter', 21.59, 27.94, {
    top: 2.54,
    right: 2.54,
    bottom: 2.54,
    left: 2.54,
  }),
  Legal: createPageFormat('Legal', 21.59, 35.56, {
    top: 2.54,
    right: 2.54,
    bottom: 2.54,
    left: 2.54,
  }),
  Tabloid: createPageFormat('Tabloid', 27.94, 43.18, {
    top: 2.54,
    right: 2.54,
    bottom: 2.54,
    left: 2.54,
  }),
})

const normalizePageFormat = (pageFormat) => {
  if (typeof pageFormat === 'string' && PAGE_FORMATS[pageFormat]) {
    return clonePageFormat(PAGE_FORMATS[pageFormat])
  }

  if (!pageFormat || typeof pageFormat !== 'object') {
    return clonePageFormat(PAGE_FORMATS.A4)
  }

  const width = normalizePixels(pageFormat.width, PAGE_FORMATS.A4.width)
  const height = normalizePixels(pageFormat.height, PAGE_FORMATS.A4.height)
  const margins = pageFormat.margins || {}

  return {
    id: `${pageFormat.id || pageFormat.name || 'custom-page-format'}`,
    name: `${pageFormat.name || pageFormat.id || 'Custom Format'}`,
    width,
    height,
    margins: {
      top: normalizePixels(margins.top),
      right: normalizePixels(margins.right),
      bottom: normalizePixels(margins.bottom),
      left: normalizePixels(margins.left),
    },
  }
}

const pageStateToPageFormat = (pageState) => {
  if (!pageState?.size) {
    return null
  }

  const isPortrait = pageState.orientation !== 'landscape'
  const widthCm = Number.parseFloat(
    `${isPortrait ? pageState.size.width || 0 : pageState.size.height || 0}`,
  )
  const heightCm = Number.parseFloat(
    `${isPortrait ? pageState.size.height || 0 : pageState.size.width || 0}`,
  )

  if (!widthCm || !heightCm) {
    return null
  }

  return {
    id: `${pageState.size.label || 'page-state-format'}`,
    name: `${pageState.size.label || 'Page Format'}`,
    width: cmToPixels(widthCm),
    height: cmToPixels(heightCm),
    margins: {
      top: cmToPixels(pageState.margin?.top || 0),
      right: cmToPixels(pageState.margin?.right || 0),
      bottom: cmToPixels(pageState.margin?.bottom || 0),
      left: cmToPixels(pageState.margin?.left || 0),
    },
  }
}

const pageFormatToPageState = (pageFormat, currentPage = {}) => {
  const nextFormat = normalizePageFormat(pageFormat)
  const widthCm = roundCm(pixelsToCm(nextFormat.width))
  const heightCm = roundCm(pixelsToCm(nextFormat.height))
  const orientation = widthCm > heightCm ? 'landscape' : 'portrait'
  const shortSide = Math.min(widthCm, heightCm)
  const longSide = Math.max(widthCm, heightCm)

  return {
    ...currentPage,
    layout: 'page',
    orientation,
    size: {
      label: nextFormat.name,
      width: shortSide,
      height: longSide,
    },
    margin: {
      ...(currentPage.margin || {}),
      top: roundCm(pixelsToCm(nextFormat.margins.top)),
      right: roundCm(pixelsToCm(nextFormat.margins.right)),
      bottom: roundCm(pixelsToCm(nextFormat.margins.bottom)),
      left: roundCm(pixelsToCm(nextFormat.margins.left)),
      layout: 'custom',
    },
  }
}

const resolveTemplate = (template, page, total) => {
  const content =
    typeof template === 'function' ? template(page, total) : template || ''
  return `${content}`
    .replaceAll('{page}', `${page}`)
    .replaceAll('{total}', `${total}`)
}

const resolvePageSettings = (extension) => {
  const pageState = getPageState(extension.options.page)
  const livePageFormat = pageStateToPageFormat(pageState)
  const pageFormat =
    livePageFormat || normalizePageFormat(extension.storage.pageFormat)
  const enabled = pageState?.layout ? pageState.layout === 'page' : true

  return {
    enabled,
    pageFormat,
    pageGap: normalizePixels(extension.storage.pageGap, DEFAULT_PAGE_GAP),
    pageBreakBackground:
      extension.storage.pageBreakBackground || DEFAULT_PAGE_BREAK_BACKGROUND,
    headerHeight:
      extension.storage.headerHeight === null ||
      extension.storage.headerHeight === undefined
        ? pageFormat.margins.top || DEFAULT_HEADER_HEIGHT
        : normalizePixels(
            extension.storage.headerHeight,
            pageFormat.margins.top || DEFAULT_HEADER_HEIGHT,
          ),
    footerHeight:
      extension.storage.footerHeight === null ||
      extension.storage.footerHeight === undefined
        ? pageFormat.margins.bottom || DEFAULT_FOOTER_HEIGHT
        : normalizePixels(
            extension.storage.footerHeight,
            pageFormat.margins.bottom || DEFAULT_FOOTER_HEIGHT,
          ),
    header: extension.storage.header,
    footer: extension.storage.footer,
    onPageFormatChange: extension.options.onPageFormatChange,
  }
}

export {
  clonePageFormat,
  cmToPixels,
  getPageState,
  normalizePageFormat,
  PAGE_FORMATS,
  pageFormatToPageState,
  pageStateToPageFormat,
  pixelsToCm,
  resolvePageSettings,
  resolveTemplate,
}
