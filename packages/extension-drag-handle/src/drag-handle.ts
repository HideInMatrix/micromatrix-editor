import type { ComputePositionConfig, VirtualElement } from "@floating-ui/dom";
import { Extension } from "@mxm-editor/core";
import type { Editor } from "@mxm-editor/core";
import type { Node as ProseMirrorNode } from "@mxm-editor/pm";
import {
  DragHandlePlugin,
  type NestedOptions,
  normalizeNestedOptions,
} from "./drag-handle-plugin";

export interface DragHandleOptions {
  render: () => HTMLElement;
  computePositionConfig?: ComputePositionConfig;
  getReferencedVirtualElement?: () => VirtualElement | null;
  locked?: boolean;
  onNodeChange?: (options: {
    node: ProseMirrorNode | null;
    editor: Editor;
  }) => void;
  onElementDragStart?: (e: DragEvent) => void;
  onElementDragEnd?: (e: DragEvent) => void;
  nested?: boolean | NestedOptions;
}

export const defaultComputePositionConfig: ComputePositionConfig = {
  placement: "left-start",
  strategy: "absolute",
};

export const DragHandle = Extension.create<DragHandleOptions>({
  name: "dragHandle",

  addOptions() {
    return {
      render() {
        const element = document.createElement("div");

        element.classList.add("drag-handle");
        return element;
      },
      computePositionConfig: {},
      getReferencedVirtualElement: undefined,
      locked: false,
      onNodeChange: () => undefined,
      onElementDragStart: undefined,
      onElementDragEnd: undefined,
      nested: false,
    };
  },

  addCommands() {
    return {
      lockDragHandle:
        () =>
        ({ commands }) => {
          this.options.locked = true;
          return commands.setMeta("lockDragHandle", true);
        },
      unlockDragHandle:
        () =>
        ({ commands }) => {
          this.options.locked = false;
          return commands.setMeta("lockDragHandle", false);
        },
      toggleDragHandle:
        () =>
        ({ commands }) => {
          this.options.locked = !this.options.locked;
          return commands.setMeta("lockDragHandle", this.options.locked);
        },
    };
  },

  addProseMirrorPlugins() {
    const element = this.options.render();

    return [
      DragHandlePlugin({
        computePositionConfig: {
          ...defaultComputePositionConfig,
          ...this.options.computePositionConfig,
        },
        editor: this.editor,
        element,
        getReferencedVirtualElement: this.options.getReferencedVirtualElement,
        initialLocked: this.options.locked ?? false,
        nestedOptions: normalizeNestedOptions(this.options.nested),
        onElementDragEnd: this.options.onElementDragEnd,
        onElementDragStart: this.options.onElementDragStart,
        onNodeChange: ({ editor, node, pos: _pos }) => {
          this.options.onNodeChange?.({
            editor,
            node,
          });
        },
      }).plugin,
    ];
  },
});
