import { useEditor } from "@tiptap/vue-3";
import { useTipTapEditorPlugins } from "./extensions/useTipTapExtensions";


export const useTipTapEditor = () => {
    const extensions = useTipTapEditorPlugins();

    const editor = useEditor({
        content: `## 测试标题`,
        extensions: [...extensions],
        contentType: 'markdown',
    });

    return { editor }
}