import { Extension, type Editor } from "@mxm-editor/core";
import type { Node as ProseMirrorNode } from "@mxm-editor/pm";

export interface TextAlignOptions {
  types: string[];
  alignments: string[];
  defaultAlignment: string | null;
}

function getTargetNodes(
  editor: Editor,
  types: string[],
): Array<{ node: ProseMirrorNode; pos: number }> {
  const nodes: Array<{ node: ProseMirrorNode; pos: number }> = [];
  const seen = new Set<number>();
  const { selection, doc } = editor.state;

  doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (!node.isBlock || !types.includes(node.type.name) || seen.has(pos)) {
      return true;
    }

    seen.add(pos);
    nodes.push({ node, pos });
    return false;
  });

  if (nodes.length > 0) {
    return nodes;
  }

  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    const node = selection.$from.node(depth);

    if (!node.isBlock || !types.includes(node.type.name)) {
      continue;
    }

    nodes.push({
      node,
      pos: selection.$from.before(depth),
    });
    break;
  }

  return nodes;
}

export const TextAlign = Extension.create<TextAlignOptions>({
  name: "textAlign",

  addOptions() {
    return {
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) =>
              element.style.textAlign || element.getAttribute("data-text-align")
              || this.options.defaultAlignment,
            renderHTML: (attributes): Record<string, string> => {
              const alignment = attributes.textAlign;

              if (!alignment || alignment === this.options.defaultAlignment) {
                return {};
              }

              return {
                style: `text-align: ${alignment}`,
                "data-text-align": String(alignment),
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: string) =>
        ({ tr, dispatch }) => {
          if (!this.options.alignments.includes(alignment)) {
            return false;
          }

          const targets = getTargetNodes(this.editor, this.options.types);

          if (!targets.length) {
            return false;
          }

          if (!dispatch) {
            return true;
          }

          targets.forEach(({ node, pos }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              textAlign: alignment,
            });
          });

          dispatch(tr);
          return true;
        },
      unsetTextAlign:
        () =>
        ({ tr, dispatch }) => {
          const targets = getTargetNodes(this.editor, this.options.types);

          if (!targets.length) {
            return false;
          }

          if (!dispatch) {
            return true;
          }

          targets.forEach(({ node, pos }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              textAlign: this.options.defaultAlignment,
            });
          });

          dispatch(tr);
          return true;
        },
    };
  },
});
