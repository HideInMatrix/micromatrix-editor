import type { WritingStudioEditorRef } from "../types/editor";

export const useWritingStudioListActions = (editor: WritingStudioEditorRef) => {
  const toggleBulletList = () => {
    editor.value?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor.value?.chain().focus().toggleOrderedList().run();
  };

  const toggleTaskList = () => {
    editor.value?.chain().focus().toggleTaskList().run();
  };

  return {
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
  };
};
