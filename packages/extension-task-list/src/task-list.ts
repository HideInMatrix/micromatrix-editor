import { Node, mergeAttributes } from "@mxm-editor/core";
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

export const TaskList = Node.create({
  name: "taskList",

  group: "block",
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
        ({ state, dispatch }) => {
          const type = state.schema.nodes[this.name];

          if (!type) {
            return false;
          }

          return wrapInList(type)(state, dispatch);
        },
      toggleTaskList:
        () =>
        ({ state, dispatch, commands }) => {
          const itemType = state.schema.nodes.taskItem;

          if (!itemType) {
            return false;
          }

          if (isInNodeType(state, this.name)) {
            return liftListItem(itemType)(state, dispatch);
          }

          return commands.setTaskList();
        },
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
