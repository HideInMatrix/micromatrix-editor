import { Node } from "@mxm-editor/core";
import {
  wrappingInputRule,
} from "@mxm-editor/pm";

export const BulletList = Node.create({
  name: "bulletList",

  group: "block list",
  content: "listItem+",

  parseHTML() {
    return [
      {
        tag: "ul",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return node.dataset.type === "taskList"
            || node.querySelector('input[type="checkbox"]')
            ? false
            : null;
        },
      },
    ];
  },

  renderHTML() {
    return ["ul", 0];
  },

  renderMarkdown({ children }) {
    return `${children}\n`;
  },

  addCommands() {
    return {
      setBulletList:
        () =>
        ({ commands }) =>
          commands.wrapInList(this.name),
      toggleBulletList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, "listItem"),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor.commands.toggleBulletList(),
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      wrappingInputRule(/^\s*([-+*])\s$/, type),
    ];
  },
});
