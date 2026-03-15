import { Node, mergeAttributes } from "@mxm-editor/core";

function parseTableCellAttributes(element: HTMLElement) {
  const widthAttribute = element.getAttribute("data-colwidth");
  const widths =
    widthAttribute && /^\d+(,\d+)*$/.test(widthAttribute)
      ? widthAttribute.split(",").map((value) => Number(value))
      : null;
  const colspan = Number(element.getAttribute("colspan") ?? 1);

  return {
    colspan,
    rowspan: Number(element.getAttribute("rowspan") ?? 1),
    colwidth: widths && widths.length === colspan ? widths : null,
  };
}

function renderTableCellAttributes(attributes: Record<string, any>) {
  return {
    ...(attributes.colspan && attributes.colspan !== 1
      ? { colspan: String(attributes.colspan) }
      : {}),
    ...(attributes.rowspan && attributes.rowspan !== 1
      ? { rowspan: String(attributes.rowspan) }
      : {}),
    ...(Array.isArray(attributes.colwidth) && attributes.colwidth.length
      ? { "data-colwidth": attributes.colwidth.join(",") }
      : {}),
  };
}

export const TableHeader = Node.create({
  name: "tableHeader",

  content: "block+",
  isolating: true,

  extendNodeSchema: {
    tableRole: "header_cell",
  },

  addAttributes() {
    return {
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "th",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return parseTableCellAttributes(node);
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "th",
      mergeAttributes(
        HTMLAttributes,
        renderTableCellAttributes(node.attrs),
      ),
      0,
    ];
  },
});
