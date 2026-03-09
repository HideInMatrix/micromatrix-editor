import type { WritingStudioEditorRef } from "../types/editor";

// 列表相关操作
export const useWritingStudioListActions = (editor: WritingStudioEditorRef) => {
  // 切换无序列表
  const toggleBulletList = () => {
    editor.value?.chain().focus().toggleBulletList().run();
  };

  // 切换有序列表
  const toggleOrderedList = () => {
    editor.value?.chain().focus().toggleOrderedList().run();
  };

  // 切换任务列表
  const toggleTaskList = () => {
    editor.value?.chain().focus().toggleTaskList().run();
  };

  return {
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
  };
};
