import type { Extensions } from '@tiptap/core'
import { Table as BaseTable } from '@tiptap/extension-table'
import { TableCell as BaseTableCell } from '@tiptap/extension-table/cell'
import { TableHeader as BaseTableHeader } from '@tiptap/extension-table/header'
import { TableRow as BaseTableRow } from '@tiptap/extension-table/row'

const parseColWidth = (element: HTMLElement) => {
  const colwidth = element.getAttribute('colwidth')
  const parsedColwidth = colwidth
    ? colwidth
        .split(',')
        .map((width) => Number.parseInt(width, 10))
        .filter((width) => Number.isFinite(width))
    : null

  if (parsedColwidth && parsedColwidth.length > 0) {
    return parsedColwidth
  }

  const parentRow = element.parentElement
  const table = element.closest('table')
  const cols = table?.querySelectorAll('colgroup > col')
  const cellIndex = Array.from(parentRow?.children ?? []).indexOf(element)

  if (cellIndex < 0 || !cols || !cols[cellIndex]) {
    return null
  }

  const targetCol = cols[cellIndex] as HTMLElement
  const widthAttribute = targetCol.getAttribute('width')
  const styleWidth = targetCol.style.width
  const rawWidth = widthAttribute ?? styleWidth
  const normalizedWidth = Number.parseInt(rawWidth, 10)

  return Number.isFinite(normalizedWidth) ? [normalizedWidth] : null
}

const createTableCellAttributes = (parentAttributes?: Record<string, any>) => {
  return {
    ...parentAttributes,
    colwidth: {
      default: null,
      parseHTML: (element: HTMLElement) => parseColWidth(element),
    },
    align: {
      default: null,
      parseHTML: (element: HTMLElement) => element.getAttribute('align') || null,
      renderHTML: ({ align }) => ({ align }),
    },
    background: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        element.style.backgroundColor ||
        element.getAttribute('data-background-color') ||
        null,
      renderHTML: ({ background }) => {
        if (!background) {
          return {}
        }

        return {
          'data-background-color': background,
          style: `background-color: ${background};`,
        }
      },
    },
    color: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        element.style.color || element.getAttribute('data-text-color') || null,
      renderHTML: ({ color }) => {
        if (!color) {
          return {}
        }

        return {
          'data-text-color': color,
          style: `color: ${color};`,
        }
      },
    },
  }
}

export const Table = BaseTable.extend({
  addOptions() {
    const parentOptions = this.parent?.()

    return {
      ...parentOptions,
      HTMLAttributes: {
        ...(parentOptions?.HTMLAttributes || {}),
        class: 'mxm-node-table',
      },
      allowTableNodeSelection: true,
      resizable: true,
      lastColumnResizable: true,
      handleWidth: parentOptions?.handleWidth ?? 5,
      cellMinWidth: parentOptions?.cellMinWidth ?? 25,
    }
  },
})

export const TableRow = BaseTableRow.extend({
  content: '(tableCell | tableHeader)*',
})

export const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return createTableCellAttributes(this.parent?.())
  },
})

export const TableCell = BaseTableCell.extend({
  addAttributes() {
    return createTableCellAttributes(this.parent?.())
  },
})

export const getTableExtensions = (): Extensions => {
  return [
    Table,
    TableRow.configure({
      HTMLAttributes: {
        class: 'mxm-node-table-row',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'mxm-node-table-cell',
      },
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'mxm-node-table-header',
      },
    }),
  ]
}
