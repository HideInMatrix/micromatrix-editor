import type { Editor } from "@tiptap/vue-3";

// 统一的编辑器响应式引用类型
export type WritingStudioEditorRef = {
  readonly value: Editor | null | undefined;
};
