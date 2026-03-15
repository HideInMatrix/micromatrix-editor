import type { CommandProps } from "@mxm-editor/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface CodeOptions {
  HTMLAttributes: Record<string, string>;
}

const codeInputRegex = /(?:^|[^`])`([^`]+)`$/;
const codePasteRegex = /`([^`]+)`/g;

export const Code = Mark.create<CodeOptions>({
  name: "code",

  code: true,
  excludes: "_",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "code" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["code", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ children }) {
    return `\`${children}\``;
  },

  addCommands() {
    return {
      setCode:
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
      toggleCode:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetCode:
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
      "Mod-e": () => this.editor.commands.toggleCode(),
    };
  },

  addInputRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type) {
      return [];
    }

    return [
      markInputRule({
        find: codeInputRegex,
        type,
      }),
    ];
  },

  addPasteRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type) {
      return [];
    }

    return [
      markPasteRule({
        find: codePasteRegex,
        type,
      }),
    ];
  },
});
