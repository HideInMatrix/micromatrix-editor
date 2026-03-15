import type { CommandProps } from "@mxm-editor/core";
import {
  Mark,
  markInputRule,
  markPasteRule,
  mergeAttributes,
} from "@mxm-editor/core";
import { toggleMark } from "@mxm-editor/pm";

export interface BoldOptions {
  HTMLAttributes: Record<string, string>;
}

const starInputRegex = /(?<!\*)\*\*([^*]+)\*\*$/;
const starPasteRegex = /(?<!\*)\*\*([^*]+)\*\*/g;

export const Bold = Mark.create<BoldOptions>({
  name: "bold",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "strong" },
      { tag: "b" },
      {
        style: "font-weight",
        getAttrs: (value: string | object | null) =>
          /^(bold(er)?|[5-9]\d{2,})$/.test(String(value)) ? null : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return ["strong", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  renderMarkdown({ children }) {
    return `**${children}**`;
  },

  addCommands() {
    return {
      setBold:
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
      toggleBold:
        () =>
        ({ state, dispatch }: Pick<CommandProps, "state" | "dispatch">) => {
          const markType = this.editor.schema.marks[this.name];

          if (!markType) {
            return false;
          }

          return toggleMark(markType)(state, dispatch);
        },
      unsetBold:
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
      "Mod-b": () => this.editor.commands.toggleBold(),
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
