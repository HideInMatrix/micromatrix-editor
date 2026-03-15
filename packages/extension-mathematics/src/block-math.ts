import { Node, mergeAttributes } from "@mxm-editor/core";
import { InputRule, type Node as ProseMirrorNode } from "@mxm-editor/pm";
import type { KatexOptions } from "katex";
import { renderKatexIntoElement } from "./utils";

export interface BlockMathOptions {
  katexOptions?: KatexOptions;
  onClick?: (node: ProseMirrorNode, pos: number) => void;
}

function getBlockMathPosition(
  nodeName: string,
  doc: ProseMirrorNode,
  pos: number,
) {
  const directNode = doc.nodeAt(pos);

  if (directNode?.type.name === nodeName) {
    return pos;
  }

  return null;
}

export const BlockMath = Node.create<BlockMathOptions>({
  name: "blockMath",

  group: "block",
  atom: true,

  addOptions() {
    return {
      katexOptions: undefined,
      onClick: undefined,
    };
  },

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") ?? "",
        renderHTML: (attributes) => ({
          "data-latex": String(attributes.latex ?? ""),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="block-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "block-math",
      }),
    ];
  },

  renderMarkdown({ node }) {
    return `$$\n${String(node.attrs?.latex ?? "")}\n$$\n\n`;
  },

  addCommands() {
    return {
      insertBlockMath:
        (options: { latex: string; pos?: number }) =>
        ({ commands, editor }) => {
          if (!options.latex) {
            return false;
          }

          return commands.insertContentAt(options.pos ?? editor.state.selection.from, {
            type: this.name,
            attrs: {
              latex: options.latex,
            },
          });
        },
      deleteBlockMath:
        (options?: { pos?: number }) =>
        ({ editor, tr }) => {
          const position = getBlockMathPosition(
            this.name,
            editor.state.doc,
            options?.pos ?? editor.state.selection.$from.pos,
          );

          if (position === null) {
            return false;
          }

          const node = editor.state.doc.nodeAt(position);

          if (!node || node.type.name !== this.name) {
            return false;
          }

          tr.delete(position, position + node.nodeSize);
          return true;
        },
      updateBlockMath:
        (options?: { latex?: string; pos?: number }) =>
        ({ editor, tr }) => {
          const position = getBlockMathPosition(
            this.name,
            editor.state.doc,
            options?.pos ?? editor.state.selection.$from.pos,
          );

          if (position === null) {
            return false;
          }

          const node = editor.state.doc.nodeAt(position);

          if (!node || node.type.name !== this.name) {
            return false;
          }

          tr.setNodeMarkup(position, undefined, {
            ...node.attrs,
            latex: options?.latex ?? node.attrs.latex,
          });

          return true;
        },
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      new InputRule(/^\$\$\$([^$\n]+?)\$\$\$$/, (state, match, start) => {
        const latex = match[1] ?? "";
        const $start = state.tr.doc.resolve(start);
        const blockDepth = $start.depth;
        const blockNode = $start.node(blockDepth);

        if (!blockNode.isTextblock) {
          return state.tr.replaceWith(
            start,
            start + match[0].length,
            type.create({
              latex,
            }),
          );
        }

        const blockPos = $start.before(blockDepth);

        return state.tr.replaceWith(
          blockPos,
          blockPos + blockNode.nodeSize,
          type.create({
            latex,
          }),
        );
      }),
    ];
  },

  addNodeView() {
    const { katexOptions, onClick } = this.options;

    return ({ node, getPos }) => {
      const wrapper = document.createElement("div");
      const innerWrapper = document.createElement("div");

      wrapper.className = "tiptap-mathematics-render";

      if (this.editor.isEditable) {
        wrapper.classList.add("tiptap-mathematics-render--editable");
      }

      innerWrapper.className = "block-math-inner";
      wrapper.dataset.type = "block-math";
      wrapper.setAttribute("data-latex", String(node.attrs.latex ?? ""));
      wrapper.appendChild(innerWrapper);

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const pos = typeof getPos === "function" ? getPos() : undefined;

        if (typeof pos !== "number") {
          return;
        }

        onClick?.(node, pos);
      };

      if (onClick) {
        wrapper.addEventListener("click", handleClick);
      }

      renderKatexIntoElement(
        innerWrapper,
        String(node.attrs.latex ?? ""),
        katexOptions,
        "block-math-error",
      );

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener("click", handleClick);
        },
      };
    };
  },
});
