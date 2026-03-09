import { findParentNode, posToDOMRect } from "@tiptap/core";
import { CellSelection, TableMap } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/vue-3";
import type { Ref } from "vue";

// 表格节点名常量
const WRITING_STUDIO_TABLE_NODE_NAME = "table";
const WRITING_STUDIO_TABLE_CELL_NODE_NAMES = new Set(["tableCell", "tableHeader"]);

// 表格颜色预设值
export type WritingStudioTableCellColorValue =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export type WritingStudioTableColorKind = "text" | "background";

export type WritingStudioTableColumnCellInfo = {
  cellPos: number;
  cellNodeSize: number;
  rowIndex: number;
  columnIndex: number;
  isHeader: boolean;
  dom: HTMLElement;
};

export type WritingStudioResolvedTableCell = {
  tableNode: any;
  tablePos: number;
  tableStart: number;
  tableDom: HTMLTableElement;
  cellNode: any;
  cellPos: number;
  cellDom: HTMLElement;
  rowIndex: number;
  columnIndex: number;
};

export type WritingStudioTableColumnRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type WritingStudioTableSelectionAxis = "cell" | "row" | "column" | "grid";

export type WritingStudioTableSelectionOverlay = {
  axis: WritingStudioTableSelectionAxis;
  rect: WritingStudioTableColumnRect;
  cellCount: number;
};

export type SetWritingStudioTableCellColorsInput = {
  textColor?: string | null;
  backgroundColor?: string | null;
};

// 颜色面板每项预设结构
type TableCellColorPreset = {
  labelKey: string;
  textColor: string | null;
  backgroundColor: string | null;
};

// 文本颜色预设
const tableTextColorPresets: Record<WritingStudioTableCellColorValue, TableCellColorPreset> = {
  default: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.default",
    textColor: null,
    backgroundColor: null,
  },
  gray: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.gray",
    textColor: "oklch(0.48 0 0)",
    backgroundColor: null,
  },
  brown: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.brown",
    textColor: "oklch(0.52 0.04 60)",
    backgroundColor: null,
  },
  orange: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.orange",
    textColor: "oklch(0.68 0.17 52)",
    backgroundColor: null,
  },
  yellow: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.yellow",
    textColor: "oklch(0.78 0.16 95)",
    backgroundColor: null,
  },
  green: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.green",
    textColor: "oklch(0.63 0.17 145)",
    backgroundColor: null,
  },
  blue: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.blue",
    textColor: "oklch(0.6 0.2 255)",
    backgroundColor: null,
  },
  purple: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.purple",
    textColor: "oklch(0.58 0.2 300)",
    backgroundColor: null,
  },
  pink: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.pink",
    textColor: "oklch(0.67 0.18 340)",
    backgroundColor: null,
  },
  red: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.text.red",
    textColor: "oklch(0.63 0.22 25)",
    backgroundColor: null,
  },
};

// 背景色预设
const tableBackgroundColorPresets: Record<WritingStudioTableCellColorValue, TableCellColorPreset> = {
  default: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.default",
    textColor: null,
    backgroundColor: null,
  },
  gray: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.gray",
    textColor: null,
    backgroundColor: "oklch(0.96 0 0)",
  },
  brown: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.brown",
    textColor: null,
    backgroundColor: "oklch(0.95 0.03 60)",
  },
  orange: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.orange",
    textColor: null,
    backgroundColor: "oklch(0.94 0.05 55)",
  },
  yellow: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.yellow",
    textColor: null,
    backgroundColor: "oklch(0.97 0.07 95)",
  },
  green: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.green",
    textColor: null,
    backgroundColor: "oklch(0.95 0.05 145)",
  },
  blue: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.blue",
    textColor: null,
    backgroundColor: "oklch(0.95 0.04 255)",
  },
  purple: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.purple",
    textColor: null,
    backgroundColor: "oklch(0.95 0.04 300)",
  },
  pink: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.pink",
    textColor: null,
    backgroundColor: "oklch(0.95 0.04 340)",
  },
  red: {
    labelKey: "writingStudio.toolbar.table.columnMenu.colors.background.red",
    textColor: null,
    backgroundColor: "oklch(0.95 0.04 25)",
  },
};

