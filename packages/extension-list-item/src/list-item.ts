import { Node } from "@mxm-editor/core";
import { liftListItem, sinkListItem, splitListItem } from "@mxm-editor/pm";

function formatListItem(prefix: string, children: string) {
  const content = children.trimEnd();

  if (!content.length) {
    return `${prefix}\n`;
  }

  const lines = content.split("\n");

  return [
    `${prefix}${lines[0] ?? ""}`,
    ...lines.slice(1).map((line) => (line.length ? `  ${line}` : "")),
  ].join("\n") + "\n";
}

export const ListItem = Node.create({
  name: "listItem",

  content: "paragraph block*",
  defining: true,

  parseHTML() {
    return [
      {
        tag: "li",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return node.dataset.type === "taskItem"
            || node.querySelector('input[type="checkbox"]')
            ? false
            : null;
        },
      },
    ];
  },

  renderHTML() {
    return ["li", 0];
  },

  renderMarkdown({ children, parent }) {
    const prefix = parent?.type === "orderedList" ? "1. " : "- ";

    return formatListItem(prefix, children);
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
    };
  },
});

export { formatListItem };
