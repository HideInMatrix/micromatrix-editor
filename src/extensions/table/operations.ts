import { findParentNode, posToDOMRect } from '@tiptap/core'
import { CellSelection, TableMap } from '@tiptap/pm/tables'
import type { Editor } from '@tiptap/vue-3'
import { computed, ref, watch, type Ref } from 'vue'

const TABLE_NODE_NAME = 'table'
const TABLE_CELL_NODE_NAMES = new Set(['tableCell', 'tableHeader'])

export type TableColorKind = 'text' | 'background'

export type TableColumnCellInfo = {
  cellPos: number
  cellNodeSize: number
  rowIndex: number
  columnIndex: number
  isHeader: boolean
  dom: HTMLElement
}

export type ResolvedTableCell = {
  tableNode: any
  tablePos: number
  tableStart: number
  tableDom: HTMLTableElement
  cellNode: any
  cellPos: number
  cellDom: HTMLElement
  rowIndex: number
  columnIndex: number
}

export type TableRect = {
  top: number
  left: number
  width: number
  height: number
}

export type TableSelectionAxis = 'cell' | 'row' | 'column' | 'grid'

export type TableSelectionOverlay = {
  axis: TableSelectionAxis
  rect: TableRect
  cellCount: number
}

export type SetTableCellColorsInput = {
  color?: string | null
  background?: string | null
}

const isTableCellNodeName = (name: string) => TABLE_CELL_NODE_NAMES.has(name)

const resolveParentTable = (editor: Editor) => {
  return findParentNode((node) => node.type.name === TABLE_NODE_NAME)(
    editor.state.selection,
  )
}

const resolveParentTableCell = (editor: Editor) => {
  return findParentNode((node) => isTableCellNodeName(node.type.name))(
    editor.state.selection,
  )
}

const createTableCellInfo = (
  editor: Editor,
  tableCell: ResolvedTableCell,
  cellRelativePos: number,
  rowIndex: number,
  columnIndex: number,
) => {
  const cellPos = tableCell.tableStart + cellRelativePos
  const cellNode = tableCell.tableNode.nodeAt(cellRelativePos)
  const dom = editor.view.nodeDOM(cellPos) as HTMLElement | null

  if (!cellNode || !dom) {
    return null
  }

  return {
    cellPos,
    cellNodeSize: cellNode.nodeSize,
    rowIndex,
    columnIndex,
    isHeader: cellNode.type.name === 'tableHeader',
    dom,
  } satisfies TableColumnCellInfo
}

const resolveNodeRect = (
  editor: Editor,
  from: number,
  to: number,
  fallbackElement?: HTMLElement | null,
) => {
  const rect = posToDOMRect(editor.view, from, to)

  if (
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    (rect.width > 0 || rect.height > 0)
  ) {
    return rect
  }

  return fallbackElement?.getBoundingClientRect() ?? rect
}

export const resolveActiveTableCell = (editor: Editor | null | undefined) => {
  if (!editor) {
    return null
  }

  const tableParent = resolveParentTable(editor)
  const cellParent = resolveParentTableCell(editor)

  if (!tableParent || !cellParent) {
    return null
  }

  const tableNode = tableParent.node
  const cellNode = cellParent.node
  const tablePos = tableParent.pos
  const cellPos = cellParent.pos
  const tableStart = tablePos + 1
  const cellRelativePos = cellPos - tableStart
  const tableMap = TableMap.get(tableNode)
  const rect = tableMap.findCell(cellRelativePos)
  const tableNodeDom = editor.view.nodeDOM(tablePos) as HTMLElement | null
  const tableDom =
    tableNodeDom instanceof HTMLTableElement
      ? tableNodeDom
      : (tableNodeDom?.querySelector('table') as HTMLTableElement | null)
  const cellDom = editor.view.nodeDOM(cellPos) as HTMLElement | null

  if (!tableDom || !cellDom) {
    return null
  }

  return {
    tableNode,
    tablePos,
    tableStart,
    tableDom,
    cellNode,
    cellPos,
    cellDom,
    rowIndex: rect.top,
    columnIndex: rect.left,
  } satisfies ResolvedTableCell
}

const resolveCellSelection = (editor: Editor | null | undefined) => {
  if (!editor) {
    return null
  }

  const { selection } = editor.state
  return selection instanceof CellSelection ? selection : null
}

export const isColumnSelectionActive = (editor: Editor | null | undefined) =>
  resolveCellSelection(editor)?.isColSelection() ?? false

