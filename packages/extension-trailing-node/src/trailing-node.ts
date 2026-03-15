import { Extension } from "@mxm-editor/core";
import type { EditorState } from "@mxm-editor/pm";
import { Plugin, PluginKey } from "@mxm-editor/pm";

export interface TrailingNodeOptions {
  node: string;
  notAfter: string[];
}

const trailingNodePluginKey = new PluginKey("trailingNode");

function createTrailingNodeTransaction(
  state: EditorState,
  options: TrailingNodeOptions,
) {
  const nodeType = state.schema.nodes[options.node];
  const lastNode = state.doc.lastChild;

  if (!nodeType || !lastNode) {
    return null;
  }

  if (lastNode.type === nodeType || options.notAfter.includes(lastNode.type.name)) {
    return null;
  }

  const trailingNode = nodeType.createAndFill();

  if (!trailingNode) {
    return null;
  }

  return state.tr
    .insert(state.doc.content.size, trailingNode)
    .setMeta(trailingNodePluginKey, true);
}

export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  addOptions() {
    return {
      node: "paragraph",
      notAfter: ["paragraph"],
    };
  },

  onCreate() {
    const transaction = createTrailingNodeTransaction(this.editor.state, this.options);

    if (!transaction || !this.editor.view) {
      return;
    }

    this.editor.view.dispatch(transaction);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: trailingNodePluginKey,
        appendTransaction: (transactions, _oldState, _newState) => {
          if (transactions.some((transaction) => transaction.getMeta(trailingNodePluginKey))) {
            return null;
          }

          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          return createTrailingNodeTransaction(_newState, this.options);
        },
      }),
    ];
  },
});
