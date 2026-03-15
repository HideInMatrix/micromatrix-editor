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

export const OrderedList = Node.create({
  name: "orderedList",

  group: "block",
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
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          return wrapInList(type)(state, dispatch);
        },
      toggleOrderedList:
        () =>
        ({ state, dispatch, commands }) => {
          const itemType = state.schema.nodes.listItem;

          if (!itemType) {
            return false;
          }

          if (isInNodeType(state, this.name)) {
            return liftListItem(itemType)(state, dispatch);
          }

          return commands.setOrderedList();
        },
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
