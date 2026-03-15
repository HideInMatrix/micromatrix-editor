import { Extension, type Editor } from "@mxm-editor/core";
import type { Node as ProseMirrorNode } from "@mxm-editor/pm";
import {
  Decoration,
  DecorationSet,
  Plugin,
  PluginKey,
} from "@mxm-editor/pm";

export interface PlaceholderProps {
  editor: Editor;
  node: ProseMirrorNode;
  pos: number;
  hasAnchor: boolean;
}

export interface PlaceholderOptions {
  emptyEditorClass: string;
  emptyNodeClass: string;
  placeholder: string | ((props: PlaceholderProps) => string);
  showOnlyWhenEditable: boolean;
  showOnlyCurrent: boolean;
  includeChildren: boolean;
}

const placeholderPluginKey = new PluginKey("placeholder");

function isSelectionInsideNode(
  selectionFrom: number,
  selectionTo: number,
  pos: number,
  node: ProseMirrorNode,
) {
  const from = pos + 1;
  const to = pos + node.nodeSize - 1;

  return selectionFrom >= from && selectionTo <= to;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: "placeholder",

  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      placeholder: "Write something...",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: placeholderPluginKey,
        props: {
          decorations: (state) => {
            if (this.options.showOnlyWhenEditable && !this.editor.isEditable) {
              return null;
            }

            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (!node.isTextblock || node.content.size > 0) {
                return this.options.includeChildren;
              }

              const hasAnchor = isSelectionInsideNode(
                state.selection.from,
                state.selection.to,
                pos,
                node,
              );

              if (this.options.showOnlyCurrent && !hasAnchor) {
                return this.options.includeChildren;
              }

              const placeholder =
                typeof this.options.placeholder === "function"
                  ? this.options.placeholder({
                      editor: this.editor,
                      node,
                      pos,
                      hasAnchor,
                    })
                  : this.options.placeholder;

              if (!placeholder.length) {
                return this.options.includeChildren;
              }

              const classes = [this.options.emptyNodeClass];

              if (this.editor.isEmpty) {
                classes.push(this.options.emptyEditorClass);
              }

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: classes.join(" "),
                  "data-placeholder": placeholder,
                }),
              );

              return this.options.includeChildren;
            });

            return decorations.length
              ? DecorationSet.create(state.doc, decorations)
              : null;
          },
        },
      }),
    ];
  },
});
