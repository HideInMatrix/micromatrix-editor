import type { Editor } from "@tiptap/vue-3";
import type { WritingStudioEditorRef } from "../types/editor";
import { cn } from "@/lib/utils";

// 提供工具栏渲染与状态判断方法
export const useWritingStudioToolbarState = (editor: WritingStudioEditorRef) => {
  // 生成工具栏按钮样式
  const toolbarButtonClass = (active: boolean) =>
    cn(
      "h-8 px-2 text-xs",
      active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
    );

  // 生成下拉菜单项样式
  const dropdownItemClass = (active = false) =>
    cn(active && "bg-accent text-accent-foreground");

  // 判断 mark 是否激活
  const isMarkActive = (mark: string) => editor.value?.isActive(mark) ?? false;
  // 判断 node 是否激活（可带属性）
  const isNodeActive = (node: string, attrs?: Record<string, unknown>) =>
    editor.value?.isActive(node, attrs) ?? false;

  // 安全执行可用性检查
  const canRun = (checker: (current: Editor) => boolean) =>
    editor.value ? checker(editor.value) : false;

  return {
    toolbarButtonClass,
    dropdownItemClass,
    isMarkActive,
    isNodeActive,
    canRun,
  };
};