export const isCellSelectionActive = (editor: Editor | null | undefined) =>
  Boolean(resolveCellSelection(editor))

export const isRowSelectionActive = (editor: Editor | null | undefined) =>
  resolveCellSelection(editor)?.isRowSelection() ?? false

export const resolveTableColumnCells = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return []
  }

  const tableMap = TableMap.get(cell.tableNode)
  const cells: TableColumnCellInfo[] = []

  for (let rowIndex = 0; rowIndex < tableMap.height; rowIndex += 1) {
    const index = rowIndex * tableMap.width + cell.columnIndex
    const cellRelativePos = tableMap.map[index]

    if (typeof cellRelativePos !== 'number') {
      continue
    }

    if (
      rowIndex > 0 &&
      tableMap.map[index] === tableMap.map[index - tableMap.width]
    ) {
      continue
    }

    const cellInfo = createTableCellInfo(
      editor,
      cell,
      cellRelativePos,
      rowIndex,
      cell.columnIndex,
    )

    if (cellInfo) {
      cells.push(cellInfo)
    }
  }

  return cells
}

export const resolveSelectedTableCells = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return []
  }

  const activeCell = resolveActiveTableCell(editor)
  if (!activeCell) {
    return []
  }

  const selection = resolveCellSelection(editor)
  if (!selection) {
    return [
      {
        cellPos: activeCell.cellPos,
        cellNodeSize: activeCell.cellNode.nodeSize,
        rowIndex: activeCell.rowIndex,
        columnIndex: activeCell.columnIndex,
        isHeader: activeCell.cellNode.type.name === 'tableHeader',
        dom: activeCell.cellDom,
      } satisfies TableColumnCellInfo,
    ]
  }

  const tableMap = TableMap.get(activeCell.tableNode)
  const anchorRelativePos = selection.$anchorCell.pos - activeCell.tableStart
  const headRelativePos = selection.$headCell.pos - activeCell.tableStart
  const selectionRect = tableMap.rectBetween(
    anchorRelativePos,
    headRelativePos,
  )
  const relativePositions = Array.from(new Set(tableMap.cellsInRect(selectionRect)))

  return relativePositions
    .map((cellRelativePos) => {
      const cellRect = tableMap.findCell(cellRelativePos)
      return createTableCellInfo(
        editor,
        activeCell,
        cellRelativePos,
        cellRect.top,
        cellRect.left,
      )
    })
    .filter((cellInfo): cellInfo is TableColumnCellInfo => Boolean(cellInfo))
}

const resolveTableCellsBoundingRect = (
  editor: Editor,
  cells: TableColumnCellInfo[],
) => {
  if (cells.length === 0) {
    return null
  }

  let top = Number.POSITIVE_INFINITY
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY

  cells.forEach((cellInfo) => {
    const rect = resolveNodeRect(
      editor,
      cellInfo.cellPos,
      cellInfo.cellPos + cellInfo.cellNodeSize,
      cellInfo.dom,
    )
    top = Math.min(top, rect.top)
    left = Math.min(left, rect.left)
    right = Math.max(right, rect.right)
    bottom = Math.max(bottom, rect.bottom)
  })

  if (
    !Number.isFinite(top) ||
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    !Number.isFinite(bottom)
  ) {
    return null
  }

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  } satisfies TableRect
}

export const resolveTableColumnRect = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
) => {
  if (!editor) {
    return null
  }

  return resolveTableCellsBoundingRect(
    editor,
    resolveTableColumnCells(editor, cell),
  )
}

export const resolveTableSelectionOverlay = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return null
  }

  const selection = resolveCellSelection(editor)
  if (!selection) {
    return null
  }

  const activeCell = resolveActiveTableCell(editor)
  if (!activeCell) {
    return null
  }

  const tableMap = TableMap.get(activeCell.tableNode)
  const anchorRelativePos = selection.$anchorCell.pos - activeCell.tableStart
  const headRelativePos = selection.$headCell.pos - activeCell.tableStart
  const selectionRect = tableMap.rectBetween(
    anchorRelativePos,
    headRelativePos,
  )
  const selectedCells = resolveSelectedTableCells(editor)
  const isColumnSelection = selection.isColSelection()
  const isRowSelection = selection.isRowSelection()

  if (selectedCells.length === 0) {
    return null
  }

  if (!isColumnSelection && !isRowSelection && selectedCells.length <= 1) {
    return null
  }

  const overlayRect = resolveTableCellsBoundingRect(editor, selectedCells)
  if (!overlayRect) {
    return null
  }

  const columnSpan = selectionRect.right - selectionRect.left
  const rowSpan = selectionRect.bottom - selectionRect.top

  const axis: TableSelectionAxis = isColumnSelection
    ? 'column'
    : isRowSelection
      ? 'row'
      : columnSpan > 1 || rowSpan > 1
        ? 'grid'
        : 'cell'

  return {
    axis,
    cellCount: selectedCells.length,
    rect: overlayRect,
  } satisfies TableSelectionOverlay
}

