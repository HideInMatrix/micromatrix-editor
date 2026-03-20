import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { clonePageFormat, resolvePageSettings, resolveTemplate } from './utils'

const EPSILON = 0.5
const PAGE_BREAK_NODE_NAME = 'pageBreak'
const PAGINATION_WIDGET_ATTRIBUTE = 'data-tiptap-page-widget'

const pagesPluginKey = new PluginKey('pages')

const createEmptyPaginationState = () => {
  return {
    decorations: DecorationSet.empty,
    signature: '',
    pageCount: 1,
  }
}

const getEditorChildren = (view) => {
  return Array.from(view.dom.children).filter((node) => {
    return (
      node instanceof HTMLElement &&
      node.getAttribute(PAGINATION_WIDGET_ATTRIBUTE) !== 'true' &&
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

const togglePaginationWidgets = (root, hidden) => {
  const widgets = Array.from(
    root.querySelectorAll(`[${PAGINATION_WIDGET_ATTRIBUTE}="true"]`),
  )

  widgets.forEach((widget) => {
    if (!(widget instanceof HTMLElement)) {
      return
    }

    if (hidden) {
      widget.dataset.paginationDisplay = widget.style.display || ''
      widget.style.display = 'none'
      return
    }

    widget.style.display = widget.dataset.paginationDisplay || ''
    delete widget.dataset.paginationDisplay
  })
}

const measurePaginationLayout = (view) => {
  const root = view.dom
  const previousMinHeight = root.style.minHeight

  togglePaginationWidgets(root, true)
  root.style.minHeight = '0px'

  const children = getEditorChildren(view)
  const blocks = []
  let naturalHeight = 0
  let childIndex = 0

  view.state.doc.forEach((node, offset) => {
    const child = children[childIndex]
    childIndex += 1

    if (!(child instanceof HTMLElement)) {
      return
    }

    const style = window.getComputedStyle(child)
    const top = roundMetric(child.offsetTop)
    const bottom = roundMetric(
      child.offsetTop + child.offsetHeight + parseMargin(style.marginBottom),
    )
    const height = roundMetric(bottom - top)

    naturalHeight = Math.max(naturalHeight, bottom)
    blocks.push({
      node,
      pos: offset,
      endPos: offset + node.nodeSize,
      top,
      bottom,
      height,
      forcedBreakAfter: node.type.name === PAGE_BREAK_NODE_NAME,
    })
  })

  root.style.minHeight = previousMinHeight
  togglePaginationWidgets(root, false)

  return {
    naturalHeight,
    blocks,
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

const buildPaginationModel = (blocks, contentHeight) => {
  if (!blocks.length) {
    return {
      breaks: [],
      tailHeight: 0,
      pageCount: 1,
    }
  }

  const breaks = []
  let currentPageTop = 0
  let currentPageNumber = 1

  blocks.forEach((block) => {
    const pageUsage = block.bottom - currentPageTop
    const canBreakBefore = block.top > currentPageTop + EPSILON

    if (
      !block.forcedBreakAfter &&
      pageUsage > contentHeight + EPSILON &&
      canBreakBefore
    ) {
      breaks.push({
        pos: block.pos,
        pageNumber: currentPageNumber,
      })
      currentPageNumber += 1
      currentPageTop = block.top
    }

    if (block.forcedBreakAfter) {
      breaks.push({
        pos: block.endPos,
        pageNumber: currentPageNumber,
      })
      currentPageNumber += 1
      currentPageTop = block.bottom
    }
  })

  const lastContentBottom = blocks[blocks.length - 1]?.bottom || 0
  const lastPageUsedHeight = Math.max(0, lastContentBottom - currentPageTop)
  const tailHeight =
    currentPageNumber > 1
      ? roundMetric(Math.max(0, contentHeight - lastPageUsedHeight))
      : 0

  return {
    breaks,
    tailHeight,
    pageCount: Math.max(1, currentPageNumber),
  }
}

const buildSignature = (settings, metrics, paginationModel) => {
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
    tailHeight: paginationModel.tailHeight,
    breaks: paginationModel.breaks.map((item) => ({
      pos: item.pos,
      pageNumber: item.pageNumber,
    })),
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

const createBreakElement = (pageNumber, totalPages, settings, metrics) => {
  const pageBreak = document.createElement('div')
  pageBreak.className = 'tiptap-page-break'
  pageBreak.dataset.pageNumber = `${pageNumber}`
  pageBreak.setAttribute(PAGINATION_WIDGET_ATTRIBUTE, 'true')
  pageBreak.contentEditable = 'false'
  pageBreak.setAttribute('aria-hidden', 'true')
  pageBreak.style.display = 'block'
  pageBreak.style.pointerEvents = 'none'

  const breaker = document.createElement('div')
  breaker.className = 'breaker'
  breaker.dataset.pageNumber = `${pageNumber}`
  breaker.style.width = `calc(${metrics.pageWidth}px)`
  breaker.style.marginLeft = `-${metrics.marginLeft}px`
  breaker.style.position = 'relative'
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

const createTailElement = (height) => {
  const tail = document.createElement('div')
  tail.className = 'tiptap-page-tail'
  tail.setAttribute(PAGINATION_WIDGET_ATTRIBUTE, 'true')
  tail.contentEditable = 'false'
  tail.setAttribute('aria-hidden', 'true')
  tail.style.display = 'block'
  tail.style.height = `${height}px`
  tail.style.pointerEvents = 'none'
  return tail
}

const createDecorationSet = (doc, settings, metrics, paginationModel) => {
  const decorations = paginationModel.breaks.map((item) => {
    return Decoration.widget(
      item.pos,
      () =>
        createBreakElement(
          item.pageNumber,
          paginationModel.pageCount,
          settings,
          metrics,
        ),
      {
        side: -1,
        ignoreSelection: true,
        key: `tiptap-page-break-${item.pageNumber}-${item.pos}`,
      },
    )
  })

  if (paginationModel.tailHeight > EPSILON) {
    decorations.push(
      Decoration.widget(
        doc.content.size,
        () => createTailElement(paginationModel.tailHeight),
        {
          side: 1,
          ignoreSelection: true,
          key: `tiptap-page-tail-${paginationModel.tailHeight}`,
        },
      ),
    )
  }

  return DecorationSet.create(doc, decorations)
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
    const settings = resolvePageSettings(this.extension)

    root.classList.toggle('tiptap-pages', Boolean(settings.enabled))

    if (!settings.enabled) {
      this.signature = ''
      this.pageFormatSignature = ''
      this.extension.storage.pageCount = 1
      root.style.removeProperty('--tiptap-page-break-background')
      root.style.removeProperty('min-height')

      const state = pagesPluginKey.getState(this.view.state)
      if (state?.signature) {
        this.view.dispatch(
          this.view.state.tr.setMeta(pagesPluginKey, {
            type: 'clear',
          }),
        )
      }
      return
    }

    const metrics = buildMetrics(settings)
    const { blocks } = measurePaginationLayout(this.view)
    const paginationModel = buildPaginationModel(blocks, metrics.contentHeight)
    const nextSignature = buildSignature(settings, metrics, paginationModel)
    const nextPageFormatSignature = JSON.stringify(settings.pageFormat)

    root.style.setProperty(
      '--tiptap-page-break-background',
      settings.pageBreakBackground,
    )
    root.style.removeProperty('min-height')

    if (nextPageFormatSignature !== this.pageFormatSignature) {
      this.pageFormatSignature = nextPageFormatSignature
      settings.onPageFormatChange?.(clonePageFormat(settings.pageFormat))
    }

    this.extension.storage.pageCount = paginationModel.pageCount

    if (nextSignature === this.signature) {
      return
    }

    this.signature = nextSignature

    this.view.dispatch(
      this.view.state.tr.setMeta(pagesPluginKey, {
        type: 'set',
        signature: nextSignature,
        pageCount: paginationModel.pageCount,
        settings,
        metrics,
        paginationModel,
      }),
    )
  }

  destroy() {
    if (this.frame) {
      cancelAnimationFrame(this.frame)
    }
    this.resizeObserver?.disconnect()
    this.view.dom.classList.remove('tiptap-pages')
    this.view.dom.style.removeProperty('--tiptap-page-break-background')
    this.view.dom.style.removeProperty('min-height')
  }
}

const createPagesPlugin = (extension) => {
  return new Plugin({
    key: pagesPluginKey,
    state: {
      init() {
        return createEmptyPaginationState()
      },
      apply(tr, pluginState) {
        const meta = tr.getMeta(pagesPluginKey)

        if (meta?.type === 'clear') {
          return createEmptyPaginationState()
        }

        if (meta?.type === 'set') {
          return {
            decorations: createDecorationSet(
              tr.doc,
              meta.settings,
              meta.metrics,
              meta.paginationModel,
            ),
            signature: meta.signature,
            pageCount: meta.pageCount,
          }
        }

        if (!tr.docChanged) {
          return pluginState
        }

        return {
          ...pluginState,
          decorations: pluginState.decorations.map(tr.mapping, tr.doc),
        }
      },
    },
    props: {
      decorations(state) {
        return pagesPluginKey.getState(state)?.decorations || DecorationSet.empty
      },
    },
    view: (view) => new PagesView(view, extension),
  })
}

export { createPagesPlugin, pagesPluginKey }
