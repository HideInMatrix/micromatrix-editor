import {
  Node,
  defaultBlockAt,
  findParentNode,
  mergeAttributes,
} from "@mxm-editor/core";
import { Selection, type Node as ProseMirrorNode } from "@mxm-editor/pm";

export interface DetailsContentOptions {
  HTMLAttributes: Record<string, string>;
}

function getChildPosition(
  parentPos: number,
  parentNode: ProseMirrorNode,
  childIndex: number,
) {
  let pos = parentPos + 1;

  for (let index = 0; index < childIndex; index += 1) {
    pos += parentNode.child(index).nodeSize;
  }

  return pos;
}

export const DetailsContent = Node.create<DetailsContentOptions>({
  name: "detailsContent",

  content: "block+",
  defining: true,
  selectable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="detailsContent"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": this.name,
      }),
      0,
    ];
  },

  renderMarkdown({ children }) {
    return `<div data-type="${this.name}">\n${children}</div>\n`;
  },

  addNodeView() {
    const nodeType = this.editor.schema.nodes[this.name];

    return ({ HTMLAttributes }) => {
      const dom = document.createElement("div");
      const attributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": this.name,
        hidden: "hidden",
      });

      Object.entries(attributes).forEach(([key, value]) => {
        dom.setAttribute(key, value);
      });

      dom.addEventListener("toggleDetailsContent", () => {
        dom.toggleAttribute("hidden");
      });

      return {
        dom,
        contentDOM: dom,
        ignoreMutation(mutation) {
          if (mutation.type === "selection") {
            return false;
          }

          return !dom.contains(mutation.target) || dom === mutation.target;
        },
        update: (updatedNode) => updatedNode.type === nodeType,
      };
    };
  },

  addKeyboardShortcuts() {
    const nodeType = this.editor.schema.nodes[this.name];

    return {
      Enter: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;
        const detailsContent = findParentNode(
          (node) => node.type === nodeType,
        )(selection);

        if (!empty || !detailsContent || !detailsContent.node.childCount) {
          return false;
        }

        const fromIndex = $from.index(detailsContent.depth);
        const { childCount } = detailsContent.node;
        const isAtEnd = childCount === fromIndex + 1;

        if (!isAtEnd) {
          return false;
        }

        const defaultChildType = detailsContent.node.type.contentMatch.defaultType;
        const defaultChildNode = defaultChildType?.createAndFill();

        if (!defaultChildNode) {
          return false;
        }

        const lastChildIndex = childCount - 1;
        const lastChildNode = detailsContent.node.child(lastChildIndex);
        const lastChildPos = getChildPosition(
          detailsContent.pos,
          detailsContent.node,
          lastChildIndex,
        );
        const lastChildNodeIsEmpty = lastChildNode.eq(defaultChildNode);
        const details = findParentNode(
          (node) => node.type === state.schema.nodes.details,
        )(selection);

        if (!lastChildNodeIsEmpty || !details) {
          return false;
        }

        const parentDepth = details.depth - 1;
        const above = $from.node(parentDepth);
        const after = $from.indexAfter(parentDepth);
        const type = defaultBlockAt(above.contentMatchAt(after));

        if (!type || !above.canReplaceWith(after, after, type)) {
          return false;
        }

        const node = type.createAndFill();

        if (!node || !view) {
          return false;
        }

        const { tr } = state;
        const pos = details.pos + details.node.nodeSize;

        tr.replaceWith(pos, pos, node);
        tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
        tr.delete(lastChildPos, lastChildPos + lastChildNode.nodeSize);
        tr.scrollIntoView();
        view.dispatch(tr);

        return true;
      },
    };
  },
});
