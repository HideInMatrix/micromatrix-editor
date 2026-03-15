import type { CommandProps } from "@mxm-editor/core";
import { Mark, mergeAttributes } from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface SubscriptOptions {
  HTMLAttributes: Record<string, string>;
}

function setSubscriptMark({
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

function unsetSubscriptMark({
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

export const Subscript = Mark.create<SubscriptOptions>({
  name: "subscript",

  excludes: "superscript",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: "sub" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "sub",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  renderMarkdown({ children }) {
    return `<sub>${children}</sub>`;
  },

  addCommands() {
    return {
      setSubscript:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          setSubscriptMark(props, this.name),
      toggleSubscript:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetSubscript:
        () =>
        (props: Pick<CommandProps, "state" | "dispatch">) =>
          unsetSubscriptMark(props, this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-,": () => this.editor.commands.toggleSubscript(),
    };
  },
});
