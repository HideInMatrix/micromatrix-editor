import { Editor, type EditorOptions } from "@mxm-editor/core";
import { useEffect, useState } from "react";

export function useEditor(options: EditorOptions) {
  const [editor] = useState(() => new Editor({ ...options, element: null }));

  useEffect(() => {
    return () => {
      editor.destroy();
    };
  }, [editor]);

  return editor;
}
