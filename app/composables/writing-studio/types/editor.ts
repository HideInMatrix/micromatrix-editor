import type { Editor } from "@tiptap/vue-3";
import type { ShallowRef } from "vue";

// 统一的编辑器响应式引用类型
export type WritingStudioEditorRef = ShallowRef<Editor | undefined>;
