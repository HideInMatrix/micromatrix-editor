import { Node } from "@mxm-editor/core";
import {
  Plugin,
  PluginKey,
  liftListItem,
  sinkListItem,
  splitListItem,
  type EditorState,
} from "@mxm-editor/pm";
import { formatListItem } from "@mxm-editor/extension-list-item";

function findTaskItemAtPosition(
  state: EditorState,
  pos: number,
  nodeName: string,
) {
  const safePos = Math.max(0, Math.min(pos, state.doc.content.size));
  const $from = state.doc.resolve(safePos);

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const currentNode = $from.node(depth);

    if (currentNode.type.name !== nodeName) {
      continue;
    }

    return {
      node: currentNode,
      pos: $from.before(depth),
    };
  }

  return null;
}

function toggleTaskItemAtPosition(
  state: EditorState,
  dispatch: ((tr: EditorState["tr"]) => void) | undefined,
  pos: number,
  nodeName: string,
) {
  const match = findTaskItemAtPosition(state, pos, nodeName);

  if (!match) {
    return false;
  }

  if (!dispatch) {
    return true;
  }

  dispatch(
    state.tr.setNodeMarkup(match.pos, undefined, {
      ...match.node.attrs,
      checked: !match.node.attrs.checked,
    }),
  );

  return true;
}

function getTaskItemToggleTarget(target: EventTarget | null, root: HTMLElement) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const checkbox = target.closest('input[type="checkbox"], label');

  if (!checkbox || !root.contains(checkbox)) {
    return null;
  }

  const taskItem = checkbox.closest('li[data-type="taskItem"]');

  if (!(taskItem instanceof HTMLElement)) {
    return null;
  }

  return taskItem;
}

export const TaskItem = Node.create({
  name: "taskItem",

  content: "paragraph block*",
  defining: true,

  addAttributes() {
    return {
      checked: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "li",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          if (node.dataset.type === "taskItem") {
            return {
              checked: node.dataset.checked === "true",
            };
          }

          const input = node.querySelector('input[type="checkbox"]');

          if (!input) {
            return false;
          }

          return {
            checked: input.hasAttribute("checked"),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const checked = Boolean(node.attrs.checked);

    return [
      "li",
      {
        "data-type": "taskItem",
        "data-checked": checked ? "true" : "false",
      },
      [
        "label",
        {
          contenteditable: "false",
        },
        [
          "input",
          {
            type: "checkbox",
            ...(checked ? { checked: "checked" } : {}),
          },
        ],
      ],
      ["div", 0],
    ];
  },

  renderMarkdown({ node, children }) {
    return formatListItem(
      node.attrs?.checked ? "- [x] " : "- [ ] ",
      children,
    );
  },

  addCommands() {
    return {
      toggleTaskItemChecked:
        () =>
        ({ state, dispatch }) => {
          return toggleTaskItemAtPosition(
            state,
            dispatch,
            state.selection.from,
            this.name,
          );
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const type = this.editor.schema.nodes[this.name];

        return type ? splitListItem(type)(this.editor.state, this.editor.view?.dispatch) : false;
      },
      Tab: () => {
        const type = this.editor.schema.nodes[this.name];

        return type ? sinkListItem(type)(this.editor.state, this.editor.view?.dispatch) : false;
      },
      "Shift-Tab": () => {
        const type = this.editor.schema.nodes[this.name];

        return type ? liftListItem(type)(this.editor.state, this.editor.view?.dispatch) : false;
      },
      "Mod-Shift-x": () => this.editor.commands.toggleTaskItemChecked(),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("taskItemClick"),
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (!this.editor.isEditable) {
                return false;
              }

              const taskItem = getTaskItemToggleTarget(event.target, view.dom);

              if (!taskItem) {
                return false;
              }

              event.preventDefault();

              return true;
            },
            click: (view, event) => {
              if (!this.editor.isEditable) {
                return false;
              }

              const taskItem = getTaskItemToggleTarget(event.target, view.dom);

              if (!taskItem) {
                return false;
              }

              event.preventDefault();

              return toggleTaskItemAtPosition(
                view.state,
                view.dispatch,
                view.posAtDOM(taskItem, 0),
                this.name,
              );
            },
          },
        },
      }),
    ];
  },
});
