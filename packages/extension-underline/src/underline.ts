import type { CommandProps } from "@mxm-editor/core";
import { Mark, mergeAttributes } from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface UnderlineOptions {
  HTMLAttributes: Record<string, string>;
}

export const Underline = Mark.create<UnderlineOptions>({
  name: "underline",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "u" },
      {
        style: "text-decoration",
        getAttrs: (value: string | object | null) =>
          String(value).includes("underline") ? null : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["u", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ children }) {
    return children;
  },

  addCommands() {
    return {
      setUnderline:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          const { empty, from, to } = state.selection;

          if (!dispatch) {
            return true;
          }

          if (empty) {
            dispatch(state.tr.addStoredMark(markType.create()));
            return true;
          }

          dispatch(state.tr.addMark(from, to, markType.create()));
          return true;
        },
      toggleUnderline:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetUnderline:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          const { empty, from, to } = state.selection;

          if (!dispatch) {
            return true;
          }

          if (empty) {
            dispatch(state.tr.removeStoredMark(markType));
            return true;
          }

          dispatch(state.tr.removeMark(from, to, markType));
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleUnderline(),
    };
  },
});
