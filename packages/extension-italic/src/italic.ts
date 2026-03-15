import type { CommandProps } from "@mxm-editor/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface ItalicOptions {
  HTMLAttributes: Record<string, string>;
}

const starInputRegex = /(?<!\*)\*([^*]+)\*$/;
const starPasteRegex = /(?<!\*)\*([^*]+)\*/g;

export const Italic = Mark.create<ItalicOptions>({
  name: "italic",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "em" },
      { tag: "i" },
      {
        style: "font-style",
        getAttrs: (value: string | object | null) =>
          String(value) === "italic" ? null : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["em", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ children }) {
    return `*${children}*`;
  },

  addCommands() {
    return {
      setItalic:
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
      toggleItalic:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetItalic:
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
      "Mod-i": () => this.editor.commands.toggleItalic(),
    };
  },

  addInputRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type) {
      return [];
    }

    return [
      markInputRule({
        find: starInputRegex,
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
        find: starPasteRegex,
        type,
      }),
    ];
  },
});
