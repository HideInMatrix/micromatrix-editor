import {
  Plugin,
  PluginKey,
  Selection,
} from "@mxm-editor/pm";
import { CommandManager } from "../CommandManager";
import { Extension } from "../Extension";
import { createChainableState } from "../helpers/createChainableState";
import { isNodeEmpty } from "../helpers/isNodeEmpty";
import {
  isMacOS,
  isiOS,
} from "../utilities";

export const Keymap = Extension.create({
  name: "keymap",

  addKeyboardShortcuts() {
    const handleBackspace = () =>
      this.editor.commands.first([
        ({ commands }) => commands.undoInputRule(),
        ({ commands }) =>
          commands.command(({ tr }) => {
            const { selection, doc } = tr;
            const { empty, $anchor } = selection;
            const { pos, parent } = $anchor;
            const $parentPos =
              $anchor.parent.isTextblock && pos > 0
                ? tr.doc.resolve(pos - 1)
                : $anchor;
            const parentIsIsolating = $parentPos.parent.type.spec.isolating;
            const parentPos = $anchor.pos - $anchor.parentOffset;
            const isAtStart =
              parentIsIsolating && $parentPos.parent.childCount === 1
                ? parentPos === $anchor.pos
                : Selection.atStart(doc).from === pos;

            if (
              !empty
              || !parent.type.isTextblock
              || parent.textContent.length
              || !isAtStart
              || (isAtStart && $anchor.parent.type.name === "paragraph")
            ) {
              return false;
            }

            return commands.clearNodes();
          }),
        ({ commands }) => commands.deleteSelection(),
        ({ commands }) => commands.joinBackward(),
        ({ commands }) => commands.selectNodeBackward(),
      ]);
    const handleDelete = () =>
      this.editor.commands.first([
        ({ commands }) => commands.deleteSelection(),
        ({ commands }) => commands.deleteCurrentNode(),
        ({ commands }) => commands.joinForward(),
        ({ commands }) => commands.selectNodeForward(),
      ]);
    const handleEnter = () =>
      this.editor.commands.first([
        ({ commands }) => commands.newlineInCode(),
        ({ commands }) => commands.createParagraphNear(),
        ({ commands }) => commands.liftEmptyBlock(),
        ({ commands }) => commands.splitBlock(),
      ]);
    const baseKeymap = {
      Enter: handleEnter,
      "Mod-Enter": () => this.editor.commands.exitCode(),
      Backspace: handleBackspace,
      "Mod-Backspace": handleBackspace,
      "Shift-Backspace": handleBackspace,
      Delete: handleDelete,
      "Mod-Delete": handleDelete,
      "Mod-a": () => this.editor.commands.selectAll(),
    };

    if (isiOS() || isMacOS()) {
      return {
        ...baseKeymap,
        "Ctrl-h": handleBackspace,
        "Alt-Backspace": handleBackspace,
        "Ctrl-d": handleDelete,
        "Ctrl-Alt-Backspace": handleDelete,
        "Alt-Delete": handleDelete,
        "Alt-d": handleDelete,
        "Ctrl-a": () => this.editor.commands.selectTextblockStart(),
        "Ctrl-e": () => this.editor.commands.selectTextblockEnd(),
      };
    }

    return baseKeymap;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("clearDocument"),
        appendTransaction: (transactions, oldState, newState) => {
          if (transactions.some((transaction) => transaction.getMeta("composition"))) {
            return undefined;
          }

          const docChanges =
            transactions.some((transaction) => transaction.docChanged)
            && !oldState.doc.eq(newState.doc);
          const ignoreTransaction = transactions.some((transaction) =>
            transaction.getMeta("preventClearDocument"),
          );

          if (!docChanges || ignoreTransaction) {
            return undefined;
          }

          const {
            empty,
            from,
            to,
          } = oldState.selection;
          const allFrom = Selection.atStart(oldState.doc).from;
          const allTo = Selection.atEnd(oldState.doc).to;
          const allWasSelected = from === allFrom && to === allTo;

          if (empty || !allWasSelected || !isNodeEmpty(newState.doc)) {
            return undefined;
          }

          const tr = newState.tr;
          const state = createChainableState({
            state: newState,
            transaction: tr,
          });
          const { commands } = new CommandManager({
            editor: this.editor,
            state,
          });

          commands.clearNodes();

          return tr.steps.length ? tr : undefined;
        },
      }),
    ];
  },
});
