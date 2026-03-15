import { Node } from "@mxm-editor/core";

export const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",

  renderMarkdown({ children }) {
    return children;
  },
});
