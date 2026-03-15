import { createContext } from "react";
import type { Editor } from "@mxm-editor/core";

export interface CurrentEditorContextValue {
  editor: Editor | null;
}

export const EditorContext = createContext<CurrentEditorContextValue>({
  editor: null,
});
