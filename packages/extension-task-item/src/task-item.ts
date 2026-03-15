import { Node } from "@mxm-editor/core";
import { liftListItem, sinkListItem, splitListItem } from "@mxm-editor/pm";
import { formatListItem } from "@mxm-editor/extension-list-item";

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
            disabled: "disabled",
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
          const { $from } = state.selection;

          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const currentNode = $from.node(depth);

            if (currentNode.type.name !== this.name) {
              continue;
            }

            if (!dispatch) {
              return true;
            }

            dispatch(
              state.tr.setNodeMarkup($from.before(depth), undefined, {
                ...currentNode.attrs,
                checked: !currentNode.attrs.checked,
              }),
            );

            return true;
          }

          return false;
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
});
