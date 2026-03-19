import { Node } from "@mxm-editor/core";
import {
  wrappingInputRule,
} from "@mxm-editor/pm";

export const OrderedList = Node.create({
  name: "orderedList",

  group: "block list",
  content: "listItem+",

  addAttributes() {
    return {
      order: {
        default: 1,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "ol",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return {
            order: Number(node.getAttribute("start") ?? 1),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const order = Number(node.attrs.order ?? 1);

    return [
      "ol",
      order === 1 ? {} : { start: String(order) },
      0,
    ];
  },

  renderMarkdown({ children }) {
    return `${children}\n`;
  },

  addCommands() {
    return {
      setOrderedList:
        () =>
        ({ commands }) =>
          commands.wrapInList(this.name),
      toggleOrderedList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, "listItem"),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-7": () => this.editor.commands.toggleOrderedList(),
    };
  },

  addInputRules() {
    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      wrappingInputRule(
        /^(\d+)\.\s$/,
        type,
        (match) => ({
          order: Number(match[1]),
        }),
      ),
    ];
  },
});
