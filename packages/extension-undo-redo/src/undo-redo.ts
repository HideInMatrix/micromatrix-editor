import type { CommandProps } from "@mxm-editor/core";
import { Extension } from "@mxm-editor/core";
import { baseKeymap, history, keymap, redo, undo } from "@mxm-editor/pm";

export interface UndoRedoOptions {
  depth: number;
  newGroupDelay: number;
}

export const UndoRedo = Extension.create<UndoRedoOptions>({
  name: "undoRedo",

  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500,
    };
  },

  addCommands() {
    return {
      undo:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) =>
          undo(state, dispatch),
      redo:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) =>
          redo(state, dispatch),
    };
  },

  addProseMirrorPlugins() {
    return [
      history({
        depth: this.options.depth,
        newGroupDelay: this.options.newGroupDelay,
      }),
      keymap(baseKeymap),
    ];
  },
});
