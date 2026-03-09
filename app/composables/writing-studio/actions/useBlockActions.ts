import type { WritingStudioEditorRef } from "../types/editor";

// 段落与块级节点相关操作
export const useWritingStudioBlockActions = (editor: WritingStudioEditorRef) => {
  // 切换为普通段落
  const setParagraph = () => {
    editor.value?.chain().focus().setParagraph().run();
  };

  // 切换指定级别标题
  const toggleHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    editor.value?.chain().focus().toggleHeading({ level }).run();
  };

  // 切换引用块
  const toggleBlockquote = () => {
    editor.value?.chain().focus().toggleBlockquote().run();
  };

  // 切换代码块
  const toggleCodeBlock = () => {
    editor.value?.chain().focus().toggleCodeBlock().run();
  };

  // 设置代码块语言
  const setCodeBlockLanguage = (language: string) => {
    if (!editor.value || !editor.value.isActive("codeBlock")) {
      return;
    }

    const normalizedLanguage = language.trim() || "plaintext";
    editor.value.chain().focus().updateAttributes("codeBlock", {
      language: normalizedLanguage,
    }).run();
  };

  // 设置代码块是否自动换行
  const setCodeBlockWrap = (wrap: boolean) => {
    if (!editor.value || !editor.value.isActive("codeBlock")) {
      return;
    }

    editor.value.chain().focus().updateAttributes("codeBlock", {
      wrap,
    }).run();
  };

  // 切换 details 折叠块
  const toggleDetails = () => {
    if (!editor.value) {
      return;
    }

    const chain = editor.value.chain().focus();
    if (editor.value.isActive("details")) {
      chain.unsetDetails().run();
      return;
    }

    chain.setDetails().run();
  };

  // 插入硬换行
  const setHardBreak = () => {
    editor.value?.chain().focus().setHardBreak().run();
  };

  // 插入分割线
  const setHorizontalRule = () => {
    editor.value?.chain().focus().setHorizontalRule().run();
  };

  return {
    setParagraph,
    toggleHeading,
    toggleBlockquote,
    toggleCodeBlock,
    setCodeBlockLanguage,
    setCodeBlockWrap,
    toggleDetails,
    setHardBreak,
    setHorizontalRule,
  };
};
