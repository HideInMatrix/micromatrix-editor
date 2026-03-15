import { Node, mergeAttributes } from "@mxm-editor/core";
import {
  parseTableCellAttributes,
  renderTableCellAttributes,
} from "./utils";

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
