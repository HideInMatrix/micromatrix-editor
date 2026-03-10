import { useEditor as createEditor } from "@tiptap/vue-3";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import { useWritingStudioExtensions } from "../extensions/useExtensions";
import { useWritingStudioMathEditor } from "../math/useMathEditor";

// 创建写作工作台编辑器实例
export const useWritingStudioEditor = () => {
  // 聚合所有扩展配置
  const extensions = useWritingStudioExtensions();
  const { registerMathEditor } = useWritingStudioMathEditor();

  const editor = createEditor({
    content: "## 测试标题",
    extensions: [...extensions],
    contentType: "markdown",
    onCreate: ({ editor: currentEditor }) => {
      registerMathEditor(currentEditor);
      migrateMathStrings(currentEditor);
    },
    onDestroy: () => {
      registerMathEditor(null);
    },
  });

  return { editor };
};
