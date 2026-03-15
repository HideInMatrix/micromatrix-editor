import { Node, mergeAttributes } from "@mxm-editor/core";
import { InputRule, type Node as ProseMirrorNode } from "@mxm-editor/pm";
import type { KatexOptions } from "katex";
import { renderKatexIntoElement } from "./utils";

export interface InlineMathOptions {
  katexOptions?: KatexOptions;
  onClick?: (node: ProseMirrorNode, pos: number) => void;
}

function getInlineMathPosition(
  nodeName: string,
  doc: ProseMirrorNode,
  pos: number,
) {
  const directNode = doc.nodeAt(pos);

  if (directNode?.type.name === nodeName) {
    return pos;
  }

  const previousNode = pos > 0 ? doc.nodeAt(pos - 1) : null;

  if (previousNode?.type.name === nodeName) {
    return pos - 1;
  }

  return null;
}

export const InlineMath = Node.create<InlineMathOptions>({
  name: "inlineMath",

  group: "inline",
  inline: true,
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
        tag: 'span[data-type="inline-math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "inline-math",
      }),
    ];
  },

  renderMarkdown({ node }) {
    return `$${String(node.attrs?.latex ?? "")}$`;
  },

  addCommands() {
    return {
      insertInlineMath:
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
      deleteInlineMath:
        (options?: { pos?: number }) =>
        ({ editor, tr }) => {
          const position = getInlineMathPosition(
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
      updateInlineMath:
        (options?: { latex?: string; pos?: number }) =>
        ({ editor, tr }) => {
          const position = getInlineMathPosition(
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
      new InputRule(/(^|[^$])(\$\$([^$\n]+?)\$\$)$/, (state, match, start, end) => {
        const prefix = match[1] ?? "";
        const latex = match[3] ?? "";
        const from = start + prefix.length;

        return state.tr.replaceWith(
          from,
          end,
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
      const wrapper = document.createElement("span");

      wrapper.className = "tiptap-mathematics-render";

      if (this.editor.isEditable) {
        wrapper.classList.add("tiptap-mathematics-render--editable");
      }

      wrapper.dataset.type = "inline-math";
      wrapper.setAttribute("data-latex", String(node.attrs.latex ?? ""));

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
        wrapper,
        String(node.attrs.latex ?? ""),
        katexOptions,
        "inline-math-error",
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
