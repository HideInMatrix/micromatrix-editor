import { Node, mergeAttributes } from "@mxm-editor/core";
import {
  wrappingInputRule,
} from "@mxm-editor/pm";

export const TaskList = Node.create({
  name: "taskList",

  group: "block list",
  content: "taskItem+",

  parseHTML() {
    return [
      {
        tag: "ul",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          if (node.dataset.type === "taskList") {
            return null;
          }

          return node.querySelector('input[type="checkbox"]') ? null : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, {
        "data-type": "taskList",
      }),
      0,
    ];
  },

  renderMarkdown({ children }) {
    return `${children}\n`;
  },

  addCommands() {
    return {
      setTaskList:
        () =>
        ({ commands }) =>
          commands.wrapInList(this.name),
      toggleTaskList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, "taskItem"),
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      wrappingInputRule(/^\s*-\s\[( |x|X)\]\s$/, type),
    ];
  },
});
