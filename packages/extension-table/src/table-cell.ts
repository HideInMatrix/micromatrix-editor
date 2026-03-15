import { Node, mergeAttributes } from "@mxm-editor/core";
import {
  parseTableCellAttributes,
  renderTableCellAttributes,
} from "./utils";

export const TableCell = Node.create({
  name: "tableCell",

  content: "block+",
  isolating: true,

  extendNodeSchema: {
    tableRole: "cell",
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
        tag: "td",
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
      "td",
      mergeAttributes(
        HTMLAttributes,
        renderTableCellAttributes(node.attrs),
      ),
      0,
    ];
  },
});
