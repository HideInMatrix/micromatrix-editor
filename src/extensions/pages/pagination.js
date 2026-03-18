import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { clonePageFormat, resolvePageSettings, resolveTemplate } from './utils'

const EPSILON = 0.5

const pagesPluginKey = new PluginKey('pages')

const createPaginationContainer = () => {
  const element = document.createElement('div')
  element.id = 'pages'
  element.className = 'ProseMirror-widget'
  element.dataset.tiptapPagination = 'true'
  element.contentEditable = 'false'
  element.setAttribute('aria-hidden', 'true')
  return element
}

const createDecorationSet = (doc) => {
  return DecorationSet.create(doc, [
    Decoration.widget(0, () => createPaginationContainer(), {
      side: -1,
      ignoreSelection: true,
      key: 'tiptap-pages-root',
    }),
  ])
}

const getEditorChildren = (view) => {
  return Array.from(view.dom.children).filter((node) => {
    return (
      node instanceof HTMLElement &&
      node.dataset?.tiptapPagination !== 'true' &&
      !node.classList.contains('ProseMirror-gapcursor')
    )
  })
}

const parseMargin = (value) => {
  const numeric = Number.parseFloat(`${value || 0}`)
  return Number.isFinite(numeric) ? numeric : 0
}

const roundMetric = (value) => {
  return Number(value.toFixed(2))
}

const measurePaginationLayout = (view, container) => {
  const root = view.dom
  const previousDisplay = container?.style.display || ''
  const previousMinHeight = root.style.minHeight

  if (container) {
    container.style.display = 'none'
  }
  root.style.minHeight = '0px'

  const children = getEditorChildren(view)
  let naturalHeight = 0

  for (const child of children) {
    const style = window.getComputedStyle(child)
    const bottom =
      child.offsetTop + child.offsetHeight + parseMargin(style.marginBottom)
    naturalHeight = Math.max(naturalHeight, bottom)
  }

  const manualBreakOffsets = Array.from(
    root.querySelectorAll('[data-page-break="true"], .umo-page-break'),
  )
    .map((node) => {
      if (!(node instanceof HTMLElement)) {
        return null
      }

      const style = window.getComputedStyle(node)
      return roundMetric(
        node.offsetTop + node.offsetHeight + parseMargin(style.marginBottom),
      )
    })
    .filter((value) => value && value > EPSILON)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left - right)

  root.style.minHeight = previousMinHeight
  if (container) {
    container.style.display = previousDisplay
  }

  return {
    naturalHeight,
    manualBreakOffsets,
  }
}

const buildMetrics = (settings) => {
  const { pageFormat, pageGap, headerHeight, footerHeight } = settings
  const contentHeight = Math.max(
    1,
    pageFormat.height - pageFormat.margins.top - pageFormat.margins.bottom,
  )

  return {
    pageWidth: pageFormat.width,
    pageHeight: pageFormat.height,
    marginTop: pageFormat.margins.top,
    marginBottom: pageFormat.margins.bottom,
    marginLeft: pageFormat.margins.left,
    marginRight: pageFormat.margins.right,
    contentHeight,
    pageGap,
    headerHeight,
    footerHeight,
    headerPaddingTop: headerHeight / 2,
    footerPaddingBottom: footerHeight / 2,
    spacerHeight: footerHeight + pageGap + headerHeight,
  }
}

const buildBreakOffsets = (naturalHeight, contentHeight, manualBreakOffsets) => {
  const breakOffsets = []
  let pageStart = 0
  let manualBreakIndex = 0

  while (true) {
    while (
      manualBreakIndex < manualBreakOffsets.length &&
      manualBreakOffsets[manualBreakIndex] <= pageStart + EPSILON
    ) {
      manualBreakIndex += 1
    }

    const nextManualBreak = manualBreakOffsets[manualBreakIndex]
    const automaticBreak = roundMetric(pageStart + contentHeight)

    if (
      Number.isFinite(nextManualBreak) &&
      nextManualBreak <= automaticBreak + EPSILON
    ) {
      breakOffsets.push(nextManualBreak)
      pageStart = nextManualBreak
      manualBreakIndex += 1
      continue
    }

    if (naturalHeight <= automaticBreak + EPSILON) {
      break
    }

    breakOffsets.push(automaticBreak)
    pageStart = automaticBreak
  }

  return breakOffsets
}

