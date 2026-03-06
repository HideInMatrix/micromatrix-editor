import type { Editor } from "@tiptap/vue-3";
import type { Ref } from "vue";
import { CellSelection, TableMap } from "@tiptap/pm/tables";

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

type TableCellColorPreset = {
  labelKey: string;
  textColor: string | null;
  backgroundColor: string | null;
};

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

const tableColorStyleMap = {
  text: tableTextColorPresets,
  background: tableBackgroundColorPresets,
} satisfies Record<WritingStudioTableColorKind, Record<WritingStudioTableCellColorValue, TableCellColorPreset>>;

const isTableCellNodeName = (name: string) => {
  return name === "tableCell" || name === "tableHeader";
};

const getActiveTableCellDepth = (editor: Editor) => {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if (isTableCellNodeName($from.node(depth).type.name)) {
      return depth;
    }
  }

  return -1;
};

export const resolveWritingStudioActiveTableCell = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return null;
  }

  const { $from } = editor.state.selection;
  const cellDepth = getActiveTableCellDepth(editor);

  if (cellDepth < 0) {
    return null;
  }

  let tableDepth = -1;
  for (let depth = cellDepth - 1; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") {
      tableDepth = depth;
      break;
    }
  }

  if (tableDepth < 0) {
    return null;
  }

  const cellNode = $from.node(cellDepth);
  const tableNode = $from.node(tableDepth);
  const cellPos = $from.before(cellDepth);
  const tablePos = $from.before(tableDepth);
  const tableStart = tablePos + 1;
  const cellRelativePos = cellPos - tableStart;
  const tableMap = TableMap.get(tableNode);
  const rect = tableMap.findCell(cellRelativePos);
  const cellDom = editor.view.nodeDOM(cellPos) as HTMLElement | null;
  const tableDom = editor.view.nodeDOM(tablePos) as HTMLTableElement | null;

  if (!cellDom || !tableDom) {
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

export const isWritingStudioColumnSelectionActive = (
  editor: Editor | null | undefined,
) => {
  if (!editor) {
    return false;
  }

  const selection = editor.state.selection;
  return selection instanceof CellSelection && selection.isColSelection();
};

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

    const cellPos = cell.tableStart + cellRelativePos;
    const cellNode = cell.tableNode.nodeAt(cellRelativePos);
    const dom = editor.view.nodeDOM(cellPos) as HTMLElement | null;

    if (!cellNode || !dom) {
      continue;
    }

    cells.push({
      cellPos,
      rowIndex,
      columnIndex: cell.columnIndex,
      isHeader: cellNode.type.name === "tableHeader",
      dom,
    });
  }

  return cells;
};

export const resolveWritingStudioTableColumnRect = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  const cells = resolveWritingStudioTableColumnCells(editor, cell);
  if (cells.length === 0) {
    return null;
  }

  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  cells.forEach(({ dom }) => {
    const rect = dom.getBoundingClientRect();
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  });

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  } satisfies WritingStudioTableColumnRect;
};

export const resolveWritingStudioTableCellRect = (
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!cell) {
    return null;
  }

  const rect = cell.cellDom.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  } satisfies WritingStudioTableColumnRect;
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

type SetTableColumnCellColorsInput = {
  textColor?: string | null;
  backgroundColor?: string | null;
};

const updateWritingStudioTableColumnCells = (
  editor: Editor,
  cell: WritingStudioResolvedTableCell,
  updater: (cellInfo: WritingStudioTableColumnCellInfo, tr: any) => void,
) => {
  const cells = resolveWritingStudioTableColumnCells(editor, cell);
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

export const setWritingStudioTableColumnCellColors = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
  input: SetTableColumnCellColorsInput,
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

export const duplicateWritingStudioTableColumn = (
  editor: Editor | null | undefined,
  cell: WritingStudioResolvedTableCell | null,
) => {
  if (!editor || !cell) {
    return false;
  }

  const tableCells = resolveWritingStudioTableColumnCells(editor, cell);
  if (tableCells.length === 0) {
    return false;
  }

  const snapshot = tableCells.map(({ cellPos }) => {
    const node = editor.state.doc.nodeAt(cellPos);
    return node?.toJSON() ?? null;
  });

  const added = editor.chain().focus().setTextSelection(cell.cellPos + 1).addColumnAfter().run();
  if (!added) {
    return false;
  }

  const nextActiveCell = resolveWritingStudioActiveTableCell(editor);
  if (!nextActiveCell) {
    return true;
  }

  const nextColumnIndex = nextActiveCell.columnIndex;
  const nextColumnCells = resolveWritingStudioTableColumnCells(editor, nextActiveCell);
  if (nextColumnCells.length === 0) {
    return true;
  }

  let tr = editor.state.tr;
  nextColumnCells.forEach((cellInfo, index) => {
    const sourceJson = snapshot[index];
    const currentNode = tr.doc.nodeAt(cellInfo.cellPos);
    if (!sourceJson || !currentNode) {
      return;
    }

    const sourceNode = editor.schema.nodeFromJSON(sourceJson);
    tr.setNodeMarkup(cellInfo.cellPos, undefined, sourceNode.attrs);
    tr.replaceWith(
      cellInfo.cellPos + 1,
      cellInfo.cellPos + currentNode.nodeSize - 1,
      sourceNode.content,
    );
  });

  editor.view.dispatch(tr.scrollIntoView());

  const refreshedCell = resolveWritingStudioActiveTableCell(editor);
  if (refreshedCell && refreshedCell.columnIndex === nextColumnIndex) {
    selectWritingStudioTableColumn(editor, refreshedCell);
  }

  return true;
};

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

export const useWritingStudioTableColumnColors = () => {
  return {
    text: tableTextColorPresets,
    background: tableBackgroundColorPresets,
  } satisfies Record<WritingStudioTableColorKind, Record<WritingStudioTableCellColorValue, TableCellColorPreset>>;
};

export const getWritingStudioTableColorPreset = (
  kind: WritingStudioTableColorKind,
  value: WritingStudioTableCellColorValue,
) => {
  return tableColorStyleMap[kind][value];
};

export const useWritingStudioTableColumnMenuState = (
  editorRef: Ref<Editor | null | undefined>,
) => {
  const revision = ref(0);

  watch(editorRef, (editor, previousEditor, onCleanup) => {
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

  const activeCell = computed(() => {
    revision.value;
    return resolveWritingStudioActiveTableCell(editorRef.value);
  });

  const isColumnSelection = computed(() => {
    revision.value;
    return isWritingStudioColumnSelectionActive(editorRef.value);
  });

  return {
    revision,
    activeCell,
    isColumnSelection,
  };
};
