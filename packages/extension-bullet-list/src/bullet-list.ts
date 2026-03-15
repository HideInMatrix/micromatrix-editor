import { Node } from "@mxm-editor/core";
import {
  liftListItem,
  type EditorState,
  wrapInList,
  wrappingInputRule,
} from "@mxm-editor/pm";

function isInNodeType(state: EditorState, nodeName: string) {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeName) {
      return true;
    }
  }

  return false;
}

export const BulletList = Node.create({
  name: "bulletList",

  group: "block",
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
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          return wrapInList(type)(state, dispatch);
        },
      toggleBulletList:
        () =>
        ({ state, dispatch, commands }) => {
          const itemType = state.schema.nodes.listItem;

          if (!itemType) {
            return false;
          }

          if (isInNodeType(state, this.name)) {
            return liftListItem(itemType)(state, dispatch);
          }

          return commands.setBulletList();
        },
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