const buildSignature = (settings, metrics, breakOffsets) => {
  return JSON.stringify({
    pageFormat: clonePageFormat(settings.pageFormat),
    pageGap: settings.pageGap,
    pageBreakBackground: settings.pageBreakBackground,
    headerHeight: settings.headerHeight,
    footerHeight: settings.footerHeight,
    header:
      typeof settings.header === 'function'
        ? settings.header.toString()
        : settings.header,
    footer:
      typeof settings.footer === 'function'
        ? settings.footer.toString()
        : settings.footer,
    contentHeight: Math.round(metrics.contentHeight),
    spacerHeight: Math.round(metrics.spacerHeight),
    breakOffsets: breakOffsets.map((offset) => Math.round(offset * 100) / 100),
  })
}

const createPageCorner = (className, width) => {
  const corner = document.createElement('div')
  corner.className = `tiptap-page-corner ${className}`
  corner.style.width = `${width}px`
  return corner
}

const createPageEdgeContent = (className, html, edge, metrics) => {
  const content = document.createElement('div')
  content.className = className
  content.innerHTML = html

  if (edge === 'header') {
    content.style.justifyContent = 'flex-start'
    content.style.paddingTop = `${metrics.headerPaddingTop}px`
  } else {
    content.style.justifyContent = 'flex-end'
    content.style.paddingBottom = `${metrics.footerPaddingBottom}px`
  }

  return content
}

const createBreakElement = (
  pageNumber,
  totalPages,
  settings,
  metrics,
  pageHeight,
) => {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'tiptap-page-break'
  pageBreak.dataset.pageNumber = `${pageNumber}`

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.pageNumber = `${pageNumber}`
  page.style.position = 'relative'
  page.style.float = 'left'
  page.style.clear = 'both'
  page.style.width = '0px'
  page.style.height = '0px'
  page.style.marginTop = `${pageHeight}px`
  pageBreak.appendChild(page)

  const breaker = document.createElement('div')
  breaker.className = 'breaker'
  breaker.dataset.pageNumber = `${pageNumber}`
  breaker.style.width = `calc(${metrics.pageWidth}px)`
  breaker.style.marginLeft = `-${metrics.marginLeft}px`
  breaker.style.position = 'relative'
  breaker.style.float = 'left'
  breaker.style.clear = 'both'
  breaker.style.left = '0px'
  breaker.style.right = '0px'
  breaker.style.zIndex = '2'
  breaker.style.pointerEvents = 'none'
  pageBreak.appendChild(breaker)

  const footer = document.createElement('div')
  footer.className = 'tiptap-page-footer'
  footer.dataset.editable = 'false'
  footer.dataset.footerPageNumber = `${pageNumber}`
  footer.dataset.footerType = 'default'
  footer.style.minHeight = `${metrics.footerHeight}px`
  footer.style.height = `${metrics.footerHeight}px`
  footer.appendChild(createPageCorner('corner-bl', metrics.marginLeft))
  footer.appendChild(
    createPageEdgeContent(
      'tiptap-page-footer-content',
      resolveTemplate(settings.footer, pageNumber, totalPages),
      'footer',
      metrics,
    ),
  )
  footer.appendChild(createPageCorner('corner-br', metrics.marginRight))
  breaker.appendChild(footer)

  const gap = document.createElement('div')
  gap.className = 'tiptap-pagination-gap'
  gap.style.height = `${metrics.pageGap}px`
  breaker.appendChild(gap)

  const header = document.createElement('div')
  header.className = 'tiptap-page-header'
  header.dataset.editable = 'false'
  header.dataset.headerPageNumber = `${pageNumber + 1}`
  header.dataset.headerType = 'default'
  header.style.minHeight = `${metrics.headerHeight}px`
  header.style.height = `${metrics.headerHeight}px`
  header.appendChild(createPageCorner('corner-tl', metrics.marginLeft))
  header.appendChild(
    createPageEdgeContent(
      'tiptap-page-header-content',
      resolveTemplate(settings.header, pageNumber + 1, totalPages),
      'header',
      metrics,
    ),
  )
  header.appendChild(createPageCorner('corner-tr', metrics.marginRight))
  breaker.appendChild(header)

  return pageBreak
}