export const resolveTableCellRect = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return null
  }

  const rect = resolveNodeRect(
    editor,
    cell.cellPos,
    cell.cellPos + cell.cellNode.nodeSize,
    cell.cellDom,
  )

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  } satisfies TableRect
}

export const resolveTableWrapperElement = (cell: ResolvedTableCell | null) => {
  if (!cell) {
    return null
  }

  return cell.tableDom.closest('.tableWrapper') as HTMLElement | null
}

const resolveColumnSelectionEndpoints = (
  editor: Editor,
  cell: ResolvedTableCell,
) => {
  const tableMap = TableMap.get(cell.tableNode)
  const firstIndex = cell.columnIndex
  const lastIndex = (tableMap.height - 1) * tableMap.width + cell.columnIndex
  const firstRelativePos = tableMap.map[firstIndex]
  const lastRelativePos = tableMap.map[lastIndex]

  if (
    typeof firstRelativePos !== 'number' ||
    typeof lastRelativePos !== 'number'
  ) {
    return null
  }

  const firstPos = cell.tableStart + firstRelativePos
  const lastPos = cell.tableStart + lastRelativePos

  return {
    $firstCell: editor.state.doc.resolve(firstPos),
    $lastCell: editor.state.doc.resolve(lastPos),
  }
}

export const selectTableColumn = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false
  }

  const endpoints = resolveColumnSelectionEndpoints(editor, cell)
  if (!endpoints) {
    return false
  }

  const selection = CellSelection.colSelection(
    endpoints.$firstCell,
    endpoints.$lastCell,
  )

  editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView())
  editor.commands.focus()
  return true
}

export const refreshCellSelection = (editor: Editor | null | undefined) => {
  if (!editor) {
    return false
  }

  const { selection } = editor.state
  if (!(selection instanceof CellSelection)) {
    return false
  }

  const refreshedSelection = new CellSelection(
    selection.$headCell,
    selection.$anchorCell,
  )

  if (selection.eq(refreshedSelection)) {
    return false
  }

  editor.view.dispatch(editor.state.tr.setSelection(refreshedSelection))
  return true
}

const updateTableCells = (
  editor: Editor,
  cells: TableColumnCellInfo[],
  updater: (cellInfo: TableColumnCellInfo, tr: any) => void,
) => {
  if (cells.length === 0) {
    return false
  }

  const tr = editor.state.tr
  cells.forEach((cellInfo) => {
    updater(cellInfo, tr)
  })

  if (!tr.docChanged && tr.steps.length === 0) {
    return false
  }

  editor.view.dispatch(tr.scrollIntoView())
  editor.commands.focus()
  return true
}

const updateTableColumnCells = (
  editor: Editor,
  cell: ResolvedTableCell,
  updater: (cellInfo: TableColumnCellInfo, tr: any) => void,
) => {
  return updateTableCells(editor, resolveTableColumnCells(editor, cell), updater)
}

const updateSelectedTableCells = (
  editor: Editor,
  updater: (cellInfo: TableColumnCellInfo, tr: any) => void,
) => {
  return updateTableCells(editor, resolveSelectedTableCells(editor), updater)
}

export const setTableColumnCellColors = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
  input: SetTableCellColorsInput,
) => {
  if (!editor || !cell) {
    return false
  }

  return updateTableColumnCells(editor, cell, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos)
    if (!node) {
      return
    }

    tr.setNodeMarkup(cellInfo.cellPos, undefined, {
      ...node.attrs,
      color: input.color ?? null,
      background: input.background ?? null,
    })
  })
}

export const setSelectedTableCellColors = (
  editor: Editor | null | undefined,
  input: SetTableCellColorsInput,
) => {
  if (!editor) {
    return false
  }

  return updateSelectedTableCells(editor, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos)
    if (!node) {
      return
    }

    tr.setNodeMarkup(cellInfo.cellPos, undefined, {
      ...node.attrs,
      color: input.color ?? null,
      background: input.background ?? null,
    })
  })
}

