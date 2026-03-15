import { Node } from "@mxm-editor/core";

export const HorizontalRule = Node.create({
  name: "horizontalRule",

  group: "block",

  parseHTML() {
    return [
      {
        tag: "hr",
      },
    ];
  },

  renderHTML() {
    return ["hr"];
  },

  renderMarkdown() {
    return "---\n\n";
  },

  addCommands() {
    return {
      setHorizontalRule:
        () =>
        ({ commands }) =>
          commands.insertContent("<hr>"),
    };
  },
});
