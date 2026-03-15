import type { NodeViewRenderer } from "@mxm-editor/core";
import { Node, mergeAttributes } from "@mxm-editor/core";

export type CalloutVariant = "info" | "tip" | "warning" | "danger";

export interface CalloutOptions {
  HTMLAttributes: Record<string, string>;
  renderer: NodeViewRenderer | null;
}

function createFallbackNodeView(): NodeViewRenderer {
  return ({ node }) => {
    const dom = document.createElement("div");
    const contentDOM = document.createElement("div");

    dom.dataset.callout = "";
    dom.dataset.variant = node.attrs.variant ?? "info";
    dom.className = `mxm-callout mxm-callout--${node.attrs.variant ?? "info"}`;
    dom.appendChild(contentDOM);

    return {
      dom,
      contentDOM,
      update(updatedNode) {
        if (updatedNode.type !== node.type) {
          return false;
        }

        dom.dataset.variant = updatedNode.attrs.variant ?? "info";
        dom.className = `mxm-callout mxm-callout--${updatedNode.attrs.variant ?? "info"}`;

        return true;
      },
    };
  };
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",

  group: "block",
  content: "paragraph+",

  addOptions() {
    return {
      HTMLAttributes: {},
      renderer: null,
    };
  },

  addAttributes() {
    return {
      variant: {
        default: "info",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return {
            variant: node.getAttribute("data-variant") ?? "info",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "",
        "data-variant": node.attrs.variant ?? "info",
      }),
      0,
    ];
  },

  renderMarkdown({ node, children }) {
    const variant = String(node.attrs?.variant ?? "info").toUpperCase();
    const body = children.trim();

    if (!body.length) {
      return `> [!${variant}]\n>\n\n`;
    }

    return `> [!${variant}]\n> ${body.replace(/\n/g, "\n> ")}\n\n`;
  },

  addCommands() {
    return {
      insertCallout:
        (variant: CalloutVariant = "info") =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];
          const paragraphType = state.schema.nodes.paragraph;

          if (!type || !paragraphType) {
            return false;
          }

          const { $from } = state.selection;

          if ($from.depth < 1) {
            return false;
          }

          const blockDepth = 1;
          const blockNode = $from.node(blockDepth);
          const blockPos = $from.before(blockDepth);

          if (!dispatch) {
            return true;
          }

          if (blockNode.type === type) {
            dispatch(
              state.tr
                .setNodeMarkup(blockPos, undefined, {
                  ...blockNode.attrs,
                  variant,
                })
                .scrollIntoView(),
            );

            return true;
          }

          const content =
            blockNode.type === paragraphType
              ? [paragraphType.create(blockNode.attrs, blockNode.content)]
              : (() => {
                  const paragraph = paragraphType.createAndFill();

                  return paragraph ? [paragraph] : [];
                })();

          const calloutNode = type.create(
            {
              variant,
            },
            content,
          );

          dispatch(
            state.tr
              .replaceWith(
                blockPos,
                blockPos + blockNode.nodeSize,
                calloutNode,
              )
              .scrollIntoView(),
          );

          return true;
        },
    };
  },

  addNodeView() {
    return this.options.renderer ?? createFallbackNodeView();
  },
});
