import type { Editor } from "@tiptap/vue-3";
import type { ShallowRef } from "vue";
import { cn } from "@/lib/utils";

type WritingStudioEditorRef = ShallowRef<Editor | undefined>;

export const useWritingStudioToolbarState = (editor: WritingStudioEditorRef) => {
  const toolbarButtonClass = (active: boolean) =>
    cn(
      "h-8 px-2 text-xs",
      active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
    );

  const dropdownItemClass = (active = false) =>
    cn(active && "bg-accent text-accent-foreground");

  const isMarkActive = (mark: string) => editor.value?.isActive(mark) ?? false;
  const isNodeActive = (node: string, attrs?: Record<string, unknown>) =>
    editor.value?.isActive(node, attrs) ?? false;

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
