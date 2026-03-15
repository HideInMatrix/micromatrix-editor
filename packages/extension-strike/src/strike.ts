import type { CommandProps } from "@mxm-editor/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface StrikeOptions {
  HTMLAttributes: Record<string, string>;
}

const strikeInputRegex = /~~([^~]+)~~$/;
const strikePasteRegex = /~~([^~]+)~~/g;

export const Strike = Mark.create<StrikeOptions>({
  name: "strike",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "s" },
      { tag: "del" },
      { tag: "strike" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["s", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ children }) {
    return `~~${children}~~`;
  },

  addCommands() {
    return {
      setStrike:
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
      toggleStrike:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetStrike:
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
      "Mod-Shift-s": () => this.editor.commands.toggleStrike(),
    };
  },

  addInputRules() {
    const type = this.editor.schema.marks[this.name];

    if (!type) {
      return [];
    }

    return [
      markInputRule({
        find: strikeInputRegex,
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
        find: strikePasteRegex,
        type,
      }),
    ];
  },
});
