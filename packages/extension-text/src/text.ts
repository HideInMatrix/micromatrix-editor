import { Node } from "@mxm-editor/core";

export const Text = Node.create({
  name: "text",
  group: "inline",

  renderMarkdown({ node }) {
    return node.text ?? "";
  },
});
