import { Node } from "@mxm-editor/core";
import { lift, wrapIn, wrappingInputRule } from "@mxm-editor/pm";

export const Blockquote = Node.create({
  name: "blockquote",

  group: "block",
  content: "block+",

  parseHTML() {
    return [{ tag: "blockquote" }];
  },

  renderHTML() {
    return ["blockquote", 0];
  },

  renderMarkdown({ children }) {
    const body = children.trim();

    if (!body.length) {
      return "> \n\n";
    }

    return `${body
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n")}\n\n`;
  },

  addCommands() {
    return {
      setBlockquote:
        () =>
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          return wrapIn(type)(state, dispatch);
        },
      unsetBlockquote:
        () =>
        ({ state, dispatch }) =>
          lift(state, dispatch),
      toggleBlockquote:
        () =>
        ({ state, commands }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          if (state.selection.$from.parent.type === type) {
            return commands.unsetBlockquote();
          }

          return commands.setBlockquote();
        },
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      wrappingInputRule(/^\s*>\s$/, type),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": () => this.editor.commands.toggleBlockquote(),
    };
  },
});
