import type { CommandProps } from "@mxm-editor/core";
import { Mark, mergeAttributes } from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface SuperscriptOptions {
  HTMLAttributes: Record<string, string>;
}

function setSuperscriptMark({
  state,
  dispatch,
}: Pick<CommandProps, "state" | "dispatch">, name: string) {
  const markType = state.schema.marks[name];

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
}

function unsetSuperscriptMark({
  state,
  dispatch,
}: Pick<CommandProps, "state" | "dispatch">, name: string) {
  const markType = state.schema.marks[name];

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
}

export const Superscript = Mark.create<SuperscriptOptions>({
  name: "superscript",

  excludes: "subscript",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: "sup" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  renderMarkdown({ children }) {
    return `<sup>${children}</sup>`;
  },

  addCommands() {
    return {
      setSuperscript:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          setSuperscriptMark(props, this.name),
      toggleSuperscript:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetSuperscript:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          unsetSuperscriptMark(props, this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-.": () => this.editor.commands.toggleSuperscript(),
    };
  },
});