// 颜色预设索引
const tableColorStyleMap = {
  text: tableTextColorPresets,
  background: tableBackgroundColorPresets,
} satisfies Record<WritingStudioTableColorKind, Record<WritingStudioTableCellColorValue, TableCellColorPreset>>;

// 判断是否为表格单元格节点
const isTableCellNodeName = (name: string) => {
  return WRITING_STUDIO_TABLE_CELL_NODE_NAMES.has(name);
};

// 获取当前选区所在表格
const resolveWritingStudioParentTable = (editor: Editor) => {
  return findParentNode(node => node.type.name === WRITING_STUDIO_TABLE_NODE_NAME)(editor.state.selection);
};

// 获取当前选区所在单元格
const resolveWritingStudioParentTableCell = (editor: Editor) => {
  return findParentNode(node => isTableCellNodeName(node.type.name))(editor.state.selection);
};

// 组装单元格信息（位置、坐标、DOM）
const createWritingStudioTableCellInfo = (
  editor: Editor,
  tableCell: WritingStudioResolvedTableCell,
  cellRelativePos: number,
  rowIndex: number,
  columnIndex: number,
) => {
  const cellPos = tableCell.tableStart + cellRelativePos;
  const cellNode = tableCell.tableNode.nodeAt(cellRelativePos);
  const dom = editor.view.nodeDOM(cellPos) as HTMLElement | null;

  if (!cellNode || !dom) {
    return null;
  }

  return {
    cellPos,
    cellNodeSize: cellNode.nodeSize,
    rowIndex,
    columnIndex,
    isHeader: cellNode.type.name === "tableHeader",
    dom,
  } satisfies WritingStudioTableColumnCellInfo;
};

// 优先用 ProseMirror 位置解析矩形，失败则回退到 DOM 矩形
const resolveWritingStudioNodeRect = (
  editor: Editor,
  from: number,
  to: number,
  fallbackElement?: HTMLElement | null,
) => {
  const rect = posToDOMRect(editor.view, from, to);

  if (Number.isFinite(rect.width) && Number.isFinite(rect.height) && (rect.width > 0 || rect.height > 0)) {
    return rect;
  }

  return fallbackElement?.getBoundingClientRect() ?? rect;
};

// 解析当前激活单元格及其表格上下文
export const resolveWritingStudioActiveTableCell = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return null;
  }

  const tableParent = resolveWritingStudioParentTable(editor);
  const cellParent = resolveWritingStudioParentTableCell(editor);

  if (!tableParent || !cellParent) {
    return null;
  }

  const tableNode = tableParent.node;
  const cellNode = cellParent.node;
  const tablePos = tableParent.pos;
  const cellPos = cellParent.pos;
  const tableStart = tablePos + 1;
  const cellRelativePos = cellPos - tableStart;
  const tableMap = TableMap.get(tableNode);
  const rect = tableMap.findCell(cellRelativePos);
  const tableDom = editor.view.nodeDOM(tablePos) as HTMLTableElement | null;
  const cellDom = editor.view.nodeDOM(cellPos) as HTMLElement | null;

  if (!tableDom || !cellDom) {
    return null;
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
  } satisfies WritingStudioResolvedTableCell;
};

// 若当前是 CellSelection 则返回该选择对象
const resolveWritingStudioCellSelection = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return null;
  }

  const { selection } = editor.state;
  return selection instanceof CellSelection ? selection : null;
};

export const isWritingStudioColumnSelectionActive = (
  editor: Editor | null | undefined,
) => {
  return resolveWritingStudioCellSelection(editor)?.isColSelection() ?? false;
};

// 判断是否存在任意单元格选择
export const isWritingStudioCellSelectionActive = (
  editor: Editor | null | undefined,
) => {
  return Boolean(resolveWritingStudioCellSelection(editor));
};

