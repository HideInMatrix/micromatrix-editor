import type { WritingStudioEditorRef } from "./useWritingStudioActionTypes";

export const useWritingStudioBlockActions = (editor: WritingStudioEditorRef) => {
  const setParagraph = () => {
    editor.value?.chain().focus().setParagraph().run();
  };

  const toggleHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    editor.value?.chain().focus().toggleHeading({ level }).run();
  };

  const toggleBlockquote = () => {
    editor.value?.chain().focus().toggleBlockquote().run();
  };

  const toggleCodeBlock = () => {
    editor.value?.chain().focus().toggleCodeBlock().run();
  };

  const toggleDetails = () => {
    if (!editor.value) {
      return;
    }

    const chain = editor.value.chain().focus();
    if (editor.value.isActive("details")) {
      chain.unsetDetails().run();
      return;
    }

    chain.setDetails().run();
  };

  const setHardBreak = () => {
    editor.value?.chain().focus().setHardBreak().run();
  };

  const setHorizontalRule = () => {
    editor.value?.chain().focus().setHorizontalRule().run();
  };

  return {
    setParagraph,
    toggleHeading,
    toggleBlockquote,
    toggleCodeBlock,
    toggleDetails,
    setHardBreak,
    setHorizontalRule,
  };
};
