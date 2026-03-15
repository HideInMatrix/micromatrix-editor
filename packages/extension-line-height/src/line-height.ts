import { Extension, type Editor } from "@mxm-editor/core";
import type { Node as ProseMirrorNode } from "@mxm-editor/pm";

export interface LineHeightOptions {
  types: string[];
  defaultLineHeight: string | null;
}

function getStyleValue(element: HTMLElement, property: string) {
  const style = element.getAttribute("style");

  if (style) {
    const declarations = style
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);

    for (let index = declarations.length - 1; index >= 0; index -= 1) {
      const parts = declarations[index].split(":");

      if (parts.length < 2) {
        continue;
      }

      if (parts[0].trim().toLowerCase() === property) {
        return parts.slice(1).join(":").trim().replace(/['"]+/g, "");
      }
    }
  }

  return element.style.getPropertyValue(property).trim().replace(/['"]+/g, "") || null;
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

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["heading", "paragraph"],
      defaultLineHeight: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element: HTMLElement) =>
              getStyleValue(element, "line-height")
              || element.getAttribute("data-line-height")
              || this.options.defaultLineHeight,
            renderHTML: (attributes: Record<string, any>) => {
              const lineHeight = attributes.lineHeight;

              if (!lineHeight || lineHeight === this.options.defaultLineHeight) {
                return {} as Record<string, string>;
              }

              return {
                style: `line-height: ${lineHeight}`,
                "data-line-height": String(lineHeight),
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ tr, dispatch }) => {
          if (!lineHeight.trim()) {
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
              lineHeight,
            });
          });

          dispatch(tr);
          return true;
        },
      unsetLineHeight:
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
              lineHeight: this.options.defaultLineHeight,
            });
          });

          dispatch(tr);
          return true;
        },
    };
  },
});