export const isWritingStudioRowSelectionActive = (
  editor: Editor | null | undefined,
) => {
  return resolveWritingStudioCellSelection(editor)?.isRowSelection() ?? false;
};

// 获取当前列全部单元格信息（自动去重跨行合并单元格）
export const resolveWritingStudioTableColumnCells = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return [];
  }

  const tableMap = TableMap.get(cell.tableNode);
  const cells: WritingStudioTableColumnCellInfo[] = [];

  for (let rowIndex = 0; rowIndex < tableMap.height; rowIndex += 1) {
    const index = rowIndex * tableMap.width + cell.columnIndex;
    const cellRelativePos = tableMap.map[index];

    if (typeof cellRelativePos !== "number") {
      continue;
    }

    if (rowIndex > 0 && tableMap.map[index] === tableMap.map[index - tableMap.width]) {
      continue;
    }

    const cellInfo = createWritingStudioTableCellInfo(editor, cell, cellRelativePos, rowIndex, cell.columnIndex);
    if (!cellInfo) {
      continue;
    }

    cells.push(cellInfo);
  }

  return cells;
};

// 获取当前选择涉及的所有单元格信息
export const resolveWritingStudioSelectedTableCells = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return [];
  }

  const activeCell = resolveWritingStudioActiveTableCell(editor);
  if (!activeCell) {
    return [];
  }

  const selection = resolveWritingStudioCellSelection(editor);
  if (!selection) {
    return [{
      cellPos: activeCell.cellPos,
      cellNodeSize: activeCell.cellNode.nodeSize,
      rowIndex: activeCell.rowIndex,
      columnIndex: activeCell.columnIndex,
      isHeader: activeCell.cellNode.type.name === "tableHeader",
      dom: activeCell.cellDom,
    } satisfies WritingStudioTableColumnCellInfo];
  }

  const tableMap = TableMap.get(activeCell.tableNode);
  const anchorRelativePos = selection.$anchorCell.pos - activeCell.tableStart;
  const headRelativePos = selection.$headCell.pos - activeCell.tableStart;
  const selectionRect = tableMap.rectBetween(anchorRelativePos, headRelativePos);
  const relativePositions = Array.from(new Set(tableMap.cellsInRect(selectionRect)));

  return relativePositions
    .map((cellRelativePos) => {
      const cellRect = tableMap.findCell(cellRelativePos);

      return createWritingStudioTableCellInfo(
        editor,
        activeCell,
        cellRelativePos,
        cellRect.top,
        cellRect.left,
      );
    })
    .filter((cellInfo): cellInfo is WritingStudioTableColumnCellInfo => Boolean(cellInfo));
};

// 计算多个单元格的外接矩形
const resolveWritingStudioTableCellsBoundingRect = (
  editor: Editor,
  cells: WritingStudioTableColumnCellInfo[],
) => {
  if (cells.length === 0) {
    return null;
  }

  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  cells.forEach((cellInfo) => {
    const rect = resolveWritingStudioNodeRect(
      editor,
      cellInfo.cellPos,
      cellInfo.cellPos + cellInfo.cellNodeSize,
      cellInfo.dom,
    );
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  });

  if (!Number.isFinite(top) || !Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  } satisfies WritingStudioTableColumnRect;
};

// 计算当前列的外接矩形
export const resolveWritingStudioTableColumnRect = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor) {
    return null;
  }

  return resolveWritingStudioTableCellsBoundingRect(
    editor,
    resolveWritingStudioTableColumnCells(editor, cell),
  );
};