class PagesView {
  constructor(view, extension) {
    this.view = view
    this.extension = extension
    this.frame = 0
    this.resizeObserver = null
    this.signature = ''
    this.pageFormatSignature = ''
    this.handleResize = () => {
      this.schedule()
    }

    this.observe()
    this.schedule()
  }

  observe() {
    if (typeof ResizeObserver !== 'function') {
      return
    }

    this.resizeObserver = new ResizeObserver(this.handleResize)
    this.resizeObserver.observe(this.view.dom)
    if (this.view.dom.parentElement) {
      this.resizeObserver.observe(this.view.dom.parentElement)
    }
  }

  update(view) {
    this.view = view
    this.schedule()
  }

  getContainer() {
    return this.view.dom.querySelector('#pages[data-tiptap-pagination="true"]')
  }

  schedule() {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
    }

    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.sync()
    })
  }

  sync() {
    const root = this.view.dom
    const container = this.getContainer()
    const settings = resolvePageSettings(this.extension)

    root.classList.toggle('tiptap-pages', Boolean(settings.enabled))

    if (!settings.enabled || !container) {
      this.signature = ''
      this.pageFormatSignature = ''
      this.extension.storage.pageCount = 1
      root.style.removeProperty('--page-max-height')
      root.style.removeProperty('--tiptap-page-break-background')
      root.style.removeProperty('min-height')
      container?.replaceChildren()
      return
    }

    const metrics = buildMetrics(settings)
    const { naturalHeight, manualBreakOffsets } = measurePaginationLayout(
      this.view,
      container,
    )
    const breakOffsets = buildBreakOffsets(
      naturalHeight,
      metrics.contentHeight,
      manualBreakOffsets,
    )
    const pageCount = Math.max(1, breakOffsets.length + 1)
    const nextSignature = buildSignature(settings, metrics, breakOffsets)
    const nextPageFormatSignature = JSON.stringify(settings.pageFormat)

    root.style.setProperty('--page-max-height', `${metrics.contentHeight}px`)
    root.style.setProperty(
      '--tiptap-page-break-background',
      settings.pageBreakBackground,
    )
    root.style.minHeight = `${Math.max(
      metrics.contentHeight,
      naturalHeight + breakOffsets.length * metrics.spacerHeight,
    )}px`

    if (nextPageFormatSignature !== this.pageFormatSignature) {
      this.pageFormatSignature = nextPageFormatSignature
      settings.onPageFormatChange?.(clonePageFormat(settings.pageFormat))
    }

    this.extension.storage.pageCount = pageCount

    if (nextSignature === this.signature) {
      return
    }

    this.signature = nextSignature

    const fragment = document.createDocumentFragment()
    let previousBreakOffset = 0

    breakOffsets.forEach((breakOffset, index) => {
      const pageNumber = index + 1
      fragment.appendChild(
        createBreakElement(
          pageNumber,
          pageCount,
          settings,
          metrics,
          breakOffset - previousBreakOffset,
        ),
      )
      previousBreakOffset = breakOffset
    })

    container.replaceChildren(fragment)
  }

  destroy() {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
    }
    this.resizeObserver?.disconnect()
    this.view.dom.classList.remove('tiptap-pages')
    this.view.dom.style.removeProperty('--page-max-height')
    this.view.dom.style.removeProperty('--tiptap-page-break-background')
    this.view.dom.style.removeProperty('min-height')
  }
}

const createPagesPlugin = (extension) => {
  return new Plugin({
    key: pagesPluginKey,
    state: {
      init(_, state) {
        return createDecorationSet(state.doc)
      },
      apply(tr, decorationSet) {
        if (!tr.docChanged) {
          return decorationSet
        }
        return decorationSet.map(tr.mapping, tr.doc)
      },
    },
    props: {
      decorations(state) {
        return pagesPluginKey.getState(state) || DecorationSet.empty
      },
    },
    view: (view) => new PagesView(view, extension),
  })
}

export { createPagesPlugin, pagesPluginKey }
