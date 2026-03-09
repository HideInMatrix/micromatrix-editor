import { useEditor as createEditor } from "@tiptap/vue-3";
import { useWritingStudioExtensions } from "../extensions/useExtensions";

// 创建写作工作台编辑器实例
export const useWritingStudioEditor = () => {
  // 聚合所有扩展配置
  const extensions = useWritingStudioExtensions();

  const editor = createEditor({
    content: "## 测试标题",
    extensions: [...extensions],
    contentType: "markdown",
  });

  return { editor };
};