// 计算当前表格选区遮罩信息
export const resolveWritingStudioTableSelectionOverlay = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return null;
  }

  const selection = resolveWritingStudioCellSelection(editor);
  if (!selection) {
    return null;
  }

  const activeCell = resolveWritingStudioActiveTableCell(editor);
  if (!activeCell) {
    return null;
  }

  const tableMap = TableMap.get(activeCell.tableNode);
  const anchorRelativePos = selection.$anchorCell.pos - activeCell.tableStart;
  const headRelativePos = selection.$headCell.pos - activeCell.tableStart;
  const selectionRect = tableMap.rectBetween(anchorRelativePos, headRelativePos);
  const selectedCells = resolveWritingStudioSelectedTableCells(editor);
  const isColumnSelection = selection.isColSelection();
  const isRowSelection = selection.isRowSelection();

  if (selectedCells.length === 0) {
    return null;
  }

  if (!isColumnSelection && !isRowSelection && selectedCells.length <= 1) {
    return null;
  }

  const overlayRect = resolveWritingStudioTableCellsBoundingRect(editor, selectedCells);
  if (!overlayRect) {
    return null;
  }

  const columnSpan = selectionRect.right - selectionRect.left;
  const rowSpan = selectionRect.bottom - selectionRect.top;

  const axis: WritingStudioTableSelectionAxis = isColumnSelection
    ? "column"
    : isRowSelection
      ? "row"
      : (columnSpan > 1 || rowSpan > 1)
        ? "grid"
        : "cell";

  return {
    axis,
    cellCount: selectedCells.length,
    rect: overlayRect,
  } satisfies WritingStudioTableSelectionOverlay;
};

// 计算单个单元格矩形
export const resolveWritingStudioTableCellRect = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return null;
  }

  const rect = resolveWritingStudioNodeRect(
    editor,
    cell.cellPos,
    cell.cellPos + cell.cellNode.nodeSize,
    cell.cellDom,
  );

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  } satisfies WritingStudioTableColumnRect;
};

// 获取 tableWrapper DOM 元素
export const resolveWritingStudioTableWrapperElement = (
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!cell) {
    return null;
  }

  return cell.tableDom.closest(".tableWrapper") as HTMLElement | null;
};

const resolveColumnSelectionEndpoints = (
  editor: Editor,
  cell: WritingStudioResolvedTableCell,
) => {
  const tableMap = TableMap.get(cell.tableNode);
  const firstIndex = cell.columnIndex;
  const lastIndex = (tableMap.height - 1) * tableMap.width + cell.columnIndex;
  const firstRelativePos = tableMap.map[firstIndex];
  const lastRelativePos = tableMap.map[lastIndex];

  if (typeof firstRelativePos !== "number" || typeof lastRelativePos !== "number") {
    return null;
  }

  const firstPos = cell.tableStart + firstRelativePos;
  const lastPos = cell.tableStart + lastRelativePos;

  const $firstCell = editor.state.doc.resolve(firstPos);
  const $lastCell = editor.state.doc.resolve(lastPos);

  return {
    $firstCell,
    $lastCell,
  };
};

// 选中当前单元格所在整列
export const selectWritingStudioTableColumn = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false;
  }

  const endpoints = resolveColumnSelectionEndpoints(editor, cell);
  if (!endpoints) {
    return false;
  }

  const { $firstCell, $lastCell } = endpoints;
  const selection = CellSelection.colSelection($firstCell, $lastCell);

  editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
  editor.commands.focus();
  return true;
};

// 强制刷新 CellSelection，修正部分场景下的选择状态不同步
export const refreshWritingStudioCellSelection = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false;
  }

  const { selection } = editor.state;
  if (!(selection instanceof CellSelection)) {
    return false;
  }

  const refreshedSelection = new CellSelection(selection.$headCell, selection.$anchorCell);
  if (selection.eq(refreshedSelection)) {
    return false;
  }

  editor.view.dispatch(editor.state.tr.setSelection(refreshedSelection));
  return true;
};

// 对给定单元格集合批量执行事务更新
const updateWritingStudioTableCells = (
  editor: Editor,
  cells: WritingStudioTableColumnCellInfo[],
  updater: (cellInfo: WritingStudioTableColumnCellInfo, tr: any) => void,
) => {
  if (cells.length === 0) {
    return false;
  }

  let tr = editor.state.tr;
  cells.forEach((cellInfo) => {
    updater(cellInfo, tr);
  });

  if (!tr.docChanged && tr.steps.length === 0) {
    return false;
  }

  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
};

