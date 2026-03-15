import { Node } from "@mxm-editor/core";

export const TableRow = Node.create({
  name: "tableRow",

  content: "(tableCell | tableHeader)+",

  extendNodeSchema: {
    tableRole: "row",
  },

  parseHTML() {
    return [
      {
        tag: "tr",
      },
    ];
  },

  renderHTML() {
    return ["tr", 0];
  },
});
