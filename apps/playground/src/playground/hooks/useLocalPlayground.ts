import type { Editor } from "@mxm-editor/core";
import { useEditor } from "@mxm-editor/react";
import {
  initialContent,
  sampleImageUrl,
} from "../constants";
import { localExtensions } from "../extensions";

export interface LocalPlaygroundController {
  editor: Editor;
  insertImage: () => void;
  resetTemplate: () => void;
  setLink: () => void;
}

export function useLocalPlayground(): LocalPlaygroundController {
  const editor = useEditor({
    extensions: localExtensions,
    autofocus: true,
    content: initialContent,
  });

  const setLink = () => {
    const previousHref = String(editor.getAttributes("link").href ?? "");
    const href = window.prompt("输入链接地址", previousHref || "https://");

    if (href === null) {
      return;
    }

    if (!href.trim()) {
      editor.commands.unsetLink();
      return;
    }

    editor.commands.setLink({
      href,
    });
  };

  const insertImage = () => {
    const src = window.prompt("输入图片地址", sampleImageUrl);

    if (!src) {
      return;
    }

    const alt = window.prompt("输入 alt 文本", "mxm-editor preview");

    editor.commands.setImage({
      src,
      alt: alt || "",
      title: alt || "",
    });
  };

  const resetTemplate = () => {
    editor.setContent(initialContent);
  };

  return {
    editor,
    insertImage,
    resetTemplate,
    setLink,
  };
}