// 对当前列全部单元格执行更新
const updateWritingStudioTableColumnCells = (
  editor: Editor,
  cell: WritingStudioResolvedTableCell,
  updater: (cellInfo: WritingStudioTableColumnCellInfo, tr: any) => void,
) => {
  return updateWritingStudioTableCells(
    editor,
    resolveWritingStudioTableColumnCells(editor, cell),
    updater,
  );
};

// 对当前选区所有单元格执行更新
const updateWritingStudioSelectedTableCells = (
  editor: Editor,
  updater: (cellInfo: WritingStudioTableColumnCellInfo, tr: any) => void,
) => {
  return updateWritingStudioTableCells(
    editor,
    resolveWritingStudioSelectedTableCells(editor),
    updater,
  );
};

// 设置当前列单元格颜色
export const setWritingStudioTableColumnCellColors = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
  input: SetWritingStudioTableCellColorsInput,
) => {
  if (!editor || !cell) {
    return false;
  }

  return updateWritingStudioTableColumnCells(editor, cell, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos);
    if (!node) {
      return;
    }

    tr.setNodeMarkup(cellInfo.cellPos, undefined, {
      ...node.attrs,
      textColor: input.textColor ?? null,
      backgroundColor: input.backgroundColor ?? null,
    });
  });
};

// 设置当前选中单元格颜色
export const setWritingStudioTableSelectedCellColors = (
  editor: Editor | null | undefined,
  input: SetWritingStudioTableCellColorsInput,
) => {
  if (!editor) {
    return false;
  }

  return updateWritingStudioSelectedTableCells(editor, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos);
    if (!node) {
      return;
    }

    tr.setNodeMarkup(cellInfo.cellPos, undefined, {
      ...node.attrs,
      textColor: input.textColor ?? null,
      backgroundColor: input.backgroundColor ?? null,
    });
  });
};

// 清空当前列单元格内容（保留单元格结构）
export const clearWritingStudioTableColumnContent = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false;
  }

  const paragraphNode = editor.state.schema.nodes.paragraph?.createAndFill();
  if (!paragraphNode) {
    return false;
  }

  return updateWritingStudioTableColumnCells(editor, cell, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos);
    if (!node) {
      return;
    }

    const from = cellInfo.cellPos + 1;
    const to = cellInfo.cellPos + node.nodeSize - 1;
    tr.replaceWith(from, to, paragraphNode);
  });
};

// 清空当前选区单元格内容（保留单元格结构）
export const clearWritingStudioSelectedTableCellsContent = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false;
  }

  const paragraphNode = editor.state.schema.nodes.paragraph?.createAndFill();
  if (!paragraphNode) {
    return false;
  }

  return updateWritingStudioSelectedTableCells(editor, (cellInfo, tr) => {
    const node = tr.doc.nodeAt(cellInfo.cellPos);
    if (!node) {
      return;
    }

    const from = cellInfo.cellPos + 1;
    const to = cellInfo.cellPos + node.nodeSize - 1;
    tr.replaceWith(from, to, paragraphNode);
  });
};

// 在目标列前/后插入列，并尝试保持列选择
export const insertWritingStudioTableColumn = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
  side: "before" | "after",
) => {
  if (!editor || !cell) {
    return false;
  }

  const chain = editor.chain().focus().setTextSelection(cell.cellPos + 1) as any;
  const success = side === "before" ? chain.addColumnBefore().run() : chain.addColumnAfter().run();

  if (!success) {
    return false;
  }

  const refreshedCell = resolveWritingStudioActiveTableCell(editor);
  if (refreshedCell) {
    selectWritingStudioTableColumn(editor, refreshedCell);
  }

  return true;
};

