import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

// 从单元格或 colgroup 里解析列宽
const parseColWidth = (element: HTMLElement) => {
  const colwidth = element.getAttribute("colwidth");
  const parsedColwidth = colwidth
    ? colwidth
        .split(",")
        .map(width => Number.parseInt(width, 10))
        .filter(width => Number.isFinite(width))
    : null;

  if (parsedColwidth && parsedColwidth.length > 0) {
    return parsedColwidth;
  }

  const parentRow = element.parentElement;
  const table = element.closest("table");
  const cols = table?.querySelectorAll("colgroup > col");
  const cellIndex = Array.from(parentRow?.children ?? []).indexOf(element);

  if (cellIndex < 0 || !cols || !cols[cellIndex]) {
    return null;
  }

  const targetCol = cols[cellIndex] as HTMLElement;
  const widthAttribute = targetCol.getAttribute("width");
  const styleWidth = targetCol.style.width || targetCol.style.minWidth;
  const rawWidth = widthAttribute ?? styleWidth;
  const normalizedWidth = Number.parseInt(rawWidth, 10);

  return Number.isFinite(normalizedWidth) ? [normalizedWidth] : null;
};

// 表格单元格共享属性（跨 header 与普通 cell）
const createTableCellAttributes = () => {
  return {
    colspan: {
      default: 1,
    },
    rowspan: {
      default: 1,
    },
    colwidth: {
      default: null,
      parseHTML: (element: HTMLElement) => parseColWidth(element),
    },
    textColor: {
      default: null,
      parseHTML: (element: HTMLElement) => element.style.color || element.getAttribute("data-text-color") || null,
      renderHTML: (attributes: Record<string, unknown>) => {
        const textColor = typeof attributes.textColor === "string"
          ? attributes.textColor
          : null;

        if (!textColor) {
          return {};
        }

        return {
          "data-text-color": textColor,
          style: `color: ${textColor};`,
        };
      },
    },
    backgroundColor: {
      default: null,
      parseHTML: (element: HTMLElement) => element.style.backgroundColor || element.getAttribute("data-background-color") || null,
      renderHTML: (attributes: Record<string, unknown>) => {
        const backgroundColor = typeof attributes.backgroundColor === "string"
          ? attributes.backgroundColor
          : null;

        if (!backgroundColor) {
          return {};
        }

        return {
          "data-background-color": backgroundColor,
          style: `background-color: ${backgroundColor};`,
        };
      },
    },
  };
};

// 扩展 table：开启列宽拖拽与节点选择
const WritingStudioTable = Table.extend({
  addOptions() {
    const parentOptions = this.parent?.();

    return {
      HTMLAttributes: parentOptions?.HTMLAttributes ?? {},
      resizable: true,
      renderWrapper: parentOptions?.renderWrapper ?? false,
      handleWidth: parentOptions?.handleWidth ?? 5,
      cellMinWidth: parentOptions?.cellMinWidth ?? 25,
      View: parentOptions?.View ?? null,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    };
  },
});

// 扩展 row：允许混合普通与表头单元格
const WritingStudioTableRow = TableRow.extend({
  content: "(tableCell | tableHeader)*",
});

// 扩展表头单元格属性
const WritingStudioTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...createTableCellAttributes(),
    };
  },
});

// 扩展普通单元格属性
const WritingStudioTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...createTableCellAttributes(),
    };
  },
});

// 导出表格相关扩展
export const useWritingStudioTableExtensions = () => {
  return [
    WritingStudioTable.configure({
      HTMLAttributes: {
        class: "ws-table",
      },
    }),
    WritingStudioTableRow.configure({
      HTMLAttributes: {
        class: "ws-table-row",
      },
    }),
    WritingStudioTableHeader.configure({
      HTMLAttributes: {
        class: "ws-table-header",
      },
    }),
    WritingStudioTableCell.configure({
      HTMLAttributes: {
        class: "ws-table-cell",
      },
    }),
  ];
};