export const clearTableColumnContent = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false
  }

  const paragraphNode = editor.state.schema.nodes.paragraph?.createAndFill()
  if (!paragraphNode) {
    return false
  }

  return updateTableColumnCells(editor, cell, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos)
    if (!node) {
      return
    }

    const from = cellInfo.cellPos + 1
    const to = cellInfo.cellPos + node.nodeSize - 1
    tr.replaceWith(from, to, paragraphNode)
  })
}

export const clearSelectedTableCellsContent = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false
  }

  const paragraphNode = editor.state.schema.nodes.paragraph?.createAndFill()
  if (!paragraphNode) {
    return false
  }

  return updateSelectedTableCells(editor, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos)
    if (!node) {
      return
    }

    const from = cellInfo.cellPos + 1
    const to = cellInfo.cellPos + node.nodeSize - 1
    tr.replaceWith(from, to, paragraphNode)
  })
}

export const insertTableColumn = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
  side: 'before' | 'after',
) => {
  if (!editor || !cell) {
    return false
  }

  const chain = editor.chain().focus().setTextSelection(cell.cellPos + 1) as any
  const success =
    side === 'before' ? chain.addColumnBefore().run() : chain.addColumnAfter().run()

  if (!success) {
    return false
  }

  const refreshedCell = resolveActiveTableCell(editor)
  if (refreshedCell) {
    selectTableColumn(editor, refreshedCell)
  }

  return true
}

export const insertSelectedTableColumns = (
  editor: Editor | null | undefined,
  side: 'before' | 'after',
) => {
  if (!editor) {
    return false
  }

  const chain = editor.chain().focus() as any
  return side === 'before'
    ? chain.addColumnBefore().run()
    : chain.addColumnAfter().run()
}

export const deleteTableColumn = (
  editor: Editor | null | undefined,
  cell: ResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false
  }

  const success = editor
    .chain()
    .focus()
    .setTextSelection(cell.cellPos + 1)
    .deleteColumn()
    .run()

  if (success) {
    editor.commands.focus()
  }

  return success
}

export const deleteSelectedTableColumns = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false
  }

  const success = editor.chain().focus().deleteColumn().run()
  if (success) {
    editor.commands.focus()
  }

  return success
}

export const canMergeSelectedTableCells = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false
  }

  const selectedCells = resolveSelectedTableCells(editor)
  if (selectedCells.length <= 1) {
    return false
  }

  return editor.can().mergeCells()
}

export const mergeSelectedTableCells = (
  editor: Editor | null | undefined,
) => {
  if (!editor || !canMergeSelectedTableCells(editor)) {
    return false
  }

  return editor.chain().focus().mergeCells().run()
}

export const useTableMenuState = (
  editorRef: Ref<Editor | null | undefined>,
) => {
  const revision = ref(0)

  watch(
    editorRef,
    (editor, _previousEditor, onCleanup) => {
      if (!editor) {
        revision.value += 1
        return
      }

      const updateRevision = () => {
        revision.value += 1
      }

      editor.on('selectionUpdate', updateRevision)
      editor.on('transaction', updateRevision)
      editor.on('focus', updateRevision)
      editor.on('blur', updateRevision)

      onCleanup(() => {
        editor.off('selectionUpdate', updateRevision)
        editor.off('transaction', updateRevision)
        editor.off('focus', updateRevision)
        editor.off('blur', updateRevision)
      })
    },
    {
      immediate: true,
    },
  )

  const trackRevision = <T>(resolver: () => T) =>
    computed(() => {
      revision.value
      return resolver()
    })

  const activeCell = trackRevision(() => resolveActiveTableCell(editorRef.value))
  const isCellSelection = trackRevision(() =>
    isCellSelectionActive(editorRef.value),
  )
  const isColumnSelection = trackRevision(() =>
    isColumnSelectionActive(editorRef.value),
  )
  const isRowSelection = trackRevision(() =>
    isRowSelectionActive(editorRef.value),
  )
  const selectionOverlay = trackRevision(() =>
    resolveTableSelectionOverlay(editorRef.value),
  )
  const selectedCellCount = trackRevision(
    () => resolveSelectedTableCells(editorRef.value).length,
  )
  const canMergeSelectedCells = trackRevision(() =>
    canMergeSelectedTableCells(editorRef.value),
  )

  return {
    revision,
    activeCell,
    isCellSelection,
    isColumnSelection,
    isRowSelection,
    selectionOverlay,
    selectedCellCount,
    canMergeSelectedCells,
  }
}
