import { Node, mergeAttributes } from "@mxm-editor/core";
import {
  Selection,
  addColumnAfter as addColumnAfterCommand,
  addColumnBefore as addColumnBeforeCommand,
  addRowAfter as addRowAfterCommand,
  addRowBefore as addRowBeforeCommand,
  columnResizing,
  deleteColumn as deleteColumnCommand,
  deleteRow as deleteRowCommand,
  deleteTable as deleteTableCommand,
  goToNextCell,
  insertPoint,
  isInTable,
  mergeCells as mergeCellsCommand,
  splitCell as splitCellCommand,
  tableEditing,
  toggleHeaderCell as toggleHeaderCellCommand,
  toggleHeaderColumn as toggleHeaderColumnCommand,
  toggleHeaderRow as toggleHeaderRowCommand,
} from "@mxm-editor/pm";
import { TableCell } from "@mxm-editor/extension-table-cell";
import { TableHeader } from "@mxm-editor/extension-table-header";
import { TableRow } from "@mxm-editor/extension-table-row";
import { renderTableMarkdown } from "./utils";

export interface InsertTableOptions {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
}

export interface TableOptions {
  HTMLAttributes: Record<string, string>;
  resizable: boolean;
  handleWidth: number;
  cellMinWidth: number;
  defaultCellMinWidth: number;
  lastColumnResizable: boolean;
  allowTableNodeSelection: boolean;
}

export const Table = Node.create<TableOptions>({
  name: "table",

  group: "block",
  content: "tableRow+",
  isolating: true,

  extendNodeSchema: {
    tableRole: "table",
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 40,
      defaultCellMinWidth: 120,
      lastColumnResizable: true,
      allowTableNodeSelection: false,
    };
  },

  addExtensions() {
    return [TableRow, TableCell, TableHeader];
  },

  parseHTML() {
    return [
      {
        tag: "table",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ["tbody", 0],
    ];
  },

  renderMarkdown({ node }) {
    return renderTableMarkdown(this.editor, node);
  },

  addCommands() {
    return {
      insertTable:
        (options: InsertTableOptions = {}) =>
        ({ state, tr, dispatch }) => {
          if (isInTable(state)) {
            return false;
          }

          const tableType = state.schema.nodes[this.name];
          const rowType = state.schema.nodes.tableRow;
          const cellType = state.schema.nodes.tableCell;
          const headerType = state.schema.nodes.tableHeader;

          if (!tableType || !rowType || !cellType || !headerType) {
            return false;
          }

          const rows = Math.max(1, options.rows ?? 3);
          const cols = Math.max(1, options.cols ?? 3);
          const withHeaderRow = options.withHeaderRow ?? true;
          const tableNode = tableType.create(
            null,
            Array.from({ length: rows }, (_, rowIndex) =>
              rowType.create(
                null,
                Array.from({ length: cols }, () => {
                  const cellNode = (
                    withHeaderRow && rowIndex === 0 ? headerType : cellType
                  ).createAndFill();

                  if (!cellNode) {
                    throw new Error("Unable to create a valid table cell.");
                  }

                  return cellNode;
                }),
              ),
            ),
          );
          const { $from } = state.selection;
          const shouldReplaceEmptyBlock =
            state.selection.empty
            && $from.parent.isTextblock
            && $from.parent.content.size === 0
            && $from.depth > 0;
          const insertPos = shouldReplaceEmptyBlock
            ? $from.before()
            : insertPoint(state.doc, state.selection.from, tableType);

          if (insertPos === null) {
            return false;
          }

          if (!dispatch) {
            return true;
          }

          if (shouldReplaceEmptyBlock) {
            tr.delete($from.before(), $from.after());
          }

          tr.insert(insertPos, tableNode);
          tr.setSelection(
            Selection.near(
              tr.doc.resolve(
                Math.min(
                  insertPos + 4,
                  Math.max(tr.doc.content.size - 1, 0),
                ),
              ),
              1,
            ),
          );

          dispatch(tr.scrollIntoView());
          return true;
        },
      addColumnBefore:
        () =>
        ({ state, dispatch }) =>
          addColumnBeforeCommand(state, dispatch),
      addColumnAfter:
        () =>
        ({ state, dispatch }) =>
          addColumnAfterCommand(state, dispatch),
      deleteColumn:
        () =>
        ({ state, dispatch }) =>
          deleteColumnCommand(state, dispatch),
      addRowBefore:
        () =>
        ({ state, dispatch }) =>
          addRowBeforeCommand(state, dispatch),
      addRowAfter:
        () =>
        ({ state, dispatch }) =>
          addRowAfterCommand(state, dispatch),
      deleteRow:
        () =>
        ({ state, dispatch }) =>
          deleteRowCommand(state, dispatch),
      deleteTable:
        () =>
        ({ state, dispatch }) =>
          deleteTableCommand(state, dispatch),
      mergeCells:
        () =>
        ({ state, dispatch }) =>
          mergeCellsCommand(state, dispatch),
      splitCell:
        () =>
        ({ state, dispatch }) =>
          splitCellCommand(state, dispatch),
      toggleHeaderRow:
        () =>
        ({ state, dispatch }) =>
          toggleHeaderRowCommand(state, dispatch),
      toggleHeaderColumn:
        () =>
        ({ state, dispatch }) =>
          toggleHeaderColumnCommand(state, dispatch),
      toggleHeaderCell:
        () =>
        ({ state, dispatch }) =>
          toggleHeaderCellCommand(state, dispatch),
      goToNextCell:
        () =>
        ({ state, dispatch }) =>
          goToNextCell(1)(state, dispatch),
      goToPreviousCell:
        () =>
        ({ state, dispatch }) =>
          goToNextCell(-1)(state, dispatch),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.goToNextCell(),
      "Shift-Tab": () => this.editor.commands.goToPreviousCell(),
    };
  },

  addProseMirrorPlugins() {
    const plugins = [];

    if (this.options.resizable) {
      plugins.push(
        columnResizing({
          handleWidth: this.options.handleWidth,
          cellMinWidth: this.options.cellMinWidth,
          defaultCellMinWidth: this.options.defaultCellMinWidth,
          lastColumnResizable: this.options.lastColumnResizable,
        }),
      );
    }

    plugins.push(
      tableEditing({
        allowTableNodeSelection: this.options.allowTableNodeSelection,
      }),
    );

    return plugins;
  },
});
