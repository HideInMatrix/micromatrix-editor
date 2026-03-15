import { Node } from "@mxm-editor/core";

export const HardBreak = Node.create({
  name: "hardBreak",

  inline: true,
  group: "inline",
  selectable: false,

  parseHTML() {
    return [
      {
        tag: "br",
      },
    ];
  },

  renderHTML() {
    return ["br"];
  },

  renderMarkdown() {
    return "  \n";
  },

  addCommands() {
    return {
      setHardBreak:
        () =>
        ({ commands }) =>
          commands.insertContent("<br>"),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Shift-Enter": () => this.editor.commands.setHardBreak(),
    };
  },
});
