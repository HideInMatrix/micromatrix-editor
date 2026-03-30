import type { Editor } from "@mxm-editor/core";
import { useEditorState } from "@mxm-editor/react";

function getWordCount(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

export function useContentStats(editor?: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const characters = currentEditor?.state.doc.textContent.length ?? 0;
      const text = currentEditor?.getText({
        blockSeparator: " ",
      }) ?? "";

      return {
        characters,
        words: getWordCount(text),
      };
    },
  });
}
