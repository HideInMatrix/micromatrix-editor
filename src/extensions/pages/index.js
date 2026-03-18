import { Extension } from '@tiptap/core'

import {
  DEFAULT_FOOTER_HEIGHT,
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_PAGE_BREAK_BACKGROUND,
  DEFAULT_PAGE_GAP,
} from './constants'
import PageBreak from './page-break'
import { createPagesPlugin, pagesPluginKey } from './pagination'
import {
  clonePageFormat,
  getPageState,
  normalizePageFormat,
  PAGE_FORMATS,
  pageFormatToPageState,
} from './utils'

const refreshPages = ({ dispatch, tr }) => {
  dispatch?.(tr.setMeta(pagesPluginKey, { refresh: true }))
  return true
}

const normalizeNumber = (value, fallback) => {
  const numeric = Number.parseFloat(`${value ?? fallback}`)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
}

const Pages = Extension.create({
  name: 'pages',
  addOptions() {
    return {
      page: null,
      pageFormat: 'A4',
      headerHeight: null,
      footerHeight: null,
      pageGap: DEFAULT_PAGE_GAP,
      header: '',
      footer: '',
      pageBreakBackground: DEFAULT_PAGE_BREAK_BACKGROUND,
      onPageFormatChange: () => {},
    }
  },
  addStorage() {
    return {
      pageCount: 1,
      pageFormat: normalizePageFormat(this.options.pageFormat),
      pageGap: normalizeNumber(this.options.pageGap, DEFAULT_PAGE_GAP),
      pageBreakBackground:
        this.options.pageBreakBackground || DEFAULT_PAGE_BREAK_BACKGROUND,
      headerHeight: this.options.headerHeight,
      footerHeight: this.options.footerHeight,
      header: this.options.header || '',
      footer: this.options.footer || '',
    }
  },
  addCommands() {
    return {
      setPageFormat:
        (pageFormat) =>
        ({ tr, dispatch }) => {
          const nextPageFormat = normalizePageFormat(pageFormat)
          this.storage.pageFormat = nextPageFormat

          const pageState = getPageState(this.options.page)
          if (this.options.page?.value) {
            this.options.page.value = pageFormatToPageState(
              nextPageFormat,
              pageState,
            )
          }

          return refreshPages({ tr, dispatch })
        },
      setPageGap:
        (pageGap) =>
        ({ tr, dispatch }) => {
          this.storage.pageGap = normalizeNumber(pageGap, DEFAULT_PAGE_GAP)
          return refreshPages({ tr, dispatch })
        },
      setPageBreakBackground:
        (pageBreakBackground) =>
        ({ tr, dispatch }) => {
          this.storage.pageBreakBackground =
            pageBreakBackground || DEFAULT_PAGE_BREAK_BACKGROUND
          return refreshPages({ tr, dispatch })
        },
      setHeader:
        (header) =>
        ({ tr, dispatch }) => {
          this.storage.header = header || ''
          return refreshPages({ tr, dispatch })
        },
      setFooter:
        (footer) =>
        ({ tr, dispatch }) => {
          this.storage.footer = footer || ''
          return refreshPages({ tr, dispatch })
        },
      setHeaderHeight:
        (headerHeight) =>
        ({ tr, dispatch }) => {
          this.storage.headerHeight = normalizeNumber(
            headerHeight,
            this.storage.headerHeight ?? DEFAULT_HEADER_HEIGHT,
          )
          return refreshPages({ tr, dispatch })
        },
      setFooterHeight:
        (footerHeight) =>
        ({ tr, dispatch }) => {
          this.storage.footerHeight = normalizeNumber(
            footerHeight,
            this.storage.footerHeight ?? DEFAULT_FOOTER_HEIGHT,
          )
          return refreshPages({ tr, dispatch })
        },
    }
  },
  addProseMirrorPlugins() {
    return [createPagesPlugin(this)]
  },
})

export default Pages
export { PageBreak, PAGE_FORMATS, clonePageFormat }
