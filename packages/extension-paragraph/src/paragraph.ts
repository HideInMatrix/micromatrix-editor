import { Node, mergeAttributes } from "@mxm-editor/core";
import { setBlockType } from "@mxm-editor/pm";

export const Paragraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*",

  parseHTML() {
    return [{ tag: "p" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes), 0];
  },

  renderMarkdown({ node, children }) {
    if (node.attrs?.textAlign) {
      return `<p style="text-align: ${node.attrs.textAlign}">${children}</p>\n\n`;
    }

    return children.length ? `${children}\n\n` : "\n\n";
  },

  addCommands() {
    return {
      setParagraph:
        () =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          return setBlockType(type)(state, dispatch);
        },
    };
  },
});
