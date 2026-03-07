import { useEditor as createEditor } from "@tiptap/vue-3";
import { useWritingStudioExtensions } from "../extensions/useExtensions";

export const useWritingStudioEditor = () => {
  const extensions = useWritingStudioExtensions();

  const editor = createEditor({
    content: "## 测试标题",
    extensions: [...extensions],
    contentType: "markdown",
  });

  return { editor };
};
