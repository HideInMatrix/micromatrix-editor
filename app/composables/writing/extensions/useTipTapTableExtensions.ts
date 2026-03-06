import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

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
            parseHTML: (element: HTMLElement) => {
                return parseColWidth(element);
            },
        },
    };
};

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

const WritingStudioTableRow = TableRow.extend({
    content: "(tableCell | tableHeader)*",
});

const WritingStudioTableHeader = TableHeader.extend({
    addAttributes() {
        return {
            ...createTableCellAttributes(),
        };
    },
});

const WritingStudioTableCell = TableCell.extend({
    addAttributes() {
        return {
            ...createTableCellAttributes(),
        };
    },
});

export const useTipTapTableExtensions = () => {
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