// 在当前选中列前/后插入列
export const insertWritingStudioSelectedTableColumns = (
  editor: Editor | null | undefined,
  side: "before" | "after",
) => {
  if (!editor) {
    return false;
  }

  const chain = editor.chain().focus() as any;
  return side === "before" ? chain.addColumnBefore().run() : chain.addColumnAfter().run();
};

// 删除指定列
export const deleteWritingStudioTableColumn = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false;
  }

  const success = editor.chain().focus().setTextSelection(cell.cellPos + 1).deleteColumn().run();
  if (success) {
    editor.commands.focus();
  }

  return success;
};

// 删除当前选中列
export const deleteWritingStudioSelectedTableColumns = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false;
  }

  const success = editor.chain().focus().deleteColumn().run();
  if (success) {
    editor.commands.focus();
  }

  return success;
};

// 颜色面板预设集合
export const useWritingStudioTableColumnColors = () => {
  return {
    text: tableTextColorPresets,
    background: tableBackgroundColorPresets,
  } satisfies Record<WritingStudioTableColorKind, Record<WritingStudioTableCellColorValue, TableCellColorPreset>>;
};

// 根据种类和值读取颜色预设
export const getWritingStudioTableColorPreset = (
  kind: WritingStudioTableColorKind,
  value: WritingStudioTableCellColorValue,
) => {
  return tableColorStyleMap[kind][value];
};

// 当前选区是否可执行合并单元格
export const canMergeWritingStudioSelectedTableCells = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false;
  }

  const selectedCells = resolveWritingStudioSelectedTableCells(editor);
  if (selectedCells.length <= 1) {
    return false;
  }

  return editor.can().mergeOrSplit();
};

// 合并（或拆分）当前选中单元格
export const mergeWritingStudioSelectedTableCells = (
  editor: Editor | null | undefined,
) => {
  if (!editor || !canMergeWritingStudioSelectedTableCells(editor)) {
    return false;
  }

  return editor.chain().focus().mergeOrSplit().run();
};

// 列菜单所需的响应式状态集合
export const useWritingStudioTableColumnMenuState = (
  editorRef: Ref<Editor | null | undefined>,
) => {
  // 编辑器交互修订号，用于触发依赖刷新
  const revision = ref(0);

  watch(editorRef, (editor, _previousEditor, onCleanup) => {
    if (!editor) {
      revision.value += 1;
      return;
    }

    const updateRevision = () => {
      revision.value += 1;
    };

    editor.on("selectionUpdate", updateRevision);
    editor.on("transaction", updateRevision);
    editor.on("focus", updateRevision);
    editor.on("blur", updateRevision);

    onCleanup(() => {
      editor.off("selectionUpdate", updateRevision);
      editor.off("transaction", updateRevision);
      editor.off("focus", updateRevision);
      editor.off("blur", updateRevision);
    });
  }, {
    immediate: true,
  });

  // 在 computed 中显式追踪 revision
  const trackRevision = <T>(resolver: () => T) => computed(() => {
    revision.value;
    return resolver();
  });

  const activeCell = trackRevision(() => resolveWritingStudioActiveTableCell(editorRef.value));
  const isCellSelection = trackRevision(() => isWritingStudioCellSelectionActive(editorRef.value));
  const isColumnSelection = trackRevision(() => isWritingStudioColumnSelectionActive(editorRef.value));
  const isRowSelection = trackRevision(() => isWritingStudioRowSelectionActive(editorRef.value));
  const selectionOverlay = trackRevision(() => resolveWritingStudioTableSelectionOverlay(editorRef.value));
  const selectedCellCount = trackRevision(() => resolveWritingStudioSelectedTableCells(editorRef.value).length);
  const canMergeSelectedCells = trackRevision(() => canMergeWritingStudioSelectedTableCells(editorRef.value));

  return {
    revision,
    activeCell,
    isCellSelection,
    isColumnSelection,
    isRowSelection,
    selectionOverlay,
    selectedCellCount,
    canMergeSelectedCells,
  };
};
