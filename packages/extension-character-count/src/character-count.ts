import { Extension } from "@mxm-editor/core";
import {
  Plugin,
  type Node as ProseMirrorNode,
} from "@mxm-editor/pm";

export type CharacterCountMode = "textSize" | "nodeSize";

export interface CharacterCountOptions {
  limit: number | null;
  mode: CharacterCountMode;
  textCounter: (text: string) => number;
  wordCounter: (text: string) => number;
}

export interface CharacterCountStorage {
  characters: (options?: {
    node?: ProseMirrorNode;
    mode?: CharacterCountMode;
  }) => number;
  words: (options?: {
    node?: ProseMirrorNode;
  }) => number;
}

function getText(node: ProseMirrorNode) {
  return node.textContent;
}

function getCharacterCount(
  node: ProseMirrorNode,
  options: CharacterCountOptions,
  mode = options.mode,
) {
  if (mode === "nodeSize") {
    return node.nodeSize;
  }

  return options.textCounter(getText(node));
}

export const CharacterCount = Extension.create<
  CharacterCountOptions,
  CharacterCountStorage
>({
  name: "characterCount",

  addOptions() {
    return {
      limit: null,
      mode: "textSize",
      textCounter: (text: string) => text.length,
      wordCounter: (text: string) =>
        text
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .length,
    };
  },

  addStorage() {
    return {
      characters: () => 0,
      words: () => 0,
    };
  },

  onCreate() {
    this.storage.characters = ({ node, mode } = {}) => {
      const targetNode = node ?? this.editor.state.doc;
      const countMode = mode ?? this.options.mode;

      return getCharacterCount(targetNode, this.options, countMode);
    };

    this.storage.words = ({ node } = {}) =>
      this.options.wordCounter(getText(node ?? this.editor.state.doc));
  },

  addProseMirrorPlugins() {
    if (this.options.limit === null) {
      return [];
    }

    return [
      new Plugin({
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) {
            return true;
          }

          const currentCount = getCharacterCount(state.doc, this.options);
          const nextCount = getCharacterCount(transaction.doc, this.options);

          return nextCount <= this.options.limit! || nextCount <= currentCount;
        },
      }),
    ];
  },
});
