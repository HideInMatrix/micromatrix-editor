import { Node, mergeAttributes } from "@mxm-editor/core";
import { setBlockType } from "@mxm-editor/pm";

function renderParagraphStyle(attrs: Record<string, any> | undefined) {
  const styles = [
    attrs?.textAlign ? `text-align: ${attrs.textAlign}` : null,
    attrs?.lineHeight ? `line-height: ${attrs.lineHeight}` : null,
  ].filter(Boolean);

  return styles.length ? styles.join("; ") : null;
}

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
    const style = renderParagraphStyle(node.attrs);

    if (style) {
      return `<p style="${style}">${children}</p>\n\n`;
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
